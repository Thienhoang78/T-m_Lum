import { useEffect, useRef, useState } from 'react'
import { login, register, OfflineError } from '../api.js'
import Sticker from './Sticker.jsx'

const EMPTY = { name: '', email: '', phone: '', password: '', confirm: '' }

function validate(mode, f) {
  const e = {}
  if (mode === 'register' && !f.name.trim()) e.name = 'Nhập họ tên của bạn.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Email chưa đúng định dạng.'
  if (mode === 'register' && f.phone && !/^0\d{9}$/.test(f.phone.replace(/\s/g, '')))
    e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0.'
  if (f.password.length < (mode === 'register' ? 8 : 1))
    e.password = mode === 'register' ? 'Mật khẩu cần ít nhất 8 ký tự.' : 'Nhập mật khẩu.'
  if (mode === 'register' && f.confirm !== f.password) e.confirm = 'Mật khẩu nhập lại chưa khớp.'
  return e
}

export default function AuthModal({ mode, onModeChange, onClose, onAuthed }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null) // { type: 'error' | 'info', text }
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef(null)

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [])

  useEffect(() => {
    setErrors({})
    setStatus(null)
  }, [mode])

  const set = (k) => (ev) => setForm({ ...form, [k]: ev.target.value })

  async function submit(ev) {
    ev.preventDefault()
    const e = validate(mode, form)
    setErrors(e)
    setStatus(null)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const user =
        mode === 'register'
          ? await register({ name: form.name, email: form.email, phone: form.phone, password: form.password })
          : await login({ email: form.email, password: form.password })
      onAuthed(user)
    } catch (err) {
      setStatus(
        err instanceof OfflineError
          ? {
              type: 'info',
              text: 'Bản xem trước chưa nối với máy chủ nên chưa tạo hay kiểm tra được tài khoản. Dữ liệu bạn nhập đã hợp lệ.',
            }
          : { type: 'error', text: err.message }
      )
    } finally {
      setBusy(false)
    }
  }

  const isReg = mode === 'register'
  const field = (id, label, type, extra = {}) => (
    <div className="field">
      <label htmlFor={`auth-${id}`}>{label}</label>
      <input
        id={`auth-${id}`}
        type={type}
        value={form[id]}
        onChange={set(id)}
        aria-invalid={!!errors[id]}
        aria-describedby={errors[id] ? `auth-${id}-err` : undefined}
        {...extra}
      />
      {errors[id] && (
        <p className="field-err" id={`auth-${id}-err`}>
          {errors[id]}
        </p>
      )}
    </div>
  )

  return (
    <dialog
      ref={dialogRef}
      className="auth"
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
    >
      <div className="auth-card">
        <Sticker
          shape={isReg ? 'heart' : 'star'}
          color={isReg ? 'var(--pink)' : 'var(--sun)'}
          className="auth-sticker"
          style={{ width: 44 }}
        />
        <button
          type="button"
          className="auth-close"
          aria-label="Đóng"
          onClick={() => dialogRef.current.close()}
        >
          ×
        </button>

        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={!isReg} onClick={() => onModeChange('login')}>
            Đăng nhập
          </button>
          <button type="button" role="tab" aria-selected={isReg} onClick={() => onModeChange('register')}>
            Đăng ký
          </button>
        </div>

        <h2 className="display-sm auth-title">
          {isReg ? (
            <>
              Tạo tài khoản <em>tùm lum</em>
            </>
          ) : (
            <>
              Chào bạn <em>quay lại</em>
            </>
          )}
        </h2>
        <p className="auth-sub">
          {isReg
            ? 'Lưu combo yêu thích và theo dõi đơn in của bạn.'
            : 'Đăng nhập để xem đơn và combo đã lưu.'}
        </p>

        <form className="auth-form" onSubmit={submit} noValidate>
          {isReg && field('name', 'Họ tên', 'text', { autoComplete: 'name' })}
          {field('email', 'Email', 'email', { autoComplete: 'email', inputMode: 'email' })}
          {isReg &&
            field('phone', 'Số điện thoại (không bắt buộc)', 'tel', {
              autoComplete: 'tel',
              inputMode: 'tel',
            })}
          {field('password', 'Mật khẩu', 'password', {
            autoComplete: isReg ? 'new-password' : 'current-password',
          })}
          {isReg && field('confirm', 'Nhập lại mật khẩu', 'password', { autoComplete: 'new-password' })}

          {status && (
            <p className={`auth-status ${status.type}`} role="status">
              {status.text}
            </p>
          )}

          <button type="submit" className="btn btn-light btn-block" disabled={busy}>
            {busy ? 'Đang xử lý…' : isReg ? 'Tạo tài khoản' : 'Đăng nhập'}
          </button>
        </form>

        <p className="auth-switch">
          {isReg ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
          <button type="button" className="link" onClick={() => onModeChange(isReg ? 'login' : 'register')}>
            {isReg ? 'Đăng nhập' : 'Đăng ký ngay'}
          </button>
        </p>
      </div>
    </dialog>
  )
}
