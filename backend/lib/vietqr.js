import QRCode from 'qrcode'

// Mã VietQR (chuẩn EMVCo của NAPAS) để khách quét chuyển khoản: app ngân hàng, MoMo, ZaloPay đều đọc được.
// Mã tạo ngay trên server, không gọi dịch vụ ngoài. Có sẵn số tiền và nội dung chuyển khoản (mã đơn).

const tlv = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`

// CRC-16/CCITT-FALSE (đa thức 0x1021, khởi đầu 0xFFFF), tính trên cả chuỗi kể cả "6304"
function crc16(s) {
  let crc = 0xffff
  for (const ch of Buffer.from(s, 'utf8')) {
    crc ^= ch << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Nội dung chuyển khoản chỉ nên có chữ không dấu và số (nhiều ngân hàng bỏ ký tự khác)
export const ascii = (s, max = 25) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, max)

// bin: mã BIN ngân hàng (6 số), account: số tài khoản, amount: số tiền VND, info: nội dung chuyển khoản
export function vietQrPayload({ bin, account, amount, info }) {
  const merchant =
    tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', account)) + tlv('02', 'QRIBFTTA')
  const s =
    tlv('00', '01') +
    tlv('01', amount ? '12' : '11') + // 12: mã dùng một lần có số tiền, 11: mã tĩnh
    tlv('38', merchant) +
    tlv('53', '704') + // VND
    (amount ? tlv('54', String(Math.round(amount))) : '') +
    tlv('58', 'VN') +
    (info ? tlv('62', tlv('08', ascii(info))) : '') +
    '6304'
  return s + crc16(s)
}

// Ảnh QR dạng data URL (SVG) để gắn thẳng vào <img>
export async function vietQrImage(opts) {
  const svg = await QRCode.toString(vietQrPayload(opts), {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  })
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
