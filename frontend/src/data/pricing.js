// GIÁ MẪU: thay bằng giá thật. Backend tính lại giá từ backend/lib/pricing.js, hai file phải giữ cùng số liệu.
export const PRICING = {
  combos: { 'combo-1': 199000, 'combo-2': 249000, 'combo-3': 299000 }, // giá mỗi áo
  stickerSet: 35000, // mỗi bộ sticker mua thêm
  setIncluded: { 'combo-1': true, 'combo-2': true }, // combo kèm 1 bộ sticker cho mỗi áo
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
  // Combo có sticker: mỗi áo kèm 1 bộ miễn phí, chỉ tính tiền các bộ mua thêm
  const freeSets = PRICING.setIncluded[combo] ? Math.min(stickerQty, qty) : 0
  const paidSets = stickerQty - freeSets
  const stickerTotal = PRICING.stickerSet * paidSets
  const goods = aoTotal + stickerTotal
  const v = findVoucher(voucher)
  const shipping =
    delivery === 'studio' || goods >= PRICING.freeShipFrom || v?.freeShip ? 0 : PRICING.shipping
  const discount = v?.percent ? Math.round((goods * v.percent) / 100) : 0
  return {
    unit,
    aoTotal,
    freeSets,
    paidSets,
    stickerTotal,
    goods,
    shipping,
    discount,
    total: goods + shipping - discount,
  }
}

export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`
