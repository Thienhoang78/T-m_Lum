// Nạp các combo vào MongoDB: gói Basic (Combo 1, Combo 2 cho áo và túi) và gói Premium (áo + bộ tự in lụa).
// Combo cũ không còn trong danh sách được tắt (active: false), không xoá. Sửa rồi chạy: npm run seed
import mongoose from 'mongoose'

const KIT_LUA = '1 bộ in lụa: 1 khuôn in (stencil), 1 dao gạt mực, 1 chai mực in'

const combos = [
  {
    slug: 'combo-1',
    tier: 'basic',
    name: 'Combo 1',
    tagline: 'Trơn + ép nhiệt sticker',
    method: 'heat-transfer',
    patterned: false,
    products: ['ao', 'tui'],
    items: {
      ao: ['1 áo thun trơn', 'Dịch vụ ép nhiệt sticker'],
      tui: ['1 túi tote trơn', 'Dịch vụ ép nhiệt sticker'],
    },
    order: 1,
  },
  {
    slug: 'combo-2',
    tier: 'basic',
    name: 'Combo 2',
    tagline: 'Hoạ tiết đen trắng + ép nhiệt sticker',
    method: 'heat-transfer',
    patterned: true,
    products: ['ao', 'tui'],
    items: {
      ao: ['1 áo thun in sẵn nền/hoạ tiết đen trắng', 'Dịch vụ ép nhiệt sticker'],
      tui: ['1 túi tote in sẵn nền/hoạ tiết đen trắng', 'Dịch vụ ép nhiệt sticker'],
    },
    order: 2,
  },
  {
    slug: 'premium',
    tier: 'premium',
    name: 'Premium',
    tagline: 'Bộ tự in lụa',
    method: 'screen-print',
    patterned: false,
    products: ['ao'],
    items: { ao: ['1 áo thun trơn', KIT_LUA] },
    order: 3,
  },
]

await mongoose.connect(process.env.MONGODB_URI)
const col = mongoose.connection.collection('combos')
for (const c of combos) {
  await col.updateOne(
    { slug: c.slug },
    // bỏ các trường cũ không còn dùng (giá, tóm tắt, màu nhấn của thẻ combo cũ)
    {
      $set: { ...c, active: true, updatedAt: new Date() },
      $unset: { price: '', summary: '', accent: '', featured: '' },
    },
    { upsert: true }
  )
}
const off = await col.updateMany(
  { slug: { $nin: combos.map((c) => c.slug) }, active: { $ne: false } },
  { $set: { active: false, updatedAt: new Date() } }
)
console.log(`Đã nạp ${combos.length} combo, tắt ${off.modifiedCount} combo cũ.`)
await mongoose.disconnect()
