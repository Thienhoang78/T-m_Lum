import { timingSafeEqual } from 'node:crypto'

// Bảo vệ tạm các API sửa dữ liệu (tạo / sửa combo) bằng mã ADMIN_TOKEN trong biến môi trường.
// Gọi kèm header "x-admin-token: <ADMIN_TOKEN>". Chưa đặt ADMIN_TOKEN thì API luôn từ chối.
// Trả về Response lỗi nếu không hợp lệ, null nếu được phép.
export function requireAdmin(req) {
  const expected = process.env.ADMIN_TOKEN
  const given = req.headers.get('x-admin-token') ?? ''
  const ok =
    !!expected &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  return ok ? null : Response.json({ error: 'Không có quyền thực hiện thao tác này.' }, { status: 403 })
}
