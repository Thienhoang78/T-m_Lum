import { connectDB } from '@/lib/mongodb'
import { requireStaff } from '@/lib/admin'
import { ORDER_STATUSES, orderSummary } from '@/lib/orderView'
import { QR_METHODS } from '@/lib/payments'
import { escapeRe } from '@/lib/text'
import Order from '@/models/Order'

export const dynamic = 'force-dynamic'

const PAGE = 30

// Danh sách đơn cho trang quản lý.
// ?status=<trạng thái> ?pay=can-thu|da-thanh-toan|hoan-tien ?method=cod|qr ?q=<mã đơn / SĐT / tên> ?page=1
export async function GET(req) {
  const { denied } = await requireStaff(req)
  if (denied) return denied
  const p = new URL(req.url).searchParams
  const filter = {}
  if (ORDER_STATUSES.includes(p.get('status'))) filter.status = p.get('status')
  const pay = p.get('pay')
  if (pay === 'can-thu') {
    filter.paymentStatus = { $nin: ['da-thanh-toan', 'hoan-tien'] }
    if (!filter.status) filter.status = { $ne: 'da-huy' }
  } else if (pay === 'da-thanh-toan' || pay === 'hoan-tien') filter.paymentStatus = pay
  if (p.get('method') === 'cod') filter.payment = 'cod'
  else if (p.get('method') === 'qr') filter.payment = { $in: QR_METHODS }
  const q = (p.get('q') ?? '').trim().slice(0, 60)
  if (q) {
    const digits = q.replace(/[\s.-]/g, '')
    if (/^tl/i.test(q)) filter.code = new RegExp(`^${escapeRe(q.toUpperCase())}`)
    else if (/^\d{3,}$/.test(digits)) filter['customer.phone'] = new RegExp(escapeRe(digits))
    else filter['customer.name'] = new RegExp(escapeRe(q), 'i')
  }
  const page = Math.max(1, Math.min(1000, parseInt(p.get('page') ?? '1', 10) || 1))

  await connectDB()
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE)
      .limit(PAGE)
      .lean(),
    Order.countDocuments(filter),
  ])
  return Response.json({
    items: items.map(orderSummary),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
  })
}
