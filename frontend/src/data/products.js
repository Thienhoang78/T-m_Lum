// Cấu hình 2 món nền khách chọn trong mỗi combo. Áo: chỉ áo trắng, bảng size thật.
// Túi: màu và số đo vẫn là NỘI DUNG MẪU, thay khi có số liệu thật.
export const PRODUCTS = {
  ao: {
    key: 'ao',
    name: 'Áo thun',
    unit: 'áo',
    title: 'Áo thun cotton trắng',
    blurb:
      'Áo thun cotton trắng trơn, form oversize vai rơi, cổ bo gân; mặt trước và mặt sau đủ rộng để trang trí theo ý bạn.',
    photo: '/images/ao-trang.png', // áo trắng trơn oversize, cổ bo gân
    // Tâm thân áo theo % khung ảnh vuông: đường căn giữa và chỗ đặt sticker mới khi phối
    center: { x: 50, y: 50 },
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
    center: { x: 50, y: 64 }, // tâm thân túi (dưới quai)
    blurb: 'Túi tote vải canvas dày, quai đeo vai, mặt túi phẳng để trang trí thoải mái.',
    colors: [
      { key: 'moc', name: 'Mộc', fill: '#d8c7a6', seam: '#a8956f' },
      { key: 'den', name: 'Đen', fill: '#25202c', seam: '#6b6276' },
      { key: 'kem', name: 'Kem', fill: '#eee5d2', seam: '#bfae8c' },
    ],
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

// Cách in theo combo: sticker ép nhiệt tại studio, hoặc bộ dụng cụ để khách tự in lụa.
export const METHODS = {
  'heat-transfer': {
    label: 'In ép nhiệt',
    stickers: true,
    note: 'Sticker chọn và tính tiền riêng', // combo chỉ gồm món nền + dịch vụ ép, không kèm sticker
    orderModes: ['Chọn sticker tại studio', 'Bạn tự thiết kế', 'Tùm Lum thiết kế hộ'],
  },
  'screen-print': {
    label: 'In lụa (tự in bằng bộ dụng cụ)',
    stickers: false,
    orderModes: ['Bạn tự thiết kế', 'Tùm Lum thiết kế hộ'],
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
