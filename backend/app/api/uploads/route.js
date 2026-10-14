import { connectDB } from '@/lib/mongodb'
import Upload from '@/models/Upload'

export const runtime = 'nodejs'

const MAX_BYTES = 4 * 1024 * 1024 // dưới giới hạn 4,5 MB mỗi request của Vercel
const KEEP_MS = 24 * 60 * 60 * 1000 // file chưa gắn đơn giữ 24 giờ
const bad = (error) => Response.json({ error }, { status: 400 })

// Nhận dạng ảnh theo vài byte đầu file, không tin phần mở rộng hay type trình duyệt gửi lên
function sniff(b) {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp'
  return null
}

// Tải 1 sticker lên (multipart, trường "file"). Trả về id để gửi kèm đơn hàng.
export async function POST(req) {
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') return bad('Chưa chọn hình.')
  if (file.size > MAX_BYTES) return bad('Mỗi hình tối đa 4 MB.')
  const data = Buffer.from(await file.arrayBuffer())
  const type = sniff(data)
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
