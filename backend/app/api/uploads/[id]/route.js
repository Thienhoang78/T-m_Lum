import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/admin'
import Upload from '@/models/Upload'

export const runtime = 'nodejs'

// Studio xem / tải sticker khách đã gửi (cần header x-admin-token, xem lib/admin.js)
export async function GET(req, { params }) {
  const denied = requireAdmin(req)
  if (denied) return denied
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Không tìm thấy hình.' }, { status: 404 })
  await connectDB()
  const doc = await Upload.findById(id).select('+data').lean()
  if (!doc) return Response.json({ error: 'Không tìm thấy hình.' }, { status: 404 })
  return new Response(doc.data.buffer ?? doc.data, {
    headers: {
      'Content-Type': doc.type,
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.name)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
