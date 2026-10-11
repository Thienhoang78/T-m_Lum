export default function Nav({ user, onLogin, onRegister, onLogout }) {
  return (
    <header className="nav-wrap">
      <nav className="nav glass" aria-label="Chính">
        <a href="#top" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          Tùm Lum <em>Studio</em>
        </a>
        <ul className="nav-links">
          <li>
            <a href="#cach-lam">Cách làm</a>
          </li>
          <li>
            <a href="#combo">Combo</a>
          </li>
          <li>
            <a href="#lien-he">Liên hệ</a>
          </li>
        </ul>
        <div className="nav-actions">
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
              <button type="button" className="btn btn-light btn-sm" onClick={onRegister}>
                Đăng ký
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
