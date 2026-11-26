import { timingSafeEqual } from 'node:crypto'
import { connectDB } from '@/lib/mongodb'
import { getSessionUserId } from '@/lib/auth'
import User from '@/models/User'

export const safeEqual = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b))

// Bảo vệ tạm các API sửa dữ liệu (tạo / sửa combo) bằng mã ADMIN_TOKEN trong biến môi trường.
// Gọi kèm header "x-admin-token: <ADMIN_TOKEN>". Chưa đặt ADMIN_TOKEN thì API luôn từ chối.
// Trả về Response lỗi nếu không hợp lệ, null nếu được phép.
export function requireAdmin(req) {
  const expected = process.env.ADMIN_TOKEN
  const ok = !!expected && safeEqual(req.headers.get('x-admin-token') ?? '', expected)
  return ok ? null : Response.json({ error: 'Không có quyền thực hiện thao tác này.' }, { status: 403 })
}

// API trang quản lý (CRM): tài khoản đang đăng nhập có role 'admin' (cấp bằng: npm run make-admin -w backend -- email),
// hoặc header x-admin-token như trên. Trả về { staff: { id, name } } nếu được phép, { denied: Response } nếu không.
export async function requireStaff(req) {
  if (!requireAdmin(req)) return { staff: { id: null, name: 'ADMIN_TOKEN' } }
  const id = await getSessionUserId()
  if (!id) return { denied: Response.json({ error: 'Hãy đăng nhập tài khoản quản lý.' }, { status: 401 }) }
  await connectDB()
  const user = await User.findById(id).select('name role').lean()
  if (user?.role !== 'admin')
    return { denied: Response.json({ error: 'Tài khoản này không có quyền quản lý.' }, { status: 403 }) }
  return { staff: { id: String(user._id), name: user.name } }
}
