import { connectDB } from '@/lib/mongodb'
import { getSessionUserId } from '@/lib/auth'
import { AO_SIZES, DELIVERY, PAYMENTS, PRICING, STICKER_SETS, findVoucher, quote } from '@/lib/pricing'
import Combo from '@/models/Combo'
import Order from '@/models/Order'

const PHONE_RE = /^0\d{9}$/
const SHAPES = ['star', 'heart', 'bolt', 'flower', 'smile', 'blob']
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

// Đặt áo kèm combo. Giá luôn tính lại ở server theo bảng giá, không tin số tiền từ trình duyệt.
export async function POST(req) {
  const b = await req.json().catch(() => null)
  if (!b) return bad('Dữ liệu đơn hàng không hợp lệ.')

  if (b.product !== 'ao') return bad('Hiện chỉ nhận đặt áo thun qua trang này.')
  if (!(b.combo in PRICING.combos)) return bad('Combo không hợp lệ.')
  if (!AO_SIZES.includes(b.size)) return bad('Vui lòng chọn size áo.')
  const qty = int(b.qty)
  if (!(qty >= 1 && qty <= 999)) return bad('Số lượng áo từ 1 đến 999.')
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

  let stickerSet = null
  if (b.stickerSet) {
    if (combo.method === 'screen-print') return bad('Combo này không kèm bộ sticker.')
    if (!(b.stickerSet in STICKER_SETS)) return bad('Bộ sticker không hợp lệ.')
    const sq = int(b.stickerQty)
    if (!(sq >= 1 && sq <= 999)) return bad('Số bộ sticker từ 1 đến 999.')
    stickerSet = { key: b.stickerSet, name: STICKER_SETS[b.stickerSet], qty: sq }
  }

  const design = (Array.isArray(b.design) ? b.design : [])
    .slice(0, 30)
    .filter((it) => SHAPES.includes(it?.shape))
    .map((it) => ({
      shape: it.shape,
      color: str(it.color, 40),
      label: str(it.label, 20),
      x: num(it.x, 0, 100),
      y: num(it.y, 0, 100),
      r: num(it.r, -180, 180),
      s: num(it.s, 4, 40),
    }))

  const totals = quote({
    combo: b.combo,
    qty,
    stickerQty: stickerSet?.qty ?? 0,
    delivery: b.delivery,
    voucher,
  })

  const doc = {
    user: (await getSessionUserId()) ?? undefined,
    combo: { slug: combo.slug, name: combo.name, method: combo.method },
    product: 'ao',
    size: b.size,
    qty,
    stickerSet,
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
      return Response.json({ code: order.code, totals: order.totals, status: order.status }, { status: 201 })
    } catch (err) {
      if (err?.code !== 11000) throw err
    }
  }
  return Response.json({ error: 'Chưa tạo được mã đơn, thử lại sau.' }, { status: 500 })
}
