import Sticker from './Sticker.jsx'

const SOON = 'Sắp có'

const COLUMNS = [
  {
    title: 'Khám phá',
    links: [
      { label: 'Cách làm', href: '#cach-lam' },
      { label: '3 combo', href: '#combo' },
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
      <div className="footer-cta">
        <div className="footer-cta-copy">
          <h2 className="display-sm">
            Ghé studio, <em>dán cho đã</em>.
          </h2>
          <p className="lede">Tạo tài khoản để lưu combo yêu thích và theo dõi đơn in của bạn.</p>
        </div>
        <button type="button" className="btn btn-light" onClick={onRegister}>
          Đăng ký tài khoản
        </button>
        <Sticker shape="smile" color="var(--sun)" className="footer-cta-sticker" style={{ width: 72 }} />
      </div>

      <div className="footer-grid">
        <div className="footer-brand">
          <p className="brand">
            <span className="brand-dot" aria-hidden="true" />
            Tùm Lum <em>Studio</em>
          </p>
          <p className="footer-blurb">Áo thun, túi tote và sticker in ép nhiệt theo ý bạn.</p>
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
                    <a href={l.href}>{l.label}</a>
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
