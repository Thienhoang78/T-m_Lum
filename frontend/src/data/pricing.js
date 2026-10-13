// Bảng giá. Backend tính lại giá từ backend/lib/pricing.js, hai file phải giữ cùng số liệu.
// Basic: giá dự kiến theo bảng của studio (áo 299.000₫, túi 219.000₫, như nhau cho Combo 1 và 2).
// Premium, bộ sticker, phí vận chuyển và mã giảm giá: vẫn là SỐ MẪU, thay khi có giá thật.
export const PRICING = {
  items: {
    ao: { 'combo-1': 299000, 'combo-2': 299000, premium: 299000 },
    tui: { 'combo-1': 219000, 'combo-2': 219000 },
  },
  sample: { premium: true }, // combo đang dùng giá mẫu
  stickerSet: 35000, // mỗi bộ sticker
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

// Bảng tính giá: cùng công thức với backend/lib/pricing.js
export function quote({ product, combo, qty, stickerQty = 0, delivery, voucher }) {
  const unit = priceOf(product, combo) ?? 0
  const itemTotal = unit * qty
  const stickerTotal = PRICING.stickerSet * stickerQty
  const goods = itemTotal + stickerTotal
  const v = findVoucher(voucher)
  const shipping =
    delivery === 'studio' || goods >= PRICING.freeShipFrom || v?.freeShip ? 0 : PRICING.shipping
  const discount = v?.percent ? Math.round((goods * v.percent) / 100) : 0
  return { unit, itemTotal, stickerTotal, goods, shipping, discount, total: goods + shipping - discount }
}

export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`
