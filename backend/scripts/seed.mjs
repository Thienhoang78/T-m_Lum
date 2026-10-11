// Nạp 3 combo MẪU vào MongoDB. Sửa tên/giá/thành phần rồi chạy: npm run seed
import mongoose from 'mongoose'

const combos = [
  {
    slug: 'combo-1',
    name: 'Combo 1',
    tagline: 'Tên combo chờ cập nhật',
    price: null,
    items: ['1 áo thun trơn', '3 sticker tự chọn', 'In ép nhiệt tại studio'],
    accent: 'sun',
    order: 1,
  },
  {
    slug: 'combo-2',
    name: 'Combo 2',
    tagline: 'Tên combo chờ cập nhật',
    price: null,
    items: ['1 túi tote canvas', '4 sticker tự chọn', 'In ép nhiệt tại studio'],
    accent: 'pink',
    featured: true,
    order: 2,
  },
  {
    slug: 'combo-3',
    name: 'Combo 3',
    tagline: 'Tên combo chờ cập nhật',
    price: null,
    items: ['1 áo thun + 1 túi tote', '6 sticker tự chọn', 'In ép nhiệt tại studio'],
    accent: 'sky',
    order: 3,
  },
]

await mongoose.connect(process.env.MONGODB_URI)
const col = mongoose.connection.collection('combos')
for (const c of combos) {
  await col.updateOne(
    { slug: c.slug },
    { $set: { ...c, active: true, updatedAt: new Date() } },
    { upsert: true }
  )
}
console.log(`Đã nạp ${combos.length} combo.`)
await mongoose.disconnect()
