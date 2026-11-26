import { paymentInfo } from '@/lib/payments'
import Customer from '@/models/Customer'
import Order from '@/models/Order'
import Payment from '@/models/Payment'

// Toàn bộ đơn cho trang quản lý: bản phối, hình khách gửi, cam kết, giao dịch, nhật ký, hồ sơ khách
export async function orderDetail(code) {
  const order = await Order.findOne({ code }).select('+accessKey').lean()
  if (!order) return null
  const [payments, customer] = await Promise.all([
    Payment.find({ order: code }).sort({ at: 1 }).lean(),
    Customer.findOne({ phone: order.customer?.phone }).select('phone name tags stats followUpAt').lean(),
  ])
  return { order, payments, customer, pay: await paymentInfo(order) }
}

export const codeParam = async (params) =>
  decodeURIComponent((await params).code)
    .trim()
    .toUpperCase()
