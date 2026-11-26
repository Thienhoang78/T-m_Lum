import Customer from '@/models/Customer'
import Order from '@/models/Order'
import User from '@/models/User'

// CRM: mỗi khách là một số điện thoại. Hồ sơ khách tự tạo khi có đơn mới hoặc khi đăng ký tài khoản có số điện thoại;
// số liệu (số đơn, chi tiêu, đã trả) luôn tính lại từ đơn hàng.

export const PHONE_RE = /^0\d{9}$/
export const VIP_FROM = 1_000_000 // khách có tổng giá trị đơn từ mức này hiện nhãn VIP
export const normPhone = (v) => String(v ?? '').replace(/[\s.-]/g, '')

const EMPTY_STATS = { orders: 0, cancelled: 0, spent: 0, paid: 0, firstOrderAt: null, lastOrderAt: null }

// Tính lại số liệu của một khách từ toàn bộ đơn hàng của số điện thoại đó
export async function refreshCustomer(phone) {
  if (!phone) return
  const [s] = await Order.aggregate([
    { $match: { 'customer.phone': phone } },
    {
      $group: {
        _id: null,
        orders: { $sum: { $cond: [{ $ne: ['$status', 'da-huy'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'da-huy'] }, 1, 0] } },
        spent: { $sum: { $cond: [{ $ne: ['$status', 'da-huy'] }, { $ifNull: ['$totals.total', 0] }, 0] } },
        paid: { $sum: { $ifNull: ['$paidAmount', 0] } },
        firstOrderAt: { $min: '$createdAt' },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
  ])
  const { _id, ...stats } = s ?? EMPTY_STATS
  // chỉ cập nhật hồ sơ đã có; hồ sơ được tạo ở upsertFromOrder / upsertFromUser / syncAllCustomers
  await Customer.updateOne({ phone }, { $set: { stats } })
}

// Đơn mới: tạo hồ sơ khách nếu chưa có (tên lấy theo đơn đầu tiên, studio sửa được), cập nhật địa chỉ gần nhất,
// gắn tài khoản nếu khách đặt khi đã đăng nhập.
export async function upsertFromOrder(order) {
  const phone = order.customer?.phone
  if (!phone) return
  const set = {}
  if (order.customer.province) set.province = order.customer.province
  if (order.customer.address) set.address = order.customer.address
  if (order.user) {
    set.user = order.user
    const u = await User.findById(order.user).select('email').lean()
    if (u?.email) set.email = u.email
  }
  await Customer.updateOne(
    { phone },
    { $set: set, $setOnInsert: { name: order.customer.name } },
    { upsert: true }
  )
  await refreshCustomer(phone)
}

// Đăng ký tài khoản có số điện thoại: gắn tài khoản vào hồ sơ khách (tạo mới nếu chưa có)
export async function upsertFromUser(user) {
  const phone = normPhone(user.phone)
  if (!PHONE_RE.test(phone)) return
  await Customer.updateOne(
    { phone },
    { $set: { user: user._id, email: user.email }, $setOnInsert: { name: user.name } },
    { upsert: true }
  )
}

// Dựng lại hồ sơ khách từ toàn bộ đơn cũ và tài khoản đã có (chạy một lần sau khi bật CRM, chạy lại không sao)
export async function syncAllCustomers() {
  const latest = await Order.aggregate([
    { $match: { 'customer.phone': { $type: 'string', $ne: '' } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$customer.phone', doc: { $first: '$$ROOT' } } },
  ])
  for (const { doc } of latest) await upsertFromOrder(doc)
  const users = await User.find({ phone: { $type: 'string', $ne: '' } }).lean()
  for (const u of users) await upsertFromUser(u)
  return { customers: latest.length, users: users.length }
}
