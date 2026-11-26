import mongoose from 'mongoose'

// Một giao dịch tiền vào / ra của đơn hàng.
// source: 'sepay' (webhook báo tiền về tài khoản ngân hàng), 'thu-cong' (studio tự xác nhận trong trang quản lý),
// 'cod' (thu khi giao hàng). Số âm = hoàn tiền cho khách.
// Giao dịch ngân hàng không tìm thấy mã đơn trong nội dung thì order = null, studio gán tay trong trang quản lý.
const PaymentSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['sepay', 'thu-cong', 'cod'], required: true },
    ref: { type: String, required: true, unique: true }, // mã giao dịch, chống ghi trùng khi webhook gửi lại
    order: { type: String, default: null }, // mã đơn TL-...
    amount: { type: Number, required: true },
    content: String, // nội dung chuyển khoản / ghi chú
    bank: String,
    at: { type: Date, default: Date.now }, // thời điểm giao dịch
    by: String, // người xác nhận (thu công)
  },
  { timestamps: true }
)
PaymentSchema.index({ order: 1 })

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema)
