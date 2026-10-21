import Sticker from './Sticker.jsx'

// Đầu trang theo bảng giá của studio: tên "TÙM LUM STUDIO DIY KITS" ba màu, khẩu hiệu trong viên thuốc.
export default function KitHero() {
  return (
    <section className="kit-hero" id="top">
      <Sticker shape="star" color="var(--sun)" className="kit-hero-deco d1" style={{ width: 58 }} />
      <Sticker shape="heart" color="var(--pink)" className="kit-hero-deco d2" style={{ width: 46 }} />
      <Sticker shape="flower" color="var(--mint)" className="kit-hero-deco d3" style={{ width: 52 }} />
      <Sticker shape="smile" color="var(--sun)" className="kit-hero-deco d4" style={{ width: 54 }} />

      <h1 className="kit-title">
        <span className="t-blue">Tùm Lum</span> <span className="t-pink">Studio</span>{' '}
        <span className="t-yellow">DIY Kits</span>
      </h1>
      <p className="kit-tagline">
        <span>Good ideas brighter days</span>
      </p>
      <p className="kit-lede">
        Chọn bộ kit, chọn sticker hoặc tự tải hình của bạn lên, rồi tự tay in chuyển nhiệt hay in lụa thành
        chiếc áo, chiếc túi không đụng hàng.
      </p>
      <div className="kit-hero-ctas">
        <a href="#combo" className="btn btn-dark">
          Xem bảng giá bộ kit
        </a>
        <a href="#tu-tao-hinh" className="btn btn-glass">
          Tự tạo hình của bạn
        </a>
      </div>
    </section>
  )
}
