import { connectDB } from '@/lib/mongodb'
import { safeEqual } from '@/lib/admin'
import { bankConfig, findOrderCode, recordPayment } from '@/lib/payments'
import Order from '@/models/Order'

export const dynamic = 'force-dynamic'

// Webhook của SePay (sepay.vn): SePay theo dõi tài khoản ngân hàng của studio và gọi vào đây mỗi khi có tiền vào.
// Cài trên SePay: Webhooks → URL https://<domain-frontend>/api/payments/sepay, Kiểu chứng thực "API Key",
// điền cùng giá trị với biến SEPAY_API_KEY. SePay gửi header "Authorization: Apikey <SEPAY_API_KEY>".
// Nội dung chuyển khoản có mã đơn (TL251114AB12) thì tự gắn vào đơn; không có thì nằm ở "Giao dịch chưa khớp"
// trong trang quản lý để studio gán tay. SePay gửi lại cùng giao dịch thì bỏ qua (mã giao dịch là duy nhất).
export async function POST(req) {
  const key = process.env.SEPAY_API_KEY
  if (!key) return Response.json({ success: false, error: 'Chưa bật webhook SePay.' }, { status: 404 })
  const given = (req.headers.get('authorization') ?? '').replace(/^Apikey\s+/i, '').trim()
  if (!safeEqual(given, key)) return Response.json({ success: false, error: 'Sai API key.' }, { status: 401 })

  const b = await req.json().catch(() => null)
  if (b?.id == null) return Response.json({ success: false, error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
  // Chỉ nhận tiền vào, đúng tài khoản của studio (SePay có thể theo dõi nhiều tài khoản)
  if (b.transferType !== 'in') return Response.json({ success: true, ignored: 'tien-ra' })
  const bank = bankConfig()
  if (bank && b.accountNumber && String(b.accountNumber) !== bank.account)
    return Response.json({ success: true, ignored: 'tai-khoan-khac' })
  const amount = Math.round(Number(b.transferAmount))
  if (!(amount > 0)) return Response.json({ success: false, error: 'Số tiền không hợp lệ.' }, { status: 400 })

  await connectDB()
  const content = String(b.content ?? '').slice(0, 300)
  const code = findOrderCode(`${b.code ?? ''} ${content} ${b.description ?? ''}`)
  const order = code && (await Order.exists({ code })) ? code : null
  // Giờ giao dịch SePay gửi theo giờ Việt Nam: "2025-11-14 09:30:00"
  const at = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(b.transactionDate ?? '')
    ? new Date(`${b.transactionDate.replace(' ', 'T')}+07:00`)
    : new Date()

  const result = await recordPayment({
    source: 'sepay',
    ref: `sepay-${b.id}`,
    order,
    amount,
    content,
    bank: [b.gateway, b.referenceCode].filter(Boolean).join(' · ').slice(0, 120),
    at,
  })
  return Response.json({ success: true, order, duplicate: !!result.duplicate })
}
