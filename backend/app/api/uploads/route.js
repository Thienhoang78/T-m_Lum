import { connectDB } from '@/lib/mongodb'
import { sniffImage } from '@/lib/image'
import Upload from '@/models/Upload'

export const runtime = 'nodejs'

const MAX_BYTES = 4 * 1024 * 1024 // dưới giới hạn 4,5 MB mỗi request của Vercel
const KEEP_MS = 24 * 60 * 60 * 1000 // file chưa gắn đơn giữ 24 giờ
const bad = (error) => Response.json({ error }, { status: 400 })

// Tải 1 sticker lên (multipart, trường "file"). Trả về id để gửi kèm đơn hàng.
export async function POST(req) {
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') return bad('Chưa chọn hình.')
  if (file.size > MAX_BYTES) return bad('Mỗi hình tối đa 4 MB.')
  const data = Buffer.from(await file.arrayBuffer())
  const type = sniffImage(data)
  if (!type) return bad('Chỉ nhận ảnh PNG, JPG hoặc WebP.')

  await connectDB()
  const doc = await Upload.create({
    name: String(file.name || 'sticker').slice(0, 120),
    type,
    size: data.length,
    data,
    expiresAt: new Date(Date.now() + KEEP_MS),
  })
  return Response.json({ id: String(doc._id), name: doc.name, size: doc.size, type }, { status: 201 })
}
