// Bảng giá. Backend tính lại giá từ backend/lib/pricing.js, hai file phải giữ cùng số liệu.
// Giá dự kiến theo bảng của studio: Basic áo 299.000₫, túi 219.000₫ (như nhau cho Combo 1 và 2), Premium áo 699.000₫.
// Giá bộ sticker mua thêm, phí vận chuyển và mã giảm giá: vẫn là SỐ MẪU, thay khi có giá thật.
export const PRICING = {
  items: {
    ao: { 'combo-1': 299000, 'combo-2': 299000, premium: 699000 },
    tui: { 'combo-1': 219000, 'combo-2': 219000 },
  },
  // Mỗi áo / túi trong combo đã gồm 1 bộ sticker in chuyển nhiệt. Combo 1: khách tự chọn bộ đi kèm, nên
  // trong các bộ khách chọn, số bộ bằng số áo / túi được tính 0₫. Combo 2, Premium: bộ đi kèm có sẵn trong kit,
  // bộ khách chọn thêm đều tính tiền.
  chooseIncluded: ['combo-1'],
  // Chỉ Combo 1 (áo, túi trơn) cho khách tải hình của mình lên in thành sticker
  uploads: ['combo-1'],
  sample: {}, // combo đang dùng giá mẫu, vd. { premium: true }
  stickerSet: 35000, // mỗi bộ sticker mua thêm
  customSticker: 35000, // mỗi hình sticker khách tự tải lên (số mẫu)
  shipping: 30000,
  freeShipFrom: 500000, // tiền hàng từ mức này được miễn phí vận chuyển
}

// Mã giảm giá MẪU
export const VOUCHERS = {
  TUMLUM10: { label: 'Giảm 10% tiền hàng', percent: 10 },
  FREESHIP: { label: 'Miễn phí vận chuyển', freeShip: true },
}

export const DELIVERY = [
  { key: 'giao-hang', label: 'Giao tận nơi' },
  { key: 'studio', label: 'Nhận tại studio' },
]

export const PAYMENTS = [
  { key: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
  { key: 'chuyen-khoan', label: 'Chuyển khoản ngân hàng' },
  { key: 'vi-dien-tu', label: 'Ví MoMo / ZaloPay' },
]

export const findVoucher = (code) => VOUCHERS[code?.trim().toUpperCase()] ?? null
export const priceOf = (product, combo) => PRICING.items[product]?.[combo] ?? null
export const choosesIncludedSet = (combo) => PRICING.chooseIncluded.includes(combo)
export const allowsUploads = (combo) => PRICING.uploads.includes(combo)

// Bảng tính giá: cùng công thức với backend/lib/pricing.js
export function quote({ product, combo, qty, stickerQty = 0, customQty = 0, delivery, voucher }) {
  const unit = priceOf(product, combo) ?? 0
  const itemTotal = unit * qty
  const includedSets = PRICING.chooseIncluded.includes(combo) ? Math.min(stickerQty, qty) : 0
  const stickerTotal = PRICING.stickerSet * (stickerQty - includedSets)
  const customTotal = PRICING.customSticker * customQty // sticker khách tự tải lên
  const goods = itemTotal + stickerTotal + customTotal
  const v = findVoucher(voucher)
  const shipping =
    delivery === 'studio' || goods >= PRICING.freeShipFrom || v?.freeShip ? 0 : PRICING.shipping
  const discount = v?.percent ? Math.round((goods * v.percent) / 100) : 0
  return {
    unit,
    itemTotal,
    includedSets,
    stickerTotal,
    customTotal,
    goods,
    shipping,
    discount,
    total: goods + shipping - discount,
  }
}

export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`
