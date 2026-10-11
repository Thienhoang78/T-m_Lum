import { connectDB } from '@/lib/mongodb'
import Combo from '@/models/Combo'

export async function GET(_req, { params }) {
  await connectDB()
  const { id } = await params
  const combo = await Combo.findOne({ slug: id }).lean()
  if (!combo) return Response.json({ error: 'Không tìm thấy combo' }, { status: 404 })
  return Response.json(combo)
}

// TODO: thêm xác thực admin
export async function PATCH(req, { params }) {
  await connectDB()
  const { id } = await params
  const combo = await Combo.findOneAndUpdate({ slug: id }, await req.json(), { new: true }).lean()
  if (!combo) return Response.json({ error: 'Không tìm thấy combo' }, { status: 404 })
  return Response.json(combo)
}
