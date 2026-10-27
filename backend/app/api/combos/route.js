import { connectDB } from '@/lib/mongodb'
import Combo from '@/models/Combo'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  await connectDB()
  // Bộ kit cao cấp in lụa đã ngừng bán: không trả về dù cơ sở dữ liệu còn bật
  const combos = await Combo.find({ active: true, tier: { $ne: 'premium' }, slug: { $ne: 'premium' } })
    .sort({ order: 1 })
    .lean()
  return Response.json(combos)
}

// Cần header x-admin-token (xem lib/admin.js)
export async function POST(req) {
  const denied = requireAdmin(req)
  if (denied) return denied
  await connectDB()
  const body = await req.json()
  const combo = await Combo.create(body)
  return Response.json(combo, { status: 201 })
}
