// GIÁ MẪU: giữ cùng số liệu với frontend/src/data/pricing.js. Đơn hàng luôn được tính lại giá ở đây.
export const PRICING = {
  combos: { 'combo-1': 199000, 'combo-2': 249000, 'combo-3': 299000 }, // giá mỗi áo
  stickerSet: 35000,
  setIncluded: { 'combo-1': true, 'combo-2': true }, // combo kèm 1 bộ sticker cho mỗi áo
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
export const AO_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

export const findVoucher = (code) => VOUCHERS[code?.trim().toUpperCase()] ?? null

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
