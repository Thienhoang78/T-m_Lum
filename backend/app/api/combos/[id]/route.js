import { connectDB } from '@/lib/mongodb'
import Combo from '@/models/Combo'
import { requireAdmin } from '@/lib/admin'

export async function GET(_req, { params }) {
  await connectDB()
  const { id } = await params
  const combo = await Combo.findOne({ slug: id }).lean()
  if (!combo) return Response.json({ error: 'Không tìm thấy combo' }, { status: 404 })
  return Response.json(combo)
}

// Cần header x-admin-token (xem lib/admin.js)
export async function PATCH(req, { params }) {
  const denied = requireAdmin(req)
  if (denied) return denied
  await connectDB()
  const { id } = await params
  const combo = await Combo.findOneAndUpdate({ slug: id }, await req.json(), { new: true }).lean()
  if (!combo) return Response.json({ error: 'Không tìm thấy combo' }, { status: 404 })
  return Response.json(combo)
}
