// Cấp / thu quyền quản lý (trang /quan-ly) cho một tài khoản đã đăng ký trên web.
//   npm run make-admin -w backend -- email@cua-ban.com            cấp quyền (đọc MONGODB_URI trong backend/.env.local)
//   npm run make-admin -w backend -- email@cua-ban.com --thu-hoi  thu hồi quyền
//   MONGODB_URI="mongodb+srv://..." npm run make-admin:remote -w backend -- email@cua-ban.com   (database trên Atlas)
import mongoose from 'mongoose'

const email = process.argv[2]?.trim().toLowerCase()
const revoke = process.argv.includes('--thu-hoi')
if (!email || !email.includes('@')) {
  console.error('Cách dùng: npm run make-admin -w backend -- email@cua-ban.com [--thu-hoi]')
  process.exit(1)
}
if (!process.env.MONGODB_URI) {
  console.error('Thiếu MONGODB_URI.')
  process.exit(1)
}

await mongoose.connect(process.env.MONGODB_URI)
const res = await mongoose.connection
  .collection('users')
  .updateOne({ email }, { $set: { role: revoke ? 'customer' : 'admin' } })
await mongoose.disconnect()

if (!res.matchedCount) {
  console.error(`Chưa có tài khoản ${email}. Hãy đăng ký trên web trước rồi chạy lại.`)
  process.exit(1)
}
console.log(
  revoke ? `Đã thu hồi quyền quản lý của ${email}.` : `${email} đã là quản lý. Đăng nhập rồi mở /quan-ly.`
)
