// Bảng giá: giữ cùng số liệu với frontend/src/data/pricing.js. Đơn hàng luôn được tính lại giá ở đây.
// Giá dự kiến của studio: Basic áo 299.000₫ / túi 219.000₫, Premium áo 699.000₫. Bộ sticker, phí vận chuyển, mã giảm giá: SỐ MẪU.
export const PRICING = {
  items: {
    ao: { 'combo-1': 299000, 'combo-2': 299000, premium: 699000 },
    tui: { 'combo-1': 219000, 'combo-2': 219000 },
  },
  stickerSet: 35000,
  customSticker: 35000, // mỗi hình sticker khách tự tải lên
  shipping: 30000,
  freeShipFrom: 500000,
}

export const VOUCHERS = {
  TUMLUM10: { label: 'Giảm 10% tiền hàng', percent: 10 },
  FREESHIP: { label: 'Miễn phí vận chuyển', freeShip: true },
}

export const STICKER_SETS = {
  'tum-lum': 'Bộ Tùm Lum',
  'de-thuong': 'Bộ Dễ thương',
  'duong-pho': 'Bộ Đường phố',
}

export const DELIVERY = { 'giao-hang': 'Giao tận nơi', studio: 'Nhận tại studio' }
export const PAYMENTS = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  'chuyen-khoan': 'Chuyển khoản ngân hàng',
  'vi-dien-tu': 'Ví MoMo / ZaloPay',
}

// Size và màu hợp lệ của từng món nền ('hoa-tiet' = nền trắng in sẵn hoạ tiết đen, chỉ dùng cho combo hoạ tiết)
export const PRODUCT_RULES = {
  ao: { name: 'Áo thun', sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['trang'] },
  tui: { name: 'Túi tote', sizes: ['Một size'], colors: ['moc', 'den', 'kem'] },
}
export const PATTERN_COLOR = 'hoa-tiet'

export const findVoucher = (code) => VOUCHERS[code?.trim().toUpperCase()] ?? null
export const priceOf = (product, combo) => PRICING.items[product]?.[combo] ?? null

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
