import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'tl_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 ngày

function secret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('Thiếu JWT_SECRET trong .env.local')
  return new TextEncoder().encode(s)
}

export async function createSession(user) {
  const token = await new SignJWT({ sub: String(user._id), name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret())
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function getSessionUserId() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload.sub
  } catch {
    return null
  }
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

// Trả về thông tin user an toàn để gửi cho frontend (không có mật khẩu)
export const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone ?? '' })
