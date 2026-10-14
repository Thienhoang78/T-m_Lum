// Bảng giá. Backend tính lại giá từ backend/lib/pricing.js, hai file phải giữ cùng số liệu.
// Giá dự kiến theo bảng của studio: Basic áo 299.000₫, túi 219.000₫ (như nhau cho Combo 1 và 2), Premium áo 699.000₫.
// Bộ sticker, phí vận chuyển và mã giảm giá: vẫn là SỐ MẪU, thay khi có giá thật.
export const PRICING = {
  items: {
    ao: { 'combo-1': 299000, 'combo-2': 299000, premium: 699000 },
    tui: { 'combo-1': 219000, 'combo-2': 219000 },
  },
  sample: {}, // combo đang dùng giá mẫu, vd. { premium: true }
  stickerSet: 35000, // mỗi bộ sticker
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

// Bảng tính giá: cùng công thức với backend/lib/pricing.js
export function quote({ product, combo, qty, stickerQty = 0, customQty = 0, delivery, voucher }) {
  const unit = priceOf(product, combo) ?? 0
  const itemTotal = unit * qty
  const stickerTotal = PRICING.stickerSet * stickerQty
  const customTotal = PRICING.customSticker * customQty // sticker khách tự tải lên
  const goods = itemTotal + stickerTotal + customTotal
  const v = findVoucher(voucher)
  const shipping =
    delivery === 'studio' || goods >= PRICING.freeShipFrom || v?.freeShip ? 0 : PRICING.shipping
  const discount = v?.percent ? Math.round((goods * v.percent) / 100) : 0
  return {
    unit,
    itemTotal,
    stickerTotal,
    customTotal,
    goods,
    shipping,
    discount,
    total: goods + shipping - discount,
  }
}

export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`
