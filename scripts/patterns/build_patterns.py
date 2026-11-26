"""Hoạ tiết in sẵn trên áo Combo 2: tấm A4 nền trắng → ảnh nền trong suốt cho web.

Chạy từ thư mục gốc repo:  python scripts/patterns/build_patterns.py
Cần Python 3 với Pillow, numpy.

Đầu vào:  print/patterns/<bộ>.png        tấm A4 gốc nền trắng (giữ nguyên để in), <bộ> là mã bộ sticker đi kèm
Đầu ra:   frontend/public/patterns/<bộ>.webp   bản cho web, nền trong suốt, đặt khít khung A4 mặt trước áo
          (xem frontend/src/data/patterns.js)

Bỏ nền trắng kiểu "màu thành độ trong": độ đục = độ lệch lớn nhất so với trắng, rồi tính lại màu, nên nét mảnh và
viền khử răng cưa vẫn mịn trên áo màu nào cũng được. Thu nhỏ trên nền trắng trước rồi mới bỏ nền để không lem viền.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'print' / 'patterns'
OUT = ROOT / 'frontend' / 'public' / 'patterns'
WEB_W = 1000  # bề ngang bản web (pixel); khung A4 trên áo hiện tối đa khoảng 600 px, phóng to 140%


def white_to_alpha(rgb):
    a = rgb.astype(np.float32)
    alpha = (255.0 - a).max(axis=2) / 255.0
    alpha[alpha < 0.02] = 0  # nhiễu nền gần trắng
    safe = np.where(alpha > 0, alpha, 1)[..., None]
    color = 255.0 - (255.0 - a) / safe
    out = np.dstack([np.clip(color, 0, 255), alpha * 255]).round().astype(np.uint8)
    out[alpha == 0, :3] = 0
    return Image.fromarray(out)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(SRC.glob('*.png'))
    if not files:
        raise SystemExit(f'Không có tấm hoạ tiết nào trong {SRC}')
    for path in files:
        im = Image.open(path).convert('RGB')
        w, h = im.size
        small = im.resize((WEB_W, round(h * WEB_W / w)), Image.LANCZOS)
        dst = OUT / f'{path.stem}.webp'
        white_to_alpha(np.asarray(small)).save(dst, 'WEBP', quality=88, method=6)
        print(f'{path.name}: {w}x{h} -> {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
