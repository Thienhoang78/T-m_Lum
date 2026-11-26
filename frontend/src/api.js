import { PLACEHOLDER_COMBOS } from './data/combos.js'

const API = import.meta.env.VITE_API_URL ?? ''

// Lấy combo từ backend Next.js; nếu backend chưa chạy thì dùng dữ liệu mẫu.
export async function fetchCombos() {
  try {
    const res = await fetch(`${API}/api/combos`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.length ? data : PLACEHOLDER_COMBOS
  } catch {
    return PLACEHOLDER_COMBOS
  }
}

// ---------- Tài khoản ----------
export class OfflineError extends Error {}

async function authRequest(path, body) {
  let res
  try {
    res = await fetch(`${API}/api/auth/${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new OfflineError('Chưa kết nối được máy chủ.')
  }
  const data = await res.json().catch(() => {
    throw new OfflineError('Chưa kết nối được máy chủ.')
  })
  if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra, thử lại sau.')
  return data
}

export const register = (form) => authRequest('register', form).then((d) => d.user)
export const login = (form) => authRequest('login', form).then((d) => d.user)
export const logout = () => authRequest('logout', {})
export const getMe = () =>
  authRequest('me')
    .then((d) => d.user)
    .catch(() => null)

// ---------- Đơn hàng ----------
export async function createOrder(order) {
  let res
  try {
    res = await fetch(`${API}/api/orders`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    })
  } catch {
    throw new OfflineError('Chưa kết nối được máy chủ, đơn chưa được gửi.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Chưa đặt được hàng, thử lại sau.')
  return data
}

// Gọi API kèm cookie đăng nhập; lỗi có status để biết chưa đăng nhập (401) / không có quyền (403)
async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${API}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new OfflineError('Chưa kết nối được máy chủ.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Có lỗi xảy ra, thử lại sau.')
    err.status = res.status
    throw err
  }
  return data
}

// Khách xem đơn: bằng mã bí mật trong link (k), số điện thoại đặt hàng, hoặc khi đăng nhập đúng tài khoản
export function getOrder(code, { k, phone } = {}) {
  const q = new URLSearchParams()
  if (k) q.set('k', k)
  if (phone) q.set('phone', phone)
  const qs = q.toString()
  return request(`/api/orders/${encodeURIComponent(code)}${qs ? `?${qs}` : ''}`).then((d) => d.order)
}
export const myOrders = () => request('/api/orders/mine').then((d) => d.orders)
// Link theo dõi đơn gửi cho khách
export const trackUrl = (code, key) =>
  `${location.origin}/don-hang/${code}${key ? `?k=${encodeURIComponent(key)}` : ''}`

// API trang quản lý (tài khoản role admin)
export const adminApi = {
  get: (path) => request(`/api/admin/${path}`),
  patch: (path, body) => request(`/api/admin/${path}`, { method: 'PATCH', body }),
  post: (path, body) => request(`/api/admin/${path}`, { method: 'POST', body: body ?? {} }),
}
// Ảnh khách tải lên / mockup đơn (chỉ tài khoản quản lý xem được)
export const uploadUrl = (id) => `${API}/api/uploads/${id}`

// Lưu tạm ảnh áo cho live mặc thử Anywear, trả về link công khai đầy đủ (widget chỉ nhận link http/https)
export async function uploadTryOnImage(blob) {
  const body = new FormData()
  body.append('file', blob, 'tryon.jpg')
  const res = await fetch(`${API}/api/tryon`, { method: 'POST', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.path) throw new Error(data.error || 'Chưa tải được ảnh áo, thử lại sau.')
  return new URL(data.path, API || location.origin).href
}

// Tải 1 sticker khách tự làm lên server, trả về { id, name, size, type }
export async function uploadSticker(file) {
  const body = new FormData()
  body.append('file', file)
  let res
  try {
    res = await fetch(`${API}/api/uploads`, { method: 'POST', credentials: 'include', body })
  } catch {
    throw new OfflineError('Chưa kết nối được máy chủ.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Tải hình lên chưa được, thử lại sau.')
  return data
}
