// Nạp các combo vào MongoDB theo bảng giá của studio: Bộ kit cơ bản – in chuyển nhiệt (Combo 1, Combo 2 cho áo và túi)
// và Bộ kit cao cấp – in lụa (Premium: áo + bộ dụng cụ in lụa + 1 bộ sticker).
// Nội dung giữ cùng với COMBO_COPY trong frontend/src/data/combos.js.
// Combo cũ không còn trong danh sách được tắt (active: false), không xoá. Sửa rồi chạy: npm run seed
import mongoose from 'mongoose'

const KIT_LUA = '1 bộ dụng cụ in lụa gồm 1 khuôn in, 1 dao gạt và 1 lọ mực'
const STICKER = '1 bộ sticker in chuyển nhiệt'

const combos = [
  {
    slug: 'combo-1',
    tier: 'basic',
    name: 'Combo 1',
    tagline: 'Trơn + 1 bộ sticker tự chọn',
    method: 'heat-transfer',
    patterned: false,
    products: ['ao', 'tui'],
    items: {
      ao: ['1 áo thun trơn', `${STICKER} (tự chọn)`],
      tui: ['1 túi tote trơn', `${STICKER} (tự chọn)`],
    },
    order: 1,
  },
  {
    slug: 'combo-2',
    tier: 'basic',
    name: 'Combo 2',
    tagline: 'Nền / hoạ tiết đen trắng + 1 bộ sticker',
    method: 'heat-transfer',
    patterned: true,
    products: ['ao', 'tui'],
    items: {
      ao: ['1 áo thun có nền/hoạ tiết đen trắng thiết kế sẵn', STICKER],
      tui: ['1 túi tote có nền/hoạ tiết đen trắng thiết kế sẵn', STICKER],
    },
    order: 2,
  },
  {
    slug: 'premium',
    tier: 'premium',
    name: 'Premium',
    tagline: 'Áo thun + bộ dụng cụ in lụa + 1 bộ sticker',
    method: 'screen-print',
    patterned: false,
    products: ['ao'],
    items: { ao: ['1 áo thun trơn', KIT_LUA, STICKER] },
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
