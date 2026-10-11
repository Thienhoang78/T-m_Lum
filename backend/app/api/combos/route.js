import { connectDB } from '@/lib/mongodb'
import Combo from '@/models/Combo'

export const dynamic = 'force-dynamic'

export async function GET() {
  await connectDB()
  const combos = await Combo.find({ active: true }).sort({ order: 1 }).lean()
  return Response.json(combos)
}

// TODO: thêm xác thực admin trước khi mở cho production
export async function POST(req) {
  await connectDB()
  const body = await req.json()
  const combo = await Combo.create(body)
  return Response.json(combo, { status: 201 })
}
