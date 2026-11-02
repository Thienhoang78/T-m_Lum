import { useEffect, useRef } from 'react'
import Hero3D from './landing/Hero3D.jsx'
import StickerConfetti from './landing/StickerConfetti.jsx'
import Sparkles from './landing/Sparkles.jsx'
import RotatingWords from './landing/RotatingWords.jsx'
import Sticker from './Sticker.jsx'
import { PRICING, allowsUploads } from '../data/pricing.js'

// Đầu trang "studio về đêm": nền navy tràn viền với cực quang xanh / hồng / vàng / bạc hà trôi, lưới phối cảnh,
// hạt lấp lánh (Sparkles). Bên trái: chip khẩu hiệu, tên "TÙM LUM STUDIO DIY KITS" ba màu (chữ bật lên lần lượt,
// "DIY Kits" lượn sóng), dòng cách làm đổi luân phiên, nút, ba cam kết. Bên phải: khu trưng bày 3D (Hero3D):
// 3 mẫu áo thun + 3 mẫu túi tote, mũi tên để chuyển mẫu, kéo để xoay 360°; hai thẻ kính nổi ở góc trên.
// Khi nav còn nằm trên nền tối thì nav chuyển kính tối.
const word = (text, cls, i) => (
  <span className={`kit-word ${cls}`} style={{ '--i': i }}>
    {text}
  </span>
)
const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)} VND`
const uploadCombo = Object.keys(PRICING.items.ao).findIndex(allowsUploads) + 1

const Check = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <circle cx="10" cy="10" r="10" fill="currentColor" opacity=".18" />
    <path
      d="M6 10.4l2.6 2.6L14.2 7.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default function KitHero() {
  const ref = useRef(null)

  // nav kính tối khi còn nằm trên nền navy của đầu trang
  useEffect(() => {
    const root = document.documentElement
    let raf = 0
    const check = () => {
      raf = 0
      const r = ref.current?.getBoundingClientRect()
      root.toggleAttribute('data-nav-dark', !!r && r.bottom > 56)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      root.removeAttribute('data-nav-dark')
    }
  }, [])

  return (
    <section className="kit-hero hero-night" id="top" ref={ref}>
      <div className="hero-fx" aria-hidden="true">
        <span className="hero-orb o1" />
        <span className="hero-orb o2" />
        <span className="hero-orb o3" />
        <span className="hero-orb o4" />
        <span className="hero-grid" />
        <Sparkles />
        <span className="hero-noise" />
      </div>
      <StickerConfetti />

      <div className="kit-hero-copy">
        <p className="hero-chip">
          <span className="hero-chip-dot" aria-hidden="true" />
          Good ideas brighter days
        </p>
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
        <p className="hero-rotate">
          Một chiếc áo trắng, tùm lum cách làm:{' '}
          <RotatingWords words={['dán sticker', 'tự vẽ tay', 'in hình của bạn']} />
        </p>
        <p className="kit-lede">
          Chọn bộ kit, chọn sticker hoặc tự tạo hình của bạn, rồi tự tay in chuyển nhiệt thành chiếc áo, chiếc
          túi không đụng hàng.
        </p>
        <div className="kit-hero-ctas">
          <a href="#combo" className="btn btn-sun btn-shine">
            Xem bảng giá bộ kit
            <span className="btn-arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a href="#tu-tao-hinh" className="btn btn-ghost-dark">
            Tự tạo hình của bạn
          </a>
        </div>
        <ul className="hero-proof">
          <li>
            <Check /> Không cần máy móc
          </li>
          <li>
            <Check /> Xếp thử lên áo trước khi đặt
          </li>
          <li>
            <Check /> Miễn phí giao từ {vnd(PRICING.freeShipFrom)}
          </li>
        </ul>
      </div>

      <div className="hero-stage">
        <span className="hero-halo" aria-hidden="true" />
        <Hero3D />
        <div className="hero-chips" aria-hidden="true">
          <span className="hero-float-chip c1">
            <span className="ic">
              <Sticker shape="star" color="var(--sun)" style={{ width: 22 }} />
            </span>
            <span>
              Combo {uploadCombo}
              <small>Tự tải hình của bạn lên</small>
            </span>
          </span>
          <span className="hero-float-chip c2">
            <span className="ic">
              <Sticker shape="heart" color="var(--pink)" style={{ width: 20 }} />
            </span>
            <span>
              Mặc thử live
              <small>Ngay trong trình phối</small>
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}
