import { Link } from 'react-router-dom'
import CartButton from './CartButton.jsx'

export default function Nav({ user, onLogin, onRegister, onLogout }) {
  return (
    <header className="nav-wrap">
      <nav className="nav glass" aria-label="Chính">
        <Link to="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          Tùm Lum <em>Studio</em>
        </Link>
        <ul className="nav-links">
          <li>
            <Link to="/#cach-lam">Cách làm</Link>
          </li>
          <li>
            <Link to="/#combo">Bảng giá</Link>
          </li>
          <li>
            <Link to="/ve-chung-toi">Về chúng tôi</Link>
          </li>
          <li>
            <a href="#lien-he">Liên hệ</a>
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
              <button type="button" className="btn btn-brand btn-sm" onClick={onRegister}>
                Đăng ký
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
