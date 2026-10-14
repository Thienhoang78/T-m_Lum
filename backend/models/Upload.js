import mongoose from 'mongoose'

// Sticker khách tự tải lên. Lưu thẳng trong MongoDB (Vercel không có ổ đĩa lâu dài), mỗi file tối đa 4 MB.
// File chưa gắn vào đơn hàng sẽ tự bị xoá sau 24 giờ nhờ chỉ mục TTL trên expiresAt.
const UploadSchema = new mongoose.Schema(
  {
    name: String,
    type: { type: String, enum: ['image/png', 'image/jpeg', 'image/webp'] },
    size: Number,
    data: { type: Buffer, select: false },
    order: String, // mã đơn khi đã gắn
    expiresAt: Date,
  },
  { timestamps: true }
)
UploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.Upload || mongoose.model('Upload', UploadSchema)
