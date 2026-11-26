import { connectDB } from '@/lib/mongodb'
import { requireStaff } from '@/lib/admin'
import { VIP_FROM, syncAllCustomers } from '@/lib/customers'
import { escapeRe } from '@/lib/text'
import Customer from '@/models/Customer'
import Order from '@/models/Order'

export const dynamic = 'force-dynamic'

const PAGE = 30
const DAY = 24 * 60 * 60 * 1000

// Danh sách khách hàng.
// ?q=<tên / SĐT / email> ?tag=<nhãn> ?seg=cham-soc|vip|quay-lai|moi|chua-mua|lau-chua-mua
// ?sort=gan-day|chi-tieu|don|cham-soc ?page=1
export async function GET(req) {
  const { denied } = await requireStaff(req)
  if (denied) return denied
  const p = new URL(req.url).searchParams
  await connectDB()

  // Lần đầu mở CRM: dựng hồ sơ khách từ các đơn đã có
  if (!(await Customer.estimatedDocumentCount()) && (await Order.estimatedDocumentCount()))
    await syncAllCustomers()

  const filter = {}
  const q = (p.get('q') ?? '').trim().slice(0, 60)
  if (q) {
    const digits = q.replace(/[\s.-]/g, '')
    filter.$or = /^\d{3,}$/.test(digits)
      ? [{ phone: new RegExp(escapeRe(digits)) }]
      : [{ name: new RegExp(escapeRe(q), 'i') }, { email: new RegExp(escapeRe(q), 'i') }]
  }
  const tag = (p.get('tag') ?? '').trim()
  if (tag) filter.tags = tag
  const now = Date.now()
  const seg = p.get('seg')
  if (seg === 'cham-soc') filter.followUpAt = { $lt: new Date(now + DAY) }
  else if (seg === 'vip') filter['stats.spent'] = { $gte: VIP_FROM }
  else if (seg === 'quay-lai') filter['stats.orders'] = { $gte: 2 }
  else if (seg === 'moi') filter['stats.firstOrderAt'] = { $gte: new Date(now - 30 * DAY) }
  else if (seg === 'chua-mua') filter['stats.orders'] = { $not: { $gt: 0 } }
  else if (seg === 'lau-chua-mua') filter['stats.lastOrderAt'] = { $lt: new Date(now - 90 * DAY) }

  const sort = {
    'chi-tieu': { 'stats.spent': -1 },
    don: { 'stats.orders': -1, 'stats.spent': -1 },
    'cham-soc': { followUpAt: 1 },
  }[p.get('sort')] ?? { 'stats.lastOrderAt': -1, createdAt: -1 }
  if (p.get('sort') === 'cham-soc') filter.followUpAt ??= { $ne: null }
  const page = Math.max(1, Math.min(1000, parseInt(p.get('page') ?? '1', 10) || 1))

  const [items, total, tags] = await Promise.all([
    Customer.find(filter)
      .sort(sort)
      .skip((page - 1) * PAGE)
      .limit(PAGE)
      .select('-notes')
      .lean(),
    Customer.countDocuments(filter),
    Customer.distinct('tags'),
  ])
  return Response.json({
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
    tags: tags.filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')),
    vipFrom: VIP_FROM,
  })
}

// Dựng lại hồ sơ khách từ toàn bộ đơn và tài khoản (nút "Đồng bộ từ đơn hàng")
export async function POST(req) {
  const { denied } = await requireStaff(req)
  if (denied) return denied
  await connectDB()
  return Response.json(await syncAllCustomers())
}
