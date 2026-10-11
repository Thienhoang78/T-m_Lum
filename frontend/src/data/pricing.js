// GIÁ MẪU: thay bằng giá thật. Backend tính lại giá từ backend/lib/pricing.js, hai file phải giữ cùng số liệu.
export const PRICING = {
  combos: { 'combo-1': 199000, 'combo-2': 249000, 'combo-3': 299000 }, // giá mỗi áo
  stickerSet: 35000, // mỗi bộ sticker mua thêm
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

// Bảng tính giá: cùng công thức với backend/lib/pricing.js
export function quote({ combo, qty, stickerQty = 0, delivery, voucher }) {
  const unit = PRICING.combos[combo] ?? 0
  const aoTotal = unit * qty
  const stickerTotal = PRICING.stickerSet * stickerQty
  const goods = aoTotal + stickerTotal
  const v = findVoucher(voucher)
  const shipping =
    delivery === 'studio' || goods >= PRICING.freeShipFrom || v?.freeShip ? 0 : PRICING.shipping
  const discount = v?.percent ? Math.round((goods * v.percent) / 100) : 0
  return { unit, aoTotal, stickerTotal, goods, shipping, discount, total: goods + shipping - discount }
}

export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`
