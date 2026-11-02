import { useState } from 'react'
import { Link } from 'react-router-dom'
import CartButton from './CartButton.jsx'

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
            <>
              <span className="nav-user">Chào, {user.name.split(' ').pop()}</span>
              <button type="button" className="btn btn-glass btn-sm" onClick={onLogout}>
                Đăng xuất
              </button>
            </>
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
