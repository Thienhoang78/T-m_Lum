import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { createSession, publicUser } from '@/lib/auth'
import User from '@/models/User'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req) {
  const { name, email, phone, password } = await req.json().catch(() => ({}))

  if (!name?.trim()) return Response.json({ error: 'Vui lòng nhập họ tên.' }, { status: 400 })
  if (!EMAIL_RE.test(email ?? ''))
    return Response.json({ error: 'Email chưa đúng định dạng.' }, { status: 400 })
  if ((password ?? '').length < 8)
    return Response.json({ error: 'Mật khẩu cần ít nhất 8 ký tự.' }, { status: 400 })

  await connectDB()
  if (await User.exists({ email: email.toLowerCase() })) {
    return Response.json({ error: 'Email này đã có tài khoản. Hãy đăng nhập.' }, { status: 409 })
  }

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash: await bcrypt.hash(password, 10),
  })
  await createSession(user)
  return Response.json({ user: publicUser(user) }, { status: 201 })
}
