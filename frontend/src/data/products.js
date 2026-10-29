// Cấu hình 2 món nền khách chọn trong mỗi combo. Áo và túi đều màu trắng. Áo: bảng size thật.
// Túi: số đo vẫn là NỘI DUNG MẪU, thay khi có số liệu thật.
// Cỡ thật trên ảnh (để giới hạn hình vẽ / hình tải lên tối đa A4 và đặt sticker đúng cỡ in):
//   widthCm: bề ngang thật của thân áo (ngang ngực size M) / mặt túi; bodyFrac: phần khung ảnh vuông mà bề ngang đó chiếm.
export const PRODUCTS = {
  ao: {
    key: 'ao',
    name: 'Áo thun',
    unit: 'áo',
    title: 'Áo thun cotton trắng',
    blurb:
      'Áo thun cotton trắng trơn, form oversize vai rơi, cổ bo gân; mặt trước và mặt sau đủ rộng để trang trí theo ý bạn.',
    photo: '/images/ao-trang.webp', // ảnh áo thật của studio, đã cắt nền (áo trắng, cổ tròn bo gân, form suông)
    cutout: '/images/ao-trang-cat.webp', // cùng ảnh, khoét hẳn vùng cổ: dùng cho live mặc thử
    // Tâm thân áo theo % khung ảnh vuông: đường căn giữa và chỗ đặt sticker mới khi phối
    center: { x: 50, y: 55 },
    widthCm: 54,
    bodyFrac: 0.539,
    // Mặt sau dựng từ ảnh mặt trước (xem data/design.js): vùng cổ theo toạ độ 0..1 của ảnh
    backNeck: { cx: 0.5, rx: 0.118, top: 0.025, band: 0.03, bottom: 0.165, fabric: [0.5, 0.32] },
    drawCenter: { x: 50, y: 40 }, // tâm khung A4 khi vẽ (giữa ngực)
    colors: [{ key: 'trang', name: 'Trắng', fill: '#f7f4ee', seam: '#cfc7b8' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    extras: ['Tay trái', 'Tay phải', 'Nhãn áo tùy chỉnh'],
    sizeChart: {
      head: ['Size', 'Chiều cao', 'Cân nặng', 'Ngang ngực', 'Dài áo'],
      rows: [
        ['S', '<160cm', '<50kg', '51cm', '70cm'],
        ['M', '161–169cm', '51–65kg', '54cm', '72cm'],
        ['L', '170–175cm', '66–70kg', '57cm', '74cm'],
        ['XL', '176–180cm', '71–85kg', '60cm', '76cm'],
        ['XXL', '181–190cm', '86–100kg', '63cm', '78cm'],
      ],
      note: 'Sai số 1–3cm.',
    },
  },
  tui: {
    key: 'tui',
    name: 'Túi tote',
    unit: 'túi',
    title: 'Túi tote canvas',
    photo: '/images/tui-trang.webp', // ảnh túi thật của studio, đã cắt nền
    cutout: '/images/tui-trang.webp', // vùng được vẽ: theo ảnh túi
    center: { x: 50, y: 70 }, // tâm thân túi (dưới quai)
    drawCenter: { x: 50, y: 70 },
    blurb: 'Túi tote vải canvas trắng, quai đeo vai, mặt túi phẳng để trang trí thoải mái.',
    widthCm: 35,
    bodyFrac: 0.4525,
    colors: [{ key: 'trang', name: 'Trắng', fill: '#f7f4ee', seam: '#cfc7b8' }],
    sizes: ['Một size'],
    extras: [],
    sizeChart: {
      head: ['Kích thước', 'Rộng', 'Cao', 'Dài quai'],
      rows: [['Một size', '35', '40', '60']],
      note: 'Đơn vị: cm. Số đo mẫu, chờ cập nhật số đo thật.',
    },
  },
}

export const PRINT_SIDES = ['Chỉ in mặt trước', 'Chỉ in mặt sau', 'In cả 2 mặt']

// Cách in theo combo: sticker in chuyển nhiệt (bộ kit cao cấp in lụa đã ngừng bán)
export const METHODS = {
  'heat-transfer': {
    label: 'In chuyển nhiệt',
    stickers: true,
    orderModes: ['Chọn sticker tại studio', 'Bạn tự thiết kế', 'Tùm Lum thiết kế hộ'],
  },
}
export const methodOf = (combo) => METHODS[combo.method] ?? METHODS['heat-transfer']

// Combo có món nền in sẵn hoạ tiết đen trắng: chỉ một nền trắng, hoạ tiết đen.
const PATTERN_COLOR = { key: 'hoa-tiet', name: 'Trắng – hoạ tiết đen', fill: '#f7f4ee', seam: '#cfc7b8' }

// Món nền đúng theo combo: đổi tiêu đề và bảng màu khi món in sẵn hoạ tiết.
export function productFor(product, combo) {
  if (!combo.patterned) return product
  return { ...product, title: `${product.title} hoạ tiết đen trắng`, colors: [PATTERN_COLOR] }
}

// Thành phần combo cho một món nền. Dữ liệu cũ lưu items là mảng chung thì dùng luôn mảng đó.
export function contentsOf(combo, key) {
  const items = combo.items
  return Array.isArray(items) ? items : (items?.[key] ?? [])
}

// Bề ngang thật (cm) của cả khung ảnh vuông của món nền: đổi % khung ↔ cm
export const frameCm = (productKey) => {
  const p = PRODUCTS[productKey] ?? PRODUCTS.ao
  return p.widthCm / p.bodyFrac
}
export const pctToCm = (productKey, pct) => (pct / 100) * frameCm(productKey)
export const cmToPct = (productKey, cm) => (cm / frameCm(productKey)) * 100

// Khổ A4 (cm): hình vẽ / hình tải lên không được lớn hơn A4 (dọc hoặc ngang)
export const A4 = { w: 21, h: 29.7 }
// Bề ngang lớn nhất (% khung) của hình có tỉ lệ cao / ngang = ar để vẫn nằm gọn trong A4
export function maxWidthPctA4(productKey, ar = 1) {
  const a = Math.max(0.05, ar)
  const cm = Math.max(Math.min(A4.w, A4.h / a), Math.min(A4.h, A4.w / a))
  return cmToPct(productKey, cm)
}

// Cỡ in thật của sticker thư viện (bề ngang, cm): sticker có cỡ cố định, chỉ đổi vị trí / góc xoay
export const STICKER_CM = { star: 7, heart: 7, bolt: 6, flower: 7, smile: 7, blob: 9 }
export const stickerPct = (productKey, shape) => cmToPct(productKey, STICKER_CM[shape] ?? 7)
