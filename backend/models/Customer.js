import mongoose from 'mongoose'

// Khách hàng trong CRM, nhận diện theo số điện thoại (khách đặt hàng không cần tài khoản).
// Tự tạo / cập nhật khi có đơn mới hoặc khi đăng ký tài khoản có số điện thoại (lib/customers.js).
// stats luôn được tính lại từ các đơn hàng, không cộng dồn, nên không bị lệch.
const CustomerSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: String,
    email: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    province: String,
    address: String,
    tags: [String], // nhãn studio tự đặt: "Khách sỉ", "Trường học", ...
    followUpAt: Date, // hẹn chăm sóc lại
    notes: [
      {
        at: { type: Date, default: Date.now },
        by: String,
        kind: { type: String, enum: ['ghi-chu', 'goi-dien', 'nhan-tin', 'gap'], default: 'ghi-chu' },
        text: String,
      },
    ],
    stats: {
      orders: { type: Number, default: 0 }, // số đơn không huỷ
      cancelled: { type: Number, default: 0 },
      spent: { type: Number, default: 0 }, // tổng giá trị các đơn không huỷ
      paid: { type: Number, default: 0 }, // tổng tiền đã thu
      firstOrderAt: Date,
      lastOrderAt: Date,
    },
  },
  { timestamps: true }
)
CustomerSchema.index({ 'stats.lastOrderAt': -1 })
CustomerSchema.index({ followUpAt: 1 })

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema)
