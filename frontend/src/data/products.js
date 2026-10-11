// Cấu hình 2 món nền khách chọn trong mỗi combo. Màu, size và số đo là NỘI DUNG MẪU, thay khi có số liệu thật.
export const PRODUCTS = {
  ao: {
    key: 'ao',
    name: 'Áo thun',
    unit: 'áo',
    title: 'Áo thun cotton in sticker',
    blurb: 'Áo thun trắng trơn, form suông, để dán sticker kín mặt trước hoặc mặt sau.',
    colors: [
      { key: 'trang', name: 'Trắng', fill: '#f7f4ee', seam: '#cfc7b8' },
      { key: 'den', name: 'Đen', fill: '#25202c', seam: '#6b6276' },
      { key: 'kem', name: 'Kem', fill: '#eadfc8', seam: '#bfae8c' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    extras: ['Tay trái', 'Tay phải', 'Nhãn áo tùy chỉnh'],
    // Số đo tham khảo (cm): rộng ngực, dài áo, cân nặng gợi ý (kg)
    sizeChart: {
      head: ['Size', 'Rộng ngực', 'Dài áo', 'Cân nặng'],
      rows: [
        ['S', '48', '66', '40–50'],
        ['M', '51', '69', '50–60'],
        ['L', '54', '72', '60–70'],
        ['XL', '57', '74', '70–80'],
      ],
      note: 'Đơn vị: cm, cân nặng tính bằng kg. Số đo mẫu, chờ cập nhật số đo thật.',
    },
  },
  tui: {
    key: 'tui',
    name: 'Túi tote',
    unit: 'túi',
    title: 'Túi tote canvas in sticker',
    blurb: 'Túi tote vải canvas dày, quai đeo vai, mặt túi phẳng để dán sticker thoải mái.',
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

export const ORDER_MODES = ['Chọn sticker tại studio', 'Bạn tự thiết kế', 'Tùm Lum thiết kế hộ']
export const PRINT_SIDES = ['Chỉ in mặt trước', 'Chỉ in mặt sau', 'In cả 2 mặt']
export const PRINT_METHOD = 'In ép nhiệt'

export const formatPrice = (p) =>
  p == null ? 'Giá: chờ cập nhật' : `${new Intl.NumberFormat('vi-VN').format(p)}₫`
