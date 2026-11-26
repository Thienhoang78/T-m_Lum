import { useEffect, useRef, useState } from 'react'
import { ORDER_STATUS, PAY_STATUS } from '../../data/orderStatus.js'

export function StatusBadge({ status }) {
  const st = ORDER_STATUS[status] ?? { label: status, tone: 'mute' }
  return <span className={`st st-${st.tone}`}>{st.label}</span>
}

export function PayBadge({ status }) {
  const st = PAY_STATUS[status] ?? PAY_STATUS['chua-thanh-toan']
  return <span className={`st st-${st.tone}`}>{st.label}</span>
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="auth-status error admin-error" role="alert">
      {error.message ?? String(error)}
      {onRetry && (
        <button type="button" className="link" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  )
}

export function Pager({ page, pages, total, onPage, unit }) {
  if (pages <= 1)
    return (
      <p className="admin-count">
        {total} {unit}
      </p>
    )
  return (
    <nav className="admin-pager" aria-label="Trang">
      <span className="admin-count">
        {total} {unit} · trang {page}/{pages}
      </span>
      <button
        type="button"
        className="btn btn-glass btn-sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ‹ Trước
      </button>
      <button
        type="button"
        className="btn btn-glass btn-sm"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Sau ›
      </button>
    </nav>
  )
}

// Nút chép (link theo dõi, số tài khoản...)
export function Copy({ text, children = 'Chép' }) {
  const [done, setDone] = useState(false)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      className="pay-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => setDone(false), 1600)
        } catch {
          // trình duyệt chặn chép: bỏ qua
        }
      }}
    >
      {done ? 'Đã chép' : children}
    </button>
  )
}

// Ô tìm kiếm: gõ xong 300 ms mới tìm
export function SearchBox({ value, onChange, label, placeholder }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  useEffect(() => {
    if (text === value) return
    const t = setTimeout(() => onChange(text), 300)
    return () => clearTimeout(t)
  }, [text, value, onChange])
  return (
    <label className="admin-search">
      <span className="sr-only">{label}</span>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input type="search" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
    </label>
  )
}

export function Select({ label, value, onChange, options }) {
  return (
    <label className="admin-select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}
