import GarmentStage from './GarmentStage.jsx'

export default function Hero() {
  return (
    <section className="hero-band" id="top">
      <div className="backdrop" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="grain" />
      </div>
      <div className="hero">
        <div className="hero-copy">
          <p className="eyebrow rise" style={{ '--i': 0 }}>
            Áo · Túi tote · Sticker ép nhiệt · In lụa
          </p>
          <h1 className="display rise" style={{ '--i': 1 }}>
            Chọn áo trơn.
            <br />
            <em>Dán cả thế giới</em> {'lên\u00a0đó.'}
          </h1>
          <p className="lede rise" style={{ '--i': 2 }}>
            Ở Tùm Lum Studio, bạn chọn áo hoặc túi tote, chọn sticker để studio in ép nhiệt lên ngay, hoặc
            mang bộ in lụa về tự tay in. Mỗi món ra về là một bản không đụng hàng.
          </p>
          <div className="hero-ctas rise" style={{ '--i': 3 }}>
            <a href="#combo" className="btn btn-dark">
              Xem gói Basic & Premium
            </a>
            <a href="#cach-lam" className="btn btn-glass">
              Cách làm
            </a>
          </div>
        </div>
        <GarmentStage />
      </div>
    </section>
  )
}
