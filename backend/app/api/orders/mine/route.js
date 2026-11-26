import { connectDB } from '@/lib/mongodb'
import { getSessionUserId } from '@/lib/auth'
import { orderSummary } from '@/lib/orderView'
import Order from '@/models/Order'

export const dynamic = 'force-dynamic'

// Đơn của tài khoản đang đăng nhập (đặt khi đã đăng nhập), mới nhất trước
export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) return Response.json({ error: 'Hãy đăng nhập để xem đơn của bạn.' }, { status: 401 })
  await connectDB()
  const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean()
  return Response.json({ orders: orders.map(orderSummary) })
}
