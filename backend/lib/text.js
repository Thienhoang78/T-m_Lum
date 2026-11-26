// Tiện ích nhỏ cho dữ liệu nhập từ trình duyệt
export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export const bad = (error, status = 400) => Response.json({ error }, { status })
