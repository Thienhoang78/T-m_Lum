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
