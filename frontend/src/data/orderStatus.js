// Nhãn trạng thái đơn / thanh toán / ghi chú dùng ở trang theo dõi đơn và trang quản lý.
// Khoá trạng thái giữ cùng với backend (models/Order.js, models/Customer.js).
import { PAYMENTS } from './pricing.js'

// tone: màu huy hiệu (xem .st-* trong orders.css)
export const ORDER_STATUS = {
  'cho-xac-nhan': {
    label: 'Chờ xác nhận',
    tone: 'sun',
    hint: 'Studio sẽ gọi xác nhận đơn trong giờ làm việc.',
  },
  'dang-lam': {
    label: 'Đang làm',
    tone: 'brand',
    hint: 'Studio đang chuẩn bị bộ kit và in sticker của bạn.',
  },
  'dang-giao': { label: 'Đang giao', tone: 'brand', hint: 'Đơn đã giao cho đơn vị vận chuyển.' },
  'hoan-tat': { label: 'Hoàn tất', tone: 'ok', hint: 'Cảm ơn bạn đã ủng hộ Tùm Lum Studio!' },
  'da-huy': { label: 'Đã huỷ', tone: 'mute', hint: 'Đơn đã huỷ. Cần hỗ trợ, hãy liên hệ studio.' },
}
// Các bước hiện trên trang theo dõi đơn (đơn huỷ không theo các bước này)
export const ORDER_STEPS = ['cho-xac-nhan', 'dang-lam', 'dang-giao', 'hoan-tat']

export const PAY_STATUS = {
  'chua-thanh-toan': { label: 'Chưa thanh toán', tone: 'sun' },
  'mot-phan': { label: 'Đã trả một phần', tone: 'sun' },
  'da-thanh-toan': { label: 'Đã thanh toán', tone: 'ok' },
  'hoan-tien': { label: 'Đã hoàn tiền', tone: 'mute' },
}

export const payMethodLabel = (key) => PAYMENTS.find((p) => p.key === key)?.label ?? key
export const PAY_SOURCE = { sepay: 'Chuyển khoản (SePay)', 'thu-cong': 'Xác nhận tay', cod: 'Thu khi giao' }

export const NOTE_KINDS = {
  'ghi-chu': 'Ghi chú',
  'goi-dien': 'Gọi điện',
  'nhan-tin': 'Nhắn tin',
  gap: 'Gặp trực tiếp',
}

const TZ = 'Asia/Ho_Chi_Minh'
const fmt = (opts) => new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, ...opts })
const D = fmt({ day: '2-digit', month: '2-digit', year: 'numeric' })
const DT = fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const fmtDate = (d) => (d ? D.format(new Date(d)) : '')
export const fmtDateTime = (d) => (d ? DT.format(new Date(d)) : '')
// yyyy-mm-dd theo giờ Việt Nam (cho ô chọn ngày)
export const toDateInput = (d) =>
  d ? new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(d)) : ''
export const todayInput = () => toDateInput(new Date())
