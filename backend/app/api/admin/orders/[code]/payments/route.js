import { connectDB } from '@/lib/mongodb'
import { requireStaff } from '@/lib/admin'
import { codeParam, orderDetail } from '@/lib/orderDetail'
import { newRef, recordPayment } from '@/lib/payments'
import { bad, str } from '@/lib/text'
import Order from '@/models/Order'

export const dynamic = 'force-dynamic'

// Studio ghi nhận tiền tay: { kind: 'thu' | 'hoan', amount, note }
// Dùng khi khách chuyển khoản mà chưa bật webhook SePay, trả tiền mặt tại studio, hoặc hoàn tiền cho khách.
export async function POST(req, { params }) {
  const { staff, denied } = await requireStaff(req)
  if (denied) return denied
  const code = await codeParam(params)
  const b = await req.json().catch(() => ({}))
  const amount = Number(b.amount)
  if (!Number.isInteger(amount) || amount < 1 || amount > 100_000_000) return bad('Số tiền không hợp lệ.')
  if (b.kind !== 'thu' && b.kind !== 'hoan') return bad('Chọn thu tiền hoặc hoàn tiền.')

  await connectDB()
  const order = await Order.findOne({ code }).select('paidAmount').lean()
  if (!order) return bad('Không tìm thấy đơn.', 404)
  if (b.kind === 'hoan' && amount > (order.paidAmount ?? 0)) return bad('Số tiền hoàn lớn hơn số đã thu.')

  await recordPayment({
    source: 'thu-cong',
    ref: newRef('tc'),
    order: code,
    amount: b.kind === 'hoan' ? -amount : amount,
    content: str(b.note, 200) || undefined,
    by: staff.name,
  })
  return Response.json(await orderDetail(code))
}
