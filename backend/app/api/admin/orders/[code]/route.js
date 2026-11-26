import { connectDB } from '@/lib/mongodb'
import { requireStaff } from '@/lib/admin'
import { refreshCustomer } from '@/lib/customers'
import { ORDER_STATUSES } from '@/lib/orderView'
import { newRef, recordPayment } from '@/lib/payments'
import { codeParam, orderDetail } from '@/lib/orderDetail'
import { bad, str } from '@/lib/text'
import Order from '@/models/Order'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  const { denied } = await requireStaff(req)
  if (denied) return denied
  await connectDB()
  const data = await orderDetail(await codeParam(params))
  return data ? Response.json(data) : bad('Không tìm thấy đơn.', 404)
}

// Đổi trạng thái đơn và / hoặc thêm ghi chú nội bộ: { status?, note? }
// Đơn COD chuyển sang "Hoàn tất" thì tự ghi nhận đã thu đủ tiền khi giao.
export async function PATCH(req, { params }) {
  const { staff, denied } = await requireStaff(req)
  if (denied) return denied
  const code = await codeParam(params)
  const b = await req.json().catch(() => ({}))
  const note = str(b.note, 1000)
  if (b.status != null && !ORDER_STATUSES.includes(b.status)) return bad('Trạng thái không hợp lệ.')

  await connectDB()
  const order = await Order.findOne({ code }).select('status payment totals paidAmount customer').lean()
  if (!order) return bad('Không tìm thấy đơn.', 404)

  const history = []
  if (b.status && b.status !== order.status)
    history.push({
      by: staff.name,
      action: 'trang-thai',
      from: order.status,
      to: b.status,
      note: note || undefined,
    })
  else if (note) history.push({ by: staff.name, action: 'ghi-chu', note })
  if (!history.length) return bad('Không có gì thay đổi.')

  await Order.updateOne(
    { code },
    { ...(b.status ? { $set: { status: b.status } } : {}), $push: { history: { $each: history } } }
  )
  const due = (order.totals?.total ?? 0) - (order.paidAmount ?? 0)
  if (b.status === 'hoan-tat' && order.payment === 'cod' && due > 0)
    await recordPayment({ source: 'cod', ref: newRef('cod'), order: code, amount: due, by: staff.name })
  if (b.status && b.status !== order.status) await refreshCustomer(order.customer?.phone)
  return Response.json(await orderDetail(code))
}
