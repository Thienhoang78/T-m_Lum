import mongoose from 'mongoose'

// Ảnh mặt trước áo kèm bản phối, gửi cho widget Anywear khi live mặc thử. Widget chỉ nhận link http(s) công khai,
// nên ảnh được lưu tạm theo mã ngẫu nhiên khó đoán và tự xoá sau 1 giờ nhờ chỉ mục TTL trên expiresAt.
// Tách riêng khỏi Upload để ảnh này không gắn được vào đơn hàng và sticker khách gửi không bị lộ công khai.
const TryOnImageSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    type: { type: String, enum: ['image/png', 'image/jpeg', 'image/webp'] },
    data: Buffer,
    expiresAt: Date,
  },
  { timestamps: true }
)
TryOnImageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.TryOnImage || mongoose.model('TryOnImage', TryOnImageSchema)
