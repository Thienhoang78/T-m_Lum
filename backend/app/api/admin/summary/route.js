import { connectDB } from '@/lib/mongodb'
import { requireStaff } from '@/lib/admin'
import { orderSummary } from '@/lib/orderView'
import { QR_METHODS, autoConfirm, bankConfig } from '@/lib/payments'
import { STUDIO } from '@/lib/pricing'
import Customer from '@/models/Customer'
import Order from '@/models/Order'
import Payment from '@/models/Payment'

export const dynamic = 'force-dynamic'

const DAY = 24 * 60 * 60 * 1000
const VN = 7 * 60 * 60 * 1000 // giờ Việt Nam = UTC+7, không đổi giờ theo mùa
const TZ = 'Asia/Ho_Chi_Minh'
const dayKey = (t) => new Date(t + VN).toISOString().slice(0, 10)

// Tổng quan cho trang quản lý: đơn theo trạng thái, doanh thu (tiền đã thu) và đơn mới 30 ngày, việc cần làm
export async function GET(req) {
  const { denied } = await requireStaff(req)
  if (denied) return denied
  await connectDB()

  const startToday = Math.floor((Date.now() + VN) / DAY) * DAY - VN
  const endToday = new Date(startToday + DAY)
  const since = new Date(startToday - 29 * DAY)
  const byDay = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: TZ } })

  const [
    statusCounts,
    orderDays,
    payDays,
    awaitingPayment,
    unmatched,
    customers,
    newCustomers,
    followUps,
    recent,
  ] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: byDay('$createdAt'),
          orders: { $sum: 1 },
          value: { $sum: { $cond: [{ $ne: ['$status', 'da-huy'] }, '$totals.total', 0] } },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { order: { $ne: null }, at: { $gte: since } } },
      { $group: { _id: byDay('$at'), revenue: { $sum: '$amount' } } },
    ]),
    Order.countDocuments({
      payment: { $in: QR_METHODS },
      paymentStatus: { $nin: ['da-thanh-toan', 'hoan-tien'] },
      status: { $ne: 'da-huy' },
    }),
    Payment.countDocuments({ order: null }),
    Customer.countDocuments(),
    Customer.countDocuments({ 'stats.firstOrderAt': { $gte: since } }),
    Customer.find({ followUpAt: { $lt: endToday } })
      .sort({ followUpAt: 1 })
      .limit(8)
      .select('phone name followUpAt tags stats')
      .lean(),
    Order.find().sort({ createdAt: -1 }).limit(8).lean(),
  ])

  // Chuỗi 30 ngày liên tục (ngày không có đơn = 0)
  const od = new Map(orderDays.map((d) => [d._id, d]))
  const pd = new Map(payDays.map((d) => [d._id, d.revenue]))
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = dayKey(since.getTime() + i * DAY)
    return {
      date,
      orders: od.get(date)?.orders ?? 0,
      value: od.get(date)?.value ?? 0,
      revenue: pd.get(date) ?? 0,
    }
  })
  const sum = (list, k) => list.reduce((n, d) => n + d[k], 0)

  return Response.json({
    status: Object.fromEntries(statusCounts.map((s) => [s._id, s.n])),
    today: days.at(-1),
    last7: { orders: sum(days.slice(-7), 'orders'), revenue: sum(days.slice(-7), 'revenue') },
    last30: { orders: sum(days, 'orders'), revenue: sum(days, 'revenue'), value: sum(days, 'value') },
    days,
    awaitingPayment,
    unmatched,
    customers: { total: customers, new30: newCustomers },
    followUps,
    recent: recent.map(orderSummary),
    setup: { bank: !!bankConfig(), autoConfirm: autoConfirm(), studioPlaceholder: !!STUDIO.placeholder },
  })
}
