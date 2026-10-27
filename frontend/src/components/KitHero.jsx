import HeroScene from './landing/HeroScene.jsx'
import StickerConfetti from './landing/StickerConfetti.jsx'

// Đầu trang: nền pastel chuyển động, tên "TÙM LUM STUDIO DIY KITS" ba màu (chữ bật lên lần lượt, "DIY Kits"
// lượn sóng), khẩu hiệu, nút; bên phải là cảnh áo + túi tote đang được ép sticker (HeroScene).
const word = (text, cls, i) => (
  <span className={`kit-word ${cls}`} style={{ '--i': i }}>
    {text}
  </span>
)

export default function KitHero() {
  return (
    <section className="kit-hero" id="top">
      <div className="hero-aurora" aria-hidden="true">
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
      </div>
      <StickerConfetti />

      <div className="kit-hero-copy">
        <h1 className="kit-title">
          {word('Tùm Lum', 't-blue', 0)} {word('Studio', 't-pink', 1)}{' '}
          <span className="kit-word t-yellow kit-wave" style={{ '--i': 2 }} aria-label="DIY Kits">
            {[...'DIY Kits'].map((ch, i) => (
              <span key={i} aria-hidden="true" style={{ '--c': i }}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </span>
        </h1>
        <p className="kit-tagline">
          <span>Good ideas brighter days</span>
        </p>
        <p className="kit-lede">
          Chọn bộ kit, chọn sticker hoặc tự tạo hình của bạn, rồi tự tay in chuyển nhiệt thành chiếc áo, chiếc
          túi không đụng hàng.
        </p>
        <div className="kit-hero-ctas">
          <a href="#combo" className="btn btn-dark">
            Xem bảng giá bộ kit
          </a>
          <a href="#tu-tao-hinh" className="btn btn-glass">
            Tự tạo hình của bạn
          </a>
        </div>
      </div>

      <HeroScene />
    </section>
  )
}
