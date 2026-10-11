import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { createSession, publicUser } from '@/lib/auth'
import User from '@/models/User'

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) {
    return Response.json({ error: 'Vui lòng nhập email và mật khẩu.' }, { status: 400 })
  }

  await connectDB()
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 })
  }

  await createSession(user)
  return Response.json({ user: publicUser(user) })
}
