import mongoose from 'mongoose'

const ComboSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tagline: String,
    price: Number, // VND
    summary: [String], // thành phần chung cho cả áo và túi, hiện trên thẻ combo
    items: { ao: [String], tui: [String] }, // thành phần theo từng món nền
    method: { type: String, enum: ['heat-transfer', 'screen-print'], default: 'heat-transfer' },
    patterned: { type: Boolean, default: false }, // món nền in sẵn hoạ tiết đen trắng
    accent: { type: String, enum: ['sun', 'pink', 'sky', 'mint'], default: 'sun' },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default mongoose.models.Combo || mongoose.model('Combo', ComboSchema)
