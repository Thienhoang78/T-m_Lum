import mongoose from 'mongoose'

const DesignItemSchema = new mongoose.Schema(
  // upload: vị trí trong customStickers khi là sticker khách tự tải lên
  // set: bộ sticker của sticker thư viện
  {
    side: { type: String, enum: ['front', 'back'], default: 'front' }, // mặt trước / mặt sau
    shape: String,
    color: String,
    label: String,
    set: String,
    upload: Number,
    x: Number,
    y: Number,
    r: Number,
    s: Number,
  },
  { _id: false }
)

const OrderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // TL-YYMMDD-XXXX
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    combo: { slug: String, name: String, tier: String, method: String },
    product: { type: String, enum: ['ao', 'tui'], required: true },
    color: String,
    size: String,
    qty: { type: Number, min: 1 },
    stickerSet: { key: String, name: String, qty: Number }, // đơn cũ (một bộ)
    stickerSets: [{ _id: false, key: String, name: String, qty: Number }],
    // sticker khách tự tải lên (file nằm trong collection uploads)
    customStickers: [
      {
        _id: false,
        upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' },
        name: String,
        size: Number,
        cut: Boolean, // khách chọn bản đã tách nền
      },
    ],
    // cam kết miễn trừ trách nhiệm bản quyền khách đã ký khi tải sticker lên
    waiver: {
      accepted: Boolean,
      signedName: String,
      version: String,
      text: String,
      signedAt: Date,
      ip: String,
      userAgent: String,
    },
    design: [DesignItemSchema], // bản phối: toạ độ % trên ảnh, thứ tự = thứ tự lớp (cuối cùng nằm trên)
    sheets: { a5: Number, a4: Number }, // tấm sticker A5 / A4 mua thêm
    preview: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' }, // ảnh mockup PNG mặt trước
    previewBack: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' }, // ảnh mockup PNG mặt sau
    customer: { name: String, phone: String, province: String, address: String, note: String },
    delivery: { type: String, enum: ['giao-hang', 'studio'] },
    payment: { type: String, enum: ['cod', 'chuyen-khoan', 'vi-dien-tu'] },
    voucher: String,
    totals: {
      unit: Number,
      itemTotal: Number,
      stickerTotal: Number, // đơn cũ
      customTotal: Number, // đơn cũ
      sheetTotal: Number,
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
