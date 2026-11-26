import mongoose from 'mongoose'

const DesignItemSchema = new mongoose.Schema(
  // upload: vị trí trong customStickers khi là sticker khách tự tải lên
  // set: bộ sticker của sticker thư viện; art: mã sticker cắt từ tấm của bộ (vd. 'an-vat-03')
  {
    side: { type: String, enum: ['front', 'back'], default: 'front' }, // mặt trước / mặt sau
    art: String,
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
        drawn: Boolean, // hình khách tự vẽ trong trình phối
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
    // khung in khổ A4 từng mặt (sticker nằm trong khung này): 'doc' 21 × 29,7 cm, 'ngang' 29,7 × 21 cm
    printFrame: {
      front: { type: String, enum: ['doc', 'ngang'] },
      back: { type: String, enum: ['doc', 'ngang'] },
    },
    // Combo 1: cách làm sticker khách chọn: 've' (tự vẽ), 'tai-len' (tải hình), 'bo-sticker' (bộ có sẵn)
    choice: { type: String, enum: ['ve', 'tai-len', 'bo-sticker'] },
    // tấm sticker A5 / A4 mua thêm: in lại đúng nội dung đã chọn (Combo 1) theo khổ
    sheets: { a5: Number, a4: Number },
    // Combo 2: nội dung từng khổ tấm mua thêm: 'combo' (bộ đi kèm) hoặc khoá bộ sticker của shop
    sheetSets: { a5: String, a4: String },
    preview: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' }, // ảnh mockup PNG mặt trước
    previewBack: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' }, // ảnh mockup PNG mặt sau
    customer: { name: String, phone: String, province: String, address: String, note: String },
    delivery: { type: String, enum: ['giao-hang', 'studio'] },
    // nơi nhận khách ghim trên bản đồ + khoảng cách đường chim bay tới studio (km), dùng cho miễn phí giao gần studio
    deliveryGeo: { lat: Number, lng: Number, km: Number },
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
      nearby: Boolean, // miễn phí giao vì nơi nhận trong bán kính quanh studio
      distanceKm: Number,
    },
    status: {
      type: String,
      enum: ['cho-xac-nhan', 'dang-lam', 'dang-giao', 'hoan-tat', 'da-huy'],
      default: 'cho-xac-nhan',
    },
    // Mã bí mật trong link theo dõi đơn gửi cho khách (/don-hang/<mã đơn>?k=...)
    accessKey: { type: String, select: false },
    // Thanh toán: tính lại từ các giao dịch (collection payments) mỗi khi có giao dịch mới, xem lib/payments.js
    paymentStatus: {
      type: String,
      enum: ['chua-thanh-toan', 'mot-phan', 'da-thanh-toan', 'hoan-tien'],
      default: 'chua-thanh-toan',
    },
    paidAmount: { type: Number, default: 0 },
    paidAt: Date,
    // Nhật ký xử lý đơn trong trang quản lý (đổi trạng thái, ghi chú nội bộ, thanh toán)
    history: [
      {
        _id: false,
        at: { type: Date, default: Date.now },
        by: String,
        action: String, // 'trang-thai' | 'ghi-chu' | 'thanh-toan'
        from: String,
        to: String,
        note: String,
      },
    ],
  },
  { timestamps: true }
)
OrderSchema.index({ 'customer.phone': 1, createdAt: -1 })
OrderSchema.index({ createdAt: -1 })

export default mongoose.models.Order || mongoose.model('Order', OrderSchema)
