import { connectDB } from '@/lib/mongodb'
import { getSessionUserId, publicUser } from '@/lib/auth'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function GET() {
  const id = await getSessionUserId()
  if (!id) return Response.json({ user: null })
  await connectDB()
  const user = await User.findById(id).lean()
  return Response.json({ user: user ? publicUser(user) : null })
}
