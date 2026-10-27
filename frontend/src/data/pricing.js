// Bảng giá. Backend tính lại giá từ backend/lib/pricing.js, hai file phải giữ cùng số liệu.
// Bộ kit cơ bản – in chuyển nhiệt: áo 299.000₫, túi 219.000₫ (như nhau cho Combo 1 và 2).
// Sticker không tính tiền riêng: bộ sticker đi kèm, hình tự tải lên và hình vẽ tay (Combo 1) đã gồm trong giá combo.
// Mua thêm tấm sticker A5 / A4 thì tính theo tấm. Mã giảm giá: vẫn là SỐ MẪU.
export const PRICING = {
  items: {
    ao: { 'combo-1': 299000, 'combo-2': 299000 },
    tui: { 'combo-1': 219000, 'combo-2': 219000 },
  },
  // Combo 1: khách tự chọn bộ sticker đi kèm, mỗi áo / túi 1 bộ. Combo 2: bộ đi kèm có sẵn trong kit.
  chooseIncluded: ['combo-1'],
  // Chỉ Combo 1 (áo, túi trơn) cho khách tải hình / vẽ tay để in thành sticker
  uploads: ['combo-1'],
  // Tấm sticker mua thêm (mọi combo)
  sheets: {
    a5: { name: 'Tấm sticker A5', price: 20000 },
    a4: { name: 'Tấm sticker A4', price: 30000 },
  },
  maxSheets: 99, // mỗi loại tấm
  // Phí giao hàng theo vùng (xem PROVINCES)
  shipping: { 'da-nang': 15000, 'mien-trung': 20000, 'con-lai': 25000 },
  freeShipFrom: 500000, // tiền hàng từ mức này được miễn phí vận chuyển
}

// 34 tỉnh, thành phố (sau sắp xếp đơn vị hành chính năm 2025) và vùng phí giao hàng.
// Sửa vùng của tỉnh nào thì đổi `zone` ở đây và ở backend/lib/pricing.js.
export const PROVINCES = [
  ['ha-noi', 'Hà Nội'],
  ['hue', 'Huế', 'mien-trung'],
  ['hai-phong', 'Hải Phòng'],
  ['da-nang', 'Đà Nẵng', 'da-nang'],
  ['ho-chi-minh', 'TP. Hồ Chí Minh'],
  ['can-tho', 'Cần Thơ'],
  ['an-giang', 'An Giang'],
  ['bac-ninh', 'Bắc Ninh'],
  ['ca-mau', 'Cà Mau'],
  ['cao-bang', 'Cao Bằng'],
  ['dak-lak', 'Đắk Lắk', 'mien-trung'],
  ['dien-bien', 'Điện Biên'],
  ['dong-nai', 'Đồng Nai'],
  ['dong-thap', 'Đồng Tháp'],
  ['gia-lai', 'Gia Lai', 'mien-trung'],
  ['ha-tinh', 'Hà Tĩnh', 'mien-trung'],
  ['hung-yen', 'Hưng Yên'],
  ['khanh-hoa', 'Khánh Hòa', 'mien-trung'],
  ['lai-chau', 'Lai Châu'],
  ['lam-dong', 'Lâm Đồng', 'mien-trung'],
  ['lang-son', 'Lạng Sơn'],
  ['lao-cai', 'Lào Cai'],
  ['nghe-an', 'Nghệ An', 'mien-trung'],
  ['ninh-binh', 'Ninh Bình'],
  ['phu-tho', 'Phú Thọ'],
  ['quang-ngai', 'Quảng Ngãi', 'mien-trung'],
  ['quang-ninh', 'Quảng Ninh'],
  ['quang-tri', 'Quảng Trị', 'mien-trung'],
  ['son-la', 'Sơn La'],
  ['tay-ninh', 'Tây Ninh'],
  ['thai-nguyen', 'Thái Nguyên'],
  ['thanh-hoa', 'Thanh Hóa', 'mien-trung'],
  ['tuyen-quang', 'Tuyên Quang'],
  ['vinh-long', 'Vĩnh Long'],
].map(([key, name, zone = 'con-lai']) => ({ key, name, zone }))
export const provinceOf = (key) => PROVINCES.find((p) => p.key === key) ?? null
// Phí giao tới tỉnh (chưa tính miễn phí); chưa chọn tỉnh thì null
export const shipFee = (province) => {
  const p = provinceOf(province)
  return p ? PRICING.shipping[p.zone] : null
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

// Bảng tính giá: cùng công thức với backend/lib/pricing.js.
// sheets: { a5: số tấm, a4: số tấm }; province: tỉnh nhận hàng (giao tận nơi)
export function quote({ product, combo, qty, sheets = {}, delivery, province, voucher }) {
  const unit = priceOf(product, combo) ?? 0
  const itemTotal = unit * qty
  const sheetTotal = Object.entries(PRICING.sheets).reduce((n, [k, s]) => n + s.price * (sheets[k] ?? 0), 0)
  const goods = itemTotal + sheetTotal
  const v = findVoucher(voucher)
  const fee = shipFee(province)
  const shipping = delivery === 'studio' || goods >= PRICING.freeShipFrom || v?.freeShip ? 0 : (fee ?? 0)
  const discount = v?.percent ? Math.round((goods * v.percent) / 100) : 0
  return {
    unit,
    itemTotal,
    sheetTotal,
    goods,
    shipping,
    // giao tận nơi mà chưa chọn tỉnh thì chưa biết phí
    shippingPending:
      delivery !== 'studio' && shipping === 0 && fee == null && !v?.freeShip && goods < PRICING.freeShipFrom,
    discount,
    total: goods + shipping - discount,
  }
}

export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`
