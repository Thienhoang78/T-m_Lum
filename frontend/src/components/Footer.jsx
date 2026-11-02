import { Link } from 'react-router-dom'

const SOON = 'Sắp có'

const COLUMNS = [
  {
    title: 'Khám phá',
    links: [
      { label: 'Cách làm', href: '/#cach-lam' },
      { label: 'Bảng giá bộ kit', href: '/#combo' },
      { label: 'Về chúng tôi', href: '/ve-chung-toi' },
      { label: 'Kho sticker', soon: true },
      { label: 'Áo & túi trơn', soon: true },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Câu hỏi thường gặp', soon: true },
      { label: 'Chính sách đổi trả', soon: true },
      { label: 'Bảng size áo', soon: true },
    ],
  },
  {
    title: 'Theo dõi',
    links: [
      { label: 'Facebook', soon: true },
      { label: 'Instagram', soon: true },
      { label: 'TikTok', soon: true },
    ],
  },
]

export default function Footer({ onRegister }) {
  return (
    <footer className="footer" id="lien-he">
      <div className="footer-cta fx-glow">
        <span className="cta-aurora" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <div className="footer-cta-copy">
          <h2 className="display-sm">
            Ghé studio, <em>dán cho đã</em>.
          </h2>
          <p className="lede">Tạo tài khoản để lưu combo yêu thích và theo dõi đơn in của bạn.</p>
        </div>
        <button type="button" className="btn btn-dark btn-shine" onClick={onRegister}>
          Đăng ký tài khoản
        </button>
        <svg className="footer-cta-spark" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id="footer-spark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffc93c" />
              <stop offset="1" stopColor="#f0609f" />
            </linearGradient>
          </defs>
          <path
            fill="url(#footer-spark)"
            d="M12 1.5c.7 5.6 4.9 9.8 10.5 10.5-5.6.7-9.8 4.9-10.5 10.5-.7-5.6-4.9-9.8-10.5-10.5C7.1 11.3 11.3 7.1 12 1.5z"
          />
        </svg>
      </div>

      <div className="footer-grid">
        <div className="footer-brand">
          <img
            className="footer-logo"
            src="/brand/logo-320.webp"
            alt="Tùm Lum Studio"
            width="132"
            height="132"
            loading="lazy"
          />
          <p className="footer-blurb">Áo thun, túi tote và sticker in chuyển nhiệt theo ý bạn.</p>
          <dl className="contact">
            <div>
              <dt>Địa chỉ</dt>
              <dd className="pending">Chờ cập nhật</dd>
            </div>
            <div>
              <dt>Giờ mở cửa</dt>
              <dd className="pending">Chờ cập nhật</dd>
            </div>
            <div>
              <dt>Hotline</dt>
              <dd className="pending">Chờ cập nhật</dd>
            </div>
          </dl>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} className="footer-col" aria-label={col.title}>
            <h3>{col.title}</h3>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.soon ? (
                    <span className="soon-link">
                      {l.label} <span className="soon">{SOON}</span>
                    </span>
                  ) : (
                    <Link to={l.href}>{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <p className="care">
        <strong>Giữ sticker bền:</strong> lộn trái áo khi giặt, dùng nước lạnh, không ủi trực tiếp lên hình
        in.
      </p>

      <p className="wordmark" aria-hidden="true">
        Tùm Lum
      </p>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Tùm Lum Studio</span>
        <a href="#top">Lên đầu trang ↑</a>
      </div>
    </footer>
  )
}
