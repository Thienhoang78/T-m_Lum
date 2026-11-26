"""Cắt tấm sticker A4 (nền trắng) thành từng sticker nền trong suốt, xuất ảnh cho web và danh mục bộ sticker.

Chạy từ thư mục gốc repo:  python scripts/stickers/build_sets.py
Cần Python 3 với Pillow, numpy, scipy.

Đầu vào:  print/sticker-sets/<bộ>/sheet.png  (tấm gốc A4 khách / studio gửi, giữ nguyên để in)
Đầu ra:
  print/sticker-sets/<bộ>/NN-<tên>.png         từng sticker đủ độ phân giải gốc, nền trong suốt (để in)
  frontend/public/stickers/<bộ>/NN.webp         bản nhẹ cho web (một nửa độ phân giải)
  frontend/public/stickers/<bộ>/sheet.webp      ảnh xem trước cả tấm
  frontend/src/data/stickerCatalog.json         danh mục cho trình phối (cỡ in thật, cm)
  backend/lib/stickerCatalog.json               danh mục rút gọn để kiểm tra đơn hàng

Cỡ in thật: tấm là A4 (21 × 29,7 cm) nên cm = số pixel × 21 / bề ngang tấm (pixel).
Thứ tự sticker: theo hàng từ trên xuống, trong hàng từ trái sang. Thêm / đổi tấm thì sửa SETS bên dưới
(số tên phải bằng số sticker cắt được; script dừng và báo nếu lệch).
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
A4_W_CM, A4_H_CM = 21.0, 29.7
WEB_SCALE = 0.5

SETS = [
    {
        'key': 'an-vat',
        'name': 'Bộ Ăn vặt',
        # sticker có vùng trắng bên trong là một phần hình (kem trên bánh mì): lấp hết lỗ trắng
        'fill': [12],
        'names': [
            'Kẹo gum', 'Kẹo dẻo dâu', 'Mì ramen', 'Bánh que ly xanh', 'Bỏng ngô', 'Bánh nấm socola',
            'Bánh que socola', 'Socola trà xanh', 'Kem ốc quế', 'Bánh mì gối', 'Cà rốt', 'Bánh mì bơ',
            'Pancake việt quất', 'Bánh que chấm kem', 'Pudding', 'Bánh sừng bò', 'Chai nước', 'Quả đào',
            'Hot dog', 'Bó tulip', 'Lon nước ngọt', 'Bánh kem dâu', 'Sandwich', 'Bánh xốp', 'Bánh quy xoắn',
        ],
    },
    {
        'key': 'giang-sinh',
        'name': 'Bộ Giáng sinh',
        'fill': [],
        'names': [
            'Gấu bông áo len', 'Hộp thư Giáng sinh', 'Quả châu hồng', 'Kẹo gậy', 'Quả cầu tuyết', 'Vòng nguyệt quế',
            'Bông tuyết đỏ', 'Nơ chấm bi', 'Găng tay len', 'Chồng quà', 'Bánh gừng', 'Ngựa gỗ',
            'Ông già Noel', 'Tất Noel', 'Nơ đỏ nhỏ', 'Cây thông', 'Chuông vàng', 'Người tuyết',
            'Xe chở cây thông', 'Nơ đỏ', 'Bông tuyết xanh',
        ],
    },
]


def slug(s):
    s = unicodedata.normalize('NFD', s.replace('đ', 'd').replace('Đ', 'D'))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def cut_sheet(path, fill=()):
    """Trả về danh sách (ảnh RGBA đã cắt sát, x, y) theo thứ tự đọc."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    H, W = a.shape[:2]
    d = 255 - a.min(axis=2)
    # nền tấm là trắng tuyệt đối (255); màu sáng của hình (kem, trắng 254) vẫn tính là hình
    ink = ndi.binary_opening(d >= 1, iterations=1) | (d > 40)
    # gom nhóm sát trước, rồi các mẩu nhỏ (chấm tuyết, vệt màu) nhập vào sticker lớn gần nhất
    lab0, n0 = ndi.label(ndi.binary_dilation(ink, iterations=5))
    area = ndi.sum(ink, lab0, range(1, n0 + 1))
    big = [i + 1 for i in range(n0) if area[i] >= 6000]
    lab = np.where(np.isin(lab0, big), lab0, 0)
    dist, (iy, ix) = ndi.distance_transform_edt(lab == 0, return_indices=True)
    for i in range(n0):
        j = i + 1
        if j in big or area[i] < 40:
            continue
        pts = lab0 == j
        if dist[pts].min() <= 45:
            y, x = np.unravel_index(np.argmin(np.where(pts, dist, np.inf)), dist.shape)
            lab[pts] = lab[iy[y, x], ix[y, x]]
        elif area[i] >= 1500:
            lab[pts] = j  # sticker nhỏ riêng
    found = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None:
            continue
        comp = (lab[sl] == i) & ink[sl]
        if comp.sum() < 600:
            continue
        ys, xs = np.nonzero(comp)
        found.append((ys.min() + sl[0].start, ys.max() + 1 + sl[0].start,
                      xs.min() + sl[1].start, xs.max() + 1 + sl[1].start, i))
    found.sort(key=lambda t: (t[0] // 160, t[2]))
    out = []
    pad = 3
    for k, (y0, y1, x0, x1, i) in enumerate(found, 1):
        Y0, Y1, X0, X1 = max(0, y0 - pad), min(H, y1 + pad), max(0, x0 - pad), min(W, x1 + pad)
        m = ink[Y0:Y1, X0:X1] & (lab[Y0:Y1, X0:X1] == i)
        m = ndi.binary_closing(m, iterations=2)
        # chỉ lấp lỗ trắng nhỏ (điểm sáng); lỗ lớn (giữa vòng nguyệt quế, lỗ bánh quy xoắn) để trong suốt
        holes = ndi.binary_fill_holes(m) & ~m
        hl, hn = ndi.label(holes)
        if hn:
            sizes = ndi.sum(holes, hl, range(1, hn + 1))
            m |= np.isin(hl, np.nonzero((sizes < 2500) | (k in fill))[0] + 1)
        alpha = ndi.gaussian_filter(m.astype(np.float32), 0.6)  # mép mịn
        alpha = np.where(m, np.maximum(alpha, 0.5), alpha)
        alpha[ndi.binary_erosion(m, iterations=1)] = 1
        alpha[~ndi.binary_dilation(m, iterations=1)] = 0
        rgba = np.dstack([a[Y0:Y1, X0:X1].astype(np.float32), alpha * 255])
        im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8))
        bx = im.getchannel('A').getbbox()  # cắt sát phần có hình
        out.append((im.crop(bx), X0 + bx[0], Y0 + bx[1]))
    return out, (W, H)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    web_sets, api_sets = [], {}
    for s in SETS:
        src = ROOT / 'print' / 'sticker-sets' / s['key'] / 'sheet.png'
        stickers, (W, H) = cut_sheet(src, set(s['fill']))
        if len(stickers) != len(s['names']):
            sys.exit(f"{s['key']}: cắt được {len(stickers)} sticker nhưng có {len(s['names'])} tên")
        cm = A4_W_CM / W
        print_dir = ROOT / 'print' / 'sticker-sets' / s['key']
        web_dir = ROOT / 'frontend' / 'public' / 'stickers' / s['key']
        web_dir.mkdir(parents=True, exist_ok=True)
        for f in print_dir.glob('[0-9][0-9]-*.png'):
            f.unlink()
        for f in web_dir.glob('*.webp'):
            f.unlink()
        items = []
        for n, ((im, x, y), name) in enumerate(zip(stickers, s['names']), 1):
            im.save(print_dir / f'{n:02d}-{slug(name)}.png', optimize=True)
            small = im.resize((max(1, round(im.width * WEB_SCALE)), max(1, round(im.height * WEB_SCALE))),
                              Image.LANCZOS)
            small.save(web_dir / f'{n:02d}.webp', quality=86, method=6)
            items.append({
                'id': f"{s['key']}-{n:02d}",
                'name': name,
                'src': f"/stickers/{s['key']}/{n:02d}.webp",
                'w': round(im.width * cm, 2),  # cỡ in thật (cm)
                'h': round(im.height * cm, 2),
                'x': round(x / W * 100, 2),  # vị trí trên tấm (% bề ngang / cao tấm)
                'y': round(y / H * 100, 2),
            })
        sheet = Image.open(src).convert('RGB')
        prev = sheet.resize((700, round(700 * H / W)), Image.LANCZOS)
        prev.save(web_dir / 'sheet.webp', quality=82, method=6)
        web_sets.append({
            'key': s['key'],
            'name': s['name'],
            'sheet': {'src': f"/stickers/{s['key']}/sheet.webp", 'w': A4_W_CM, 'h': A4_H_CM},
            'stickers': items,
        })
        api_sets[s['key']] = {'name': s['name'], 'stickers': [it['id'] for it in items]}
        print(f"{s['name']}: {len(items)} sticker")
    dump = lambda p, v: p.write_text(json.dumps(v, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    dump(ROOT / 'frontend' / 'src' / 'data' / 'stickerCatalog.json', web_sets)
    dump(ROOT / 'backend' / 'lib' / 'stickerCatalog.json', api_sets)


if __name__ == '__main__':
    main()
