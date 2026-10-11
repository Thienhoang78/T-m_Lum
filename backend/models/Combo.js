import mongoose from 'mongoose'

const ComboSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tagline: String,
    price: Number, // VND
    items: [String],
    accent: { type: String, enum: ['sun', 'pink', 'sky', 'mint'], default: 'sun' },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default mongoose.models.Combo || mongoose.model('Combo', ComboSchema)
