// Nạp 3 combo vào MongoDB (thành phần thật, tên và giá chờ cập nhật). Sửa rồi chạy: npm run seed
import mongoose from 'mongoose'

const KIT_LUA = '1 bộ in lụa: 1 khuôn in (stencil), 1 dao gạt mực, 1 chai mực in'

const combos = [
  {
    slug: 'combo-1',
    name: 'Combo 1',
    tagline: 'Trơn + ép nhiệt sticker',
    price: null,
    method: 'heat-transfer',
    patterned: false,
    summary: ['1 áo thun hoặc túi tote trơn', 'Dịch vụ ép nhiệt sticker'],
    items: {
      ao: ['1 áo thun trơn', 'Dịch vụ ép nhiệt sticker'],
      tui: ['1 túi tote trơn', 'Dịch vụ ép nhiệt sticker'],
    },
    accent: 'sun',
    order: 1,
  },
  {
    slug: 'combo-2',
    name: 'Combo 2',
    tagline: 'Hoạ tiết đen trắng + ép nhiệt sticker',
    price: null,
    method: 'heat-transfer',
    patterned: true,
    summary: ['1 áo thun hoặc túi tote in sẵn hoạ tiết đen trắng', 'Dịch vụ ép nhiệt sticker'],
    items: {
      ao: ['1 áo thun in sẵn nền/hoạ tiết đen trắng', 'Dịch vụ ép nhiệt sticker'],
      tui: ['1 túi tote in sẵn nền/hoạ tiết đen trắng', 'Dịch vụ ép nhiệt sticker'],
    },
    accent: 'pink',
    featured: true,
    order: 2,
  },
  {
    slug: 'combo-3',
    name: 'Combo 3',
    tagline: 'Bộ tự in lụa',
    price: null,
    method: 'screen-print',
    patterned: false,
    summary: ['1 áo thun hoặc túi tote trơn', '1 bộ in lụa: khuôn in, dao gạt mực, chai mực in'],
    items: {
      ao: ['1 áo thun trơn', KIT_LUA],
      tui: ['1 túi tote trơn', KIT_LUA],
    },
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
