import { connectDB } from '@/lib/mongodb'
import { getSessionUserId } from '@/lib/auth'
import { safeEqual } from '@/lib/admin'
import { normPhone } from '@/lib/customers'
import { paymentInfo } from '@/lib/payments'
import { publicOrder } from '@/lib/orderView'
import Order from '@/models/Order'

export const dynamic = 'force-dynamic'

const notFound = () =>
  Response.json({ error: 'Không tìm thấy đơn, kiểm tra lại mã đơn và số điện thoại.' }, { status: 404 })

// Khách xem đơn của mình (trạng thái, thanh toán, mã QR chuyển khoản). Được xem khi có một trong:
//   ?k=<mã bí mật trong link theo dõi>, ?phone=<số điện thoại đặt hàng>, hoặc đang đăng nhập đúng tài khoản đặt đơn.
export async function GET(req, { params }) {
  const { code: raw } = await params
  const code = decodeURIComponent(raw).trim().toUpperCase()
  if (!/^TL-\d{6}-[A-Z0-9]{4}$/.test(code)) return notFound()
  const url = new URL(req.url)
  const key = url.searchParams.get('k') ?? ''
  const phone = normPhone(url.searchParams.get('phone'))

  await connectDB()
  const order = await Order.findOne({ code }).select('+accessKey -waiver -history').lean()
  if (!order) return notFound()
  const userId = await getSessionUserId()
  const allowed =
    (key && order.accessKey && safeEqual(key, order.accessKey)) ||
    (phone && phone === order.customer?.phone) ||
    (userId && order.user && String(order.user) === userId)
  if (!allowed) return notFound()

  return Response.json({ order: publicOrder(order, await paymentInfo(order)) })
}
