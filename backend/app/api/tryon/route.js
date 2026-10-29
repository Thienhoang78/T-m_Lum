import { randomBytes } from 'node:crypto'
import { connectDB } from '@/lib/mongodb'
import { sniffImage } from '@/lib/image'
import TryOnImage from '@/models/TryOnImage'

export const runtime = 'nodejs'

const MAX_BYTES = 4 * 1024 * 1024 // dưới giới hạn 4,5 MB mỗi request của Vercel
const KEEP_MS = 60 * 60 * 1000 // đủ cho một lần thử: widget tải ảnh ngay khi nhận link
const bad = (error) => Response.json({ error }, { status: 400 })

// Lưu tạm ảnh áo cho live mặc thử Anywear (multipart, trường "file"). Trả về đường dẫn công khai /api/tryon/<mã>.
export async function POST(req) {
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') return bad('Chưa có ảnh áo.')
  if (file.size > MAX_BYTES) return bad('Ảnh áo tối đa 4 MB.')
  const data = Buffer.from(await file.arrayBuffer())
  const type = sniffImage(data)
  if (!type) return bad('Ảnh áo phải là PNG, JPG hoặc WebP.')

  await connectDB()
  const token = randomBytes(18).toString('base64url') // 24 ký tự
  await TryOnImage.create({ token, type, data, expiresAt: new Date(Date.now() + KEEP_MS) })
  return Response.json({ path: `/api/tryon/${token}` }, { status: 201 })
}
