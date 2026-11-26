import { randomBytes } from 'node:crypto'
import Order from '@/models/Order'
import Payment from '@/models/Payment'
import { refreshCustomer } from '@/lib/customers'
import { ascii, vietQrImage } from '@/lib/vietqr'

// Thanh toán đơn hàng:
// - COD: thu khi giao. Studio chuyển đơn sang "Hoàn tất" thì tự ghi nhận đã thu đủ.
// - Chuyển khoản / ví MoMo, ZaloPay: khách quét mã VietQR (đã có số tiền và nội dung = mã đơn bỏ gạch ngang).
//   Có SEPAY_API_KEY thì webhook SePay tự xác nhận khi tiền về; không có thì studio bấm xác nhận trong trang quản lý.
// Trạng thái thanh toán của đơn luôn tính lại từ các giao dịch (collection payments).

export const QR_METHODS = ['chuyen-khoan', 'vi-dien-tu']
export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`

// Tài khoản nhận tiền (biến môi trường BANK_*). Thiếu thì không hiện mã QR, studio gửi thông tin chuyển khoản sau.
export function bankConfig() {
  const bin = process.env.BANK_BIN?.trim() ?? ''
  const account = process.env.BANK_ACCOUNT?.trim().replace(/\s/g, '') ?? ''
  if (!/^\d{6}$/.test(bin) || !/^[0-9A-Za-z]{4,19}$/.test(account)) return null
  return {
    bin,
    account,
    bankName: process.env.BANK_NAME?.trim() || '',
    holder: ascii(process.env.BANK_ACCOUNT_NAME, 50).toUpperCase(),
  }
}

export const autoConfirm = () => !!process.env.SEPAY_API_KEY

// Nội dung chuyển khoản = mã đơn bỏ gạch ngang: TL-251114-AB12 → TL251114AB12
export const transferRef = (code) => code.replace(/-/g, '')

// Tìm mã đơn trong nội dung chuyển khoản (ngân hàng có thể đổi hoa / thường, bỏ gạch ngang, thêm chữ trước sau)
const REF_RE = /TL-?(\d{6})-?([A-Z0-9]{4})/i
export function findOrderCode(text) {
  const m = REF_RE.exec(text ?? '')
  return m ? `TL-${m[1]}-${m[2].toUpperCase()}` : null
}

export const newRef = (prefix) => `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`

// Tính lại trạng thái thanh toán của đơn từ các giao dịch đã gắn
export async function syncOrderPayment(code) {
  const order = await Order.findOne({ code }).select('totals customer paidAt').lean()
  if (!order) return null
  const list = await Payment.find({ order: code }).sort({ at: 1 }).lean()
  const total = order.totals?.total ?? 0
  const net = list.reduce((n, p) => n + p.amount, 0)
  let status = 'chua-thanh-toan'
  if (net > 0 && net >= total) status = 'da-thanh-toan'
  else if (net > 0) status = 'mot-phan'
  else if (list.some((p) => p.amount < 0)) status = 'hoan-tien'
  // thời điểm trả đủ: giao dịch làm số đã trả chạm tổng tiền
  let paidAt = null
  if (status === 'da-thanh-toan') {
    let run = 0
    for (const p of list) {
      run += p.amount
      if (run >= total) {
        paidAt = p.at
        break
      }
    }
  }
  await Order.updateOne({ code }, { $set: { paymentStatus: status, paidAmount: net, paidAt } })
  await refreshCustomer(order.customer?.phone)
  return { status, paid: net, total }
}

// Ghi một giao dịch. Trùng mã giao dịch (webhook gửi lại) thì bỏ qua.
export async function recordPayment({ source, ref, order = null, amount, content, bank, at, by }) {
  try {
    await Payment.create({ source, ref, order, amount, content, bank, at: at ?? new Date(), by })
  } catch (err) {
    if (err?.code === 11000) return { duplicate: true }
    throw err
  }
  if (!order) return { matched: false }
  const label = { sepay: 'chuyển khoản (tự xác nhận)', 'thu-cong': 'xác nhận tay', cod: 'thu khi giao hàng' }[
    source
  ]
  await Order.updateOne(
    { code: order },
    {
      $push: {
        history: {
          by: by ?? (source === 'sepay' ? 'SePay' : undefined),
          action: 'thanh-toan',
          note: `${amount < 0 ? 'Hoàn ' : 'Nhận '}${vnd(Math.abs(amount))}, ${label}${content ? `: ${content}` : ''}`,
        },
      },
    }
  )
  return { matched: true, ...(await syncOrderPayment(order)) }
}

// Thông tin thanh toán gửi cho khách (trang đặt hàng xong, trang theo dõi đơn)
export async function paymentInfo(order) {
  const total = order.totals?.total ?? 0
  const paid = order.paidAmount ?? 0
  const info = {
    method: order.payment,
    status: order.paymentStatus ?? 'chua-thanh-toan',
    total,
    paid,
    due: Math.max(0, total - paid),
    autoConfirm: autoConfirm(),
  }
  if (QR_METHODS.includes(order.payment) && order.status !== 'da-huy' && info.due > 0) {
    const ref = transferRef(order.code)
    const bank = bankConfig()
    info.transfer = bank
      ? {
          bankName: bank.bankName,
          account: bank.account,
          holder: bank.holder,
          ref,
          amount: info.due,
          qr: await vietQrImage({ bin: bank.bin, account: bank.account, amount: info.due, info: ref }),
        }
      : { ref, amount: info.due, missing: true }
  }
  return info
}
