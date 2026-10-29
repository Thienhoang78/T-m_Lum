import { connectDB } from '@/lib/mongodb'
import TryOnImage from '@/models/TryOnImage'

export const runtime = 'nodejs'

const TOKEN_RE = /^[\w-]{24}$/
const notFound = () => Response.json({ error: 'Không tìm thấy ảnh.' }, { status: 404 })

// Ảnh áo cho widget Anywear: công khai (ai có link đều xem được, kể cả máy chủ Decart), mã khó đoán, hết hạn sau 1 giờ.
export async function GET(_req, { params }) {
  const { token } = await params
  if (!TOKEN_RE.test(token)) return notFound()
  await connectDB()
  // TTL của MongoDB xoá trễ tới khoảng 1 phút, nên tự kiểm tra hạn
  const doc = await TryOnImage.findOne({ token, expiresAt: { $gt: new Date() } }).lean()
  if (!doc) return notFound()
  return new Response(doc.data.buffer ?? doc.data, {
    headers: {
      'Content-Type': doc.type,
      'Cache-Control': 'public, max-age=3600, immutable',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  })
}
