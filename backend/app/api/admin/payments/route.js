import { connectDB } from '@/lib/mongodb'
import { requireStaff } from '@/lib/admin'
import Payment from '@/models/Payment'

export const dynamic = 'force-dynamic'

// Giao dịch gần đây. ?filter=chua-khop: chỉ giao dịch ngân hàng chưa tìm được đơn (để gán tay)
export async function GET(req) {
  const { denied } = await requireStaff(req)
  if (denied) return denied
  const unmatched = new URL(req.url).searchParams.get('filter') === 'chua-khop'
  await connectDB()
  const items = await Payment.find(unmatched ? { order: null } : {})
    .sort({ at: -1 })
    .limit(100)
    .lean()
  return Response.json({ items })
}
