import mongoose from 'mongoose'

const DesignItemSchema = new mongoose.Schema(
  { shape: String, color: String, label: String, x: Number, y: Number, r: Number, s: Number },
  { _id: false }
)

const OrderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // TL-YYMMDD-XXXX
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    combo: { slug: String, name: String, method: String },
    product: { type: String, enum: ['ao'], required: true },
    size: String,
    qty: { type: Number, min: 1 },
    stickerSet: { key: String, name: String, qty: Number },
    design: [DesignItemSchema], // bản phối thử: toạ độ % trên ảnh áo
    customer: { name: String, phone: String, address: String, note: String },
    delivery: { type: String, enum: ['giao-hang', 'studio'] },
    payment: { type: String, enum: ['cod', 'chuyen-khoan', 'vi-dien-tu'] },
    voucher: String,
    totals: {
      unit: Number,
      aoTotal: Number,
      stickerTotal: Number,
      goods: Number,
      shipping: Number,
      discount: Number,
      total: Number,
    },
    status: {
      type: String,
      enum: ['cho-xac-nhan', 'dang-lam', 'dang-giao', 'hoan-tat', 'da-huy'],
      default: 'cho-xac-nhan',
    },
  },
  { timestamps: true }
)

export default mongoose.models.Order || mongoose.model('Order', OrderSchema)
