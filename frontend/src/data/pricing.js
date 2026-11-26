// Bảng giá. Backend tính lại giá từ backend/lib/pricing.js, hai file phải giữ cùng số liệu.
// Bộ kit cơ bản – in chuyển nhiệt: áo 299.000₫, túi 219.000₫ (như nhau cho Combo 1 và 2).
// Sticker không tính tiền riêng: bộ sticker đi kèm, hình tự tải lên và hình vẽ tay (Combo 1) đã gồm trong giá combo.
// Mua thêm tấm sticker A5 / A4 (in đúng thiết kế đã chọn của combo theo khổ) thì tính theo tấm. Mã giảm giá: vẫn là SỐ MẪU.
export const PRICING = {
  items: {
    ao: { 'combo-1': 299000, 'combo-2': 299000 },
    tui: { 'combo-1': 219000, 'combo-2': 219000 },
  },
  // Combo 1: khách chọn 1 trong 3 cách làm sticker: tự vẽ ('ve'), tải hình của mình ('tai-len')
  // hoặc 1 bộ sticker có sẵn của shop ('bo-sticker'). Combo 2: bộ sticker đi kèm có sẵn trong kit.
  choices: { 'combo-1': ['ve', 'tai-len', 'bo-sticker'] },
  chooseIncluded: ['combo-1'], // combo khách được chọn bộ sticker (khi chọn cách 'bo-sticker')
  uploads: ['combo-1'], // combo nhận hình khách tự vẽ / tải lên
  // Tấm sticker mua thêm (mọi combo): in đúng thiết kế sticker của combo (hình vẽ / hình tải lên / bộ sticker) theo khổ
  sheets: {
    a5: { name: 'Tấm sticker A5', price: 20000 },
    a4: { name: 'Tấm sticker A4', price: 30000 },
  },
  maxSheets: 99, // mỗi loại tấm
  // Phí giao hàng theo vùng (xem PROVINCES)
  shipping: { 'da-nang': 15000, 'mien-trung': 20000, 'con-lai': 25000 },
  freeShipFrom: 500000, // tiền hàng từ mức này được miễn phí vận chuyển
  freeShipRadiusKm: 3, // giao tận nơi trong bán kính này quanh studio (đường chim bay) được miễn phí, xem STUDIO
}

// Vị trí studio để tính bán kính miễn phí giao. TẠM đặt ở Cầu Rồng (Đà Nẵng) cho tới khi có toạ độ thật:
// Google Maps → nhấp chuột phải vào studio → bấm dòng số "16.06…, 108.22…" để chép, rồi sửa lat / lng ở đây và
// ở file pricing còn lại, đổi placeholder thành false.
export const STUDIO = { lat: 16.0612, lng: 108.2272, province: 'da-nang', placeholder: true }

// Khoảng cách đường chim bay giữa hai điểm { lat, lng }, đơn vị km (công thức haversine)
export function distanceKm(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// Vị trí nhận hàng khách ghim trên bản đồ: hợp lệ (trong khoảng Việt Nam) thì trả { lat, lng } làm tròn, không thì null
export function geoOf(v) {
  const lat = Number(v?.lat)
  const lng = Number(v?.lng)
  if (!(lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110)) return null
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
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

// Chuyển khoản và ví điện tử: đặt xong hiện mã VietQR có sẵn số tiền + nội dung (mã đơn), app ngân hàng / MoMo /
// ZaloPay đều quét được (components/PaymentBox.jsx)
export const PAYMENTS = [
  { key: 'cod', label: 'Thanh toán khi nhận hàng (COD)', hint: 'Trả tiền mặt cho shipper hoặc tại studio.' },
  {
    key: 'chuyen-khoan',
    label: 'Chuyển khoản ngân hàng',
    hint: 'Đặt xong hiện mã VietQR có sẵn số tiền và nội dung, mở app ngân hàng quét là xong.',
  },
  {
    key: 'vi-dien-tu',
    label: 'Ví MoMo / ZaloPay',
    hint: 'Đặt xong mở app MoMo hoặc ZaloPay, chọn Quét mã và quét mã VietQR của đơn.',
  },
]

export const findVoucher = (code) => VOUCHERS[code?.trim().toUpperCase()] ?? null
export const priceOf = (product, combo) => PRICING.items[product]?.[combo] ?? null
export const choosesIncludedSet = (combo) => PRICING.chooseIncluded.includes(combo)
export const allowsUploads = (combo) => PRICING.uploads.includes(combo)
export const choicesOf = (combo) => PRICING.choices[combo] ?? []

// Bảng tính giá: cùng công thức với backend/lib/pricing.js.
// sheets: { a5: số tấm, a4: số tấm }; province: tỉnh nhận hàng (giao tận nơi);
// geo: vị trí nhận hàng { lat, lng } khách ghim trên bản đồ (trong bán kính quanh studio thì miễn phí giao)
export function quote({ product, combo, qty, sheets = {}, delivery, province, voucher, geo }) {
  const unit = priceOf(product, combo) ?? 0
  const itemTotal = unit * qty
  const sheetTotal = Object.entries(PRICING.sheets).reduce((n, [k, s]) => n + s.price * (sheets[k] ?? 0), 0)
  const goods = itemTotal + sheetTotal
  const v = findVoucher(voucher)
  const fee = shipFee(province)
  const point = delivery === 'giao-hang' && province === STUDIO.province ? geoOf(geo) : null
  const raw = point ? distanceKm(STUDIO, point) : null
  const nearby = raw != null && raw <= PRICING.freeShipRadiusKm
  const km = raw == null ? null : Math.round(raw * 100) / 100
  const shipping =
    delivery === 'studio' || goods >= PRICING.freeShipFrom || v?.freeShip || nearby ? 0 : (fee ?? 0)
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
    nearby, // miễn phí giao vì nơi nhận trong bán kính quanh studio
    distanceKm: km ?? undefined, // khoảng cách nơi nhận → studio (khi khách đã ghim vị trí)
  }
}

export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`

// Khoảng cách km: 1 số lẻ; sát mép bán kính miễn phí thì 2 số lẻ (không ghi "3,0 km" mà vẫn bị tính phí)
export function fmtKm(km) {
  const d = Math.abs(km - PRICING.freeShipRadiusKm) < 0.1 ? 2 : 1
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }).format(km)
}
