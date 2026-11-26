import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { requireStaff } from '@/lib/admin'
import { PHONE_RE, VIP_FROM, normPhone, refreshCustomer } from '@/lib/customers'
import { orderSummary } from '@/lib/orderView'
import { bad, str } from '@/lib/text'
import Customer from '@/models/Customer'
import Order from '@/models/Order'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NOTE_KINDS = ['ghi-chu', 'goi-dien', 'nhan-tin', 'gap']
const phoneParam = async (params) => normPhone(decodeURIComponent((await params).phone))

async function profile(phone) {
  const customer = await Customer.findOne({ phone }).lean()
  if (!customer) return null
  const [orders, account] = await Promise.all([
    Order.find({ 'customer.phone': phone }).sort({ createdAt: -1 }).limit(100).lean(),
    customer.user ? User.findById(customer.user).select('name email phone createdAt').lean() : null,
  ])
  customer.notes = (customer.notes ?? []).sort((a, b) => b.at - a.at)
  return { customer, orders: orders.map(orderSummary), account, vipFrom: VIP_FROM }
}

// Hồ sơ một khách: thông tin, nhãn, ghi chú chăm sóc, lịch sử đơn, tài khoản (nếu có)
export async function GET(req, { params }) {
  const { denied } = await requireStaff(req)
  if (denied) return denied
  await connectDB()
  const phone = await phoneParam(params)
  await refreshCustomer(phone)
  const data = await profile(phone)
  return data ? Response.json(data) : bad('Không tìm thấy khách hàng.', 404)
}

// Sửa hồ sơ: { name?, email?, address?, tags?, followUpAt? (yyyy-mm-dd | null), note?: { kind, text }, removeNote?: id }
export async function PATCH(req, { params }) {
  const { staff, denied } = await requireStaff(req)
  if (denied) return denied
  const phone = await phoneParam(params)
  if (!PHONE_RE.test(phone)) return bad('Không tìm thấy khách hàng.', 404)
  const b = await req.json().catch(() => ({}))
  const set = {}
  const update = {}

  if (b.name !== undefined) {
    if (!str(b.name, 80)) return bad('Tên khách không được trống.')
    set.name = str(b.name, 80)
  }
  if (b.email !== undefined) {
    const email = str(b.email, 120).toLowerCase()
    if (email && !EMAIL_RE.test(email)) return bad('Email chưa đúng định dạng.')
    set.email = email
  }
  if (b.address !== undefined) set.address = str(b.address, 300)
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags)) return bad('Nhãn không hợp lệ.')
    set.tags = [...new Set(b.tags.map((t) => str(t, 30)).filter(Boolean))].slice(0, 12)
  }
  if (b.followUpAt !== undefined) {
    if (b.followUpAt === null || b.followUpAt === '') set.followUpAt = null
    else if (/^\d{4}-\d{2}-\d{2}$/.test(b.followUpAt))
      set.followUpAt = new Date(`${b.followUpAt}T09:00:00+07:00`) // 9 giờ sáng giờ Việt Nam
    else return bad('Ngày hẹn không hợp lệ.')
  }
  if (Object.keys(set).length) update.$set = set
  if (b.note !== undefined) {
    const text = str(b.note?.text, 1000)
    if (!text) return bad('Nhập nội dung ghi chú.')
    const kind = NOTE_KINDS.includes(b.note?.kind) ? b.note.kind : 'ghi-chu'
    update.$push = { notes: { at: new Date(), by: staff.name, kind, text } }
  }
  if (b.removeNote !== undefined) {
    if (update.$push) return bad('Thêm và xoá ghi chú trong hai lần khác nhau.')
    if (!mongoose.isValidObjectId(b.removeNote)) return bad('Ghi chú không hợp lệ.')
    update.$pull = { notes: { _id: b.removeNote } }
  }
  if (!Object.keys(update).length) return bad('Không có gì thay đổi.')

  await connectDB()
  const res = await Customer.updateOne({ phone }, update)
  if (!res.matchedCount) return bad('Không tìm thấy khách hàng.', 404)
  return Response.json(await profile(phone))
}
