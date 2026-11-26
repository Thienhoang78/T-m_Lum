import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import CartButton from './CartButton.jsx'

// Menu tài khoản: đơn của tôi, trang quản lý (tài khoản admin), đăng xuất
function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="cart" ref={ref}>
      <button
        type="button"
        className="nav-login acct-btn"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Chào, {user.name.split(' ').pop()}
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="cart-panel acct-panel">
          <p className="acct-who">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </p>
          <Link to="/don-hang" className="acct-link">
            Đơn hàng của tôi
          </Link>
          {user.role === 'admin' && (
            <Link to="/quan-ly" className="acct-link">
              Trang quản lý (CRM)
            </Link>
          )}
          <button
            type="button"
            className="acct-link"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}

// Nav kính dính trên cùng. Rê chuột / tab qua các link thì một viên sáng trượt theo link đó.
// Trên nền tối của đầu trang chủ (html[data-nav-dark]) nav chuyển sang kính tối.
export default function Nav({ user, onLogin, onRegister, onLogout }) {
  const [pill, setPill] = useState({ x: 0, w: 0, on: false })
  const point = (e) => {
    const a = e.currentTarget
    setPill({ x: a.offsetLeft, w: a.offsetWidth, on: true })
  }
  const hide = () => setPill((p) => ({ ...p, on: false }))
  const linkProps = { onPointerEnter: point, onFocus: point, onBlur: hide }

  return (
    <header className="nav-wrap">
      <nav className="nav glass" aria-label="Chính">
        <Link to="/" className="brand">
          <img className="brand-logo" src="/brand/logo-128.webp" alt="" width="44" height="44" />
          <span className="brand-name">
            Tùm Lum <em>Studio</em>
          </span>
        </Link>
        <ul className="nav-links" onPointerLeave={hide}>
          <li
            className={`nav-pill${pill.on ? ' is-on' : ''}`}
            style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
            aria-hidden="true"
          />
          <li>
            <Link to="/#cach-lam" {...linkProps}>
              Cách làm
            </Link>
          </li>
          <li>
            <Link to="/#combo" {...linkProps}>
              Bảng giá
            </Link>
          </li>
          <li>
            <Link to="/ve-chung-toi" {...linkProps}>
              Về chúng tôi
            </Link>
          </li>
          <li>
            <a href="#lien-he" {...linkProps}>
              Liên hệ
            </a>
          </li>
        </ul>
        <div className="nav-actions">
          <CartButton />
          {user ? (
            <AccountMenu user={user} onLogout={onLogout} />
          ) : (
            <>
              <button type="button" className="nav-login" onClick={onLogin}>
                Đăng nhập
              </button>
              <button type="button" className="btn btn-brand btn-sm btn-shine" onClick={onRegister}>
                Đăng ký
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
