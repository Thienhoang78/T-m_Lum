import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { requireStaff } from '@/lib/admin'
import { syncOrderPayment, vnd } from '@/lib/payments'
import { bad } from '@/lib/text'
import Order from '@/models/Order'
import Payment from '@/models/Payment'

export const dynamic = 'force-dynamic'

// Gán giao dịch ngân hàng chưa khớp vào một đơn (khách ghi sai nội dung chuyển khoản): { order: 'TL-...' }
export async function PATCH(req, { params }) {
  const { staff, denied } = await requireStaff(req)
  if (denied) return denied
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) return bad('Không tìm thấy giao dịch.', 404)
  const b = await req.json().catch(() => ({}))
  const code = String(b.order ?? '')
    .trim()
    .toUpperCase()

  await connectDB()
  if (!(await Order.exists({ code }))) return bad(`Không có đơn ${code || 'này'}.`)
  // chỉ gán được giao dịch chưa thuộc đơn nào
  const p = await Payment.findOneAndUpdate(
    { _id: id, order: null },
    { $set: { order: code } },
    { new: true }
  ).lean()
  if (!p) return bad('Giao dịch này đã được gán vào đơn khác.', 409)
  await Order.updateOne(
    { code },
    {
      $push: {
        history: {
          by: staff.name,
          action: 'thanh-toan',
          note: `Gán giao dịch ${vnd(p.amount)}${p.content ? `: ${p.content}` : ''}`,
        },
      },
    }
  )
  await syncOrderPayment(code)
  return Response.json({ payment: p })
}
