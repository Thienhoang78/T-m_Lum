import { connectDB } from '@/lib/mongodb'
import { getSessionUserId } from '@/lib/auth'
import {
  DELIVERY,
  PATTERN_COLOR,
  PAYMENTS,
  PRICING,
  PRODUCT_RULES,
  STICKER_SETS,
  findVoucher,
  priceOf,
  quote,
} from '@/lib/pricing'
import { WAIVER_VERSION, waiverText } from '@/lib/consent'
import Combo from '@/models/Combo'
import Order from '@/models/Order'
import Upload from '@/models/Upload'
import mongoose from 'mongoose'

const PHONE_RE = /^0\d{9}$/
const SHAPES = ['star', 'heart', 'bolt', 'flower', 'smile', 'blob']
const MAX_CUSTOM = 5
const bad = (error) => Response.json({ error }, { status: 400 })
const int = (v) => (Number.isInteger(v) ? v : NaN)
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const num = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0))

function orderCode() {
  const d = new Date()
  const ymd = [d.getFullYear() % 100, d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0'))
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')
  return `TL-${ymd.join('')}-${rand}`
}

// Đặt áo hoặc túi theo gói Basic (Combo 1, 2) / Premium. Giá luôn tính lại ở server, không tin số tiền từ trình duyệt.
export async function POST(req) {
  const b = await req.json().catch(() => null)
  if (!b) return bad('Dữ liệu đơn hàng không hợp lệ.')

  const rules = PRODUCT_RULES[b.product]
  if (!rules) return bad('Món hàng không hợp lệ.')
  if (!Object.values(PRICING.items).some((m) => b.combo in m)) return bad('Combo không còn bán.')
  if (priceOf(b.product, b.combo) == null) return bad(`Gói này không có ${rules.name.toLowerCase()}.`)
  if (!rules.sizes.includes(b.size)) return bad('Vui lòng chọn size.')
  const qty = int(b.qty)
  if (!(qty >= 1 && qty <= 999)) return bad('Số lượng từ 1 đến 999.')
  if (!(b.delivery in DELIVERY)) return bad('Chọn hình thức nhận hàng.')
  if (!(b.payment in PAYMENTS)) return bad('Chọn phương thức thanh toán.')

  const name = str(b.customer?.name, 80)
  const phone = str(b.customer?.phone, 20).replace(/\s/g, '')
  const address = str(b.customer?.address, 300)
  if (!name) return bad('Vui lòng nhập họ tên người nhận.')
  if (!PHONE_RE.test(phone)) return bad('Số điện thoại gồm 10 số, bắt đầu bằng 0.')
  if (b.delivery === 'giao-hang' && !address) return bad('Vui lòng nhập địa chỉ nhận hàng.')

  const voucher = b.voucher ? str(b.voucher, 30).toUpperCase() : null
  if (voucher && !findVoucher(voucher)) return bad('Mã giảm giá không tồn tại.')

  await connectDB()
  const combo = await Combo.findOne({ slug: b.combo, active: true }).lean()
  if (!combo) return bad('Combo không còn bán.')
  if (combo.products?.length && !combo.products.includes(b.product))
    return bad(`Gói này không có ${rules.name.toLowerCase()}.`)
  const colors = combo.patterned ? [PATTERN_COLOR] : rules.colors
  const color = b.color ?? colors[0]
  if (!colors.includes(color)) return bad('Màu không hợp lệ.')

  let stickerSet = null
  if (b.stickerSet) {
    if (combo.method === 'screen-print') return bad('Combo này không kèm bộ sticker.')
    if (!(b.stickerSet in STICKER_SETS)) return bad('Bộ sticker không hợp lệ.')
    const sq = int(b.stickerQty)
    if (!(sq >= 1 && sq <= 999)) return bad('Số bộ sticker từ 1 đến 999.')
    stickerSet = { key: b.stickerSet, name: STICKER_SETS[b.stickerSet], qty: sq }
  }

  // Sticker khách tự tải lên: chỉ gói ép nhiệt, tối đa 5 hình, bắt buộc ký cam kết bản quyền
  const ids = Array.isArray(b.customStickers) ? b.customStickers : []
  let customStickers = []
  let waiver
  if (ids.length) {
    if (combo.method === 'screen-print') return bad('Gói này không nhận sticker tự tải lên.')
    if (ids.length > MAX_CUSTOM) return bad(`Tối đa ${MAX_CUSTOM} sticker tự tải lên mỗi đơn.`)
    if (!ids.every((id) => mongoose.isValidObjectId(id)) || new Set(ids).size !== ids.length)
      return bad('Sticker tải lên không hợp lệ.')
    const files = await Upload.find({ _id: { $in: ids }, order: null }).lean()
    if (files.length !== ids.length) return bad('Có sticker tải lên đã hết hạn, vui lòng tải lại.')
    const signedName = str(b.waiver?.signedName, 80)
    if (b.waiver?.accepted !== true || !signedName)
      return bad('Cần đồng ý và ký tên vào cam kết bản quyền trước khi dùng sticker tự tải lên.')
    if (b.waiver?.version !== WAIVER_VERSION) return bad('Cam kết đã được cập nhật, vui lòng tải lại trang.')
    const byId = new Map(files.map((f) => [String(f._id), f]))
    customStickers = ids.map((id) => ({ upload: id, name: byId.get(id).name, size: byId.get(id).size }))
    waiver = {
      accepted: true,
      signedName,
      version: WAIVER_VERSION,
      text: waiverText(),
      signedAt: new Date(),
      ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || undefined,
      userAgent: str(req.headers.get('user-agent') ?? '', 300) || undefined,
    }
  }

  const design = (Array.isArray(b.design) ? b.design : [])
    .slice(0, 30)
    .filter(
      (it) =>
        SHAPES.includes(it?.shape) ||
        (Number.isInteger(it?.upload) && it.upload >= 0 && it.upload < customStickers.length)
    )
    .map((it) => ({
      ...(Number.isInteger(it.upload) && !SHAPES.includes(it.shape)
        ? { upload: it.upload }
        : { shape: it.shape, color: str(it.color, 40), label: str(it.label, 20) }),
      x: num(it.x, 0, 100),
      y: num(it.y, 0, 100),
      r: num(it.r, -180, 180),
      s: num(it.s, 4, 40),
    }))

  const totals = quote({
    product: b.product,
    combo: b.combo,
    qty,
    stickerQty: stickerSet?.qty ?? 0,
    customQty: customStickers.length,
    delivery: b.delivery,
    voucher,
  })

  const doc = {
    user: (await getSessionUserId()) ?? undefined,
    combo: { slug: combo.slug, name: combo.name, tier: combo.tier, method: combo.method },
    product: b.product,
    color,
    size: b.size,
    qty,
    stickerSet,
    customStickers,
    waiver,
    design,
    customer: {
      name,
      phone,
      address: b.delivery === 'giao-hang' ? address : '',
      note: str(b.customer?.note, 500),
    },
    delivery: b.delivery,
    payment: b.payment,
    voucher,
    totals,
  }

  // Mã đơn ngẫu nhiên, thử lại nếu trùng
  for (let i = 0; i < 5; i++) {
    try {
      const order = await Order.create({ ...doc, code: orderCode() })
      // Gắn file vào đơn và bỏ hạn tự xoá
      if (customStickers.length)
        await Upload.updateMany(
          { _id: { $in: ids } },
          { $set: { order: order.code }, $unset: { expiresAt: '' } }
        )
      return Response.json({ code: order.code, totals: order.totals, status: order.status }, { status: 201 })
    } catch (err) {
      if (err?.code !== 11000) throw err
    }
  }
  return Response.json({ error: 'Chưa tạo được mã đơn, thử lại sau.' }, { status: 500 })
}
