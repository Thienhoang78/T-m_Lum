import { Link } from 'react-router-dom'
import { COMBO_COPY, TIERS } from '../data/combos.js'
import { PRODUCTS } from '../data/products.js'
import { allowsUploads, priceOf } from '../data/pricing.js'
import { tilt } from './landing/tilt.js'

// Bảng giá bộ kit theo ảnh của studio:
//   1. Bộ kit cơ bản – in chuyển nhiệt (nền xanh nhạt): thẻ Áo thun (hồng) và Túi tote (vàng), mỗi thẻ Combo 1 / Combo 2
//   2. Bộ kit cao cấp – in lụa (nền xanh bạc hà): thẻ Áo thun cao cấp
// Nội dung lấy từ COMBO_COPY, giá lấy từ bảng giá (cùng số liệu với trang đặt hàng và backend).
const BASIC_CARDS = [
  { product: 'ao', title: 'Áo thun', tone: 'pink', art: '/images/kits/kit-ao.webp' },
  { product: 'tui', title: 'Túi tote', tone: 'yellow', art: '/images/kits/kit-tui.webp' },
]
const COMBOS = ['combo-1', 'combo-2']
// Giá viết như trên bảng giá: 299.000 VND
const vndText = (n) => `${new Intl.NumberFormat('vi-VN').format(n)} VND`

function KitHead({ tier }) {
  return (
    <h3 className="kit-panel-head">
      <span className="kit-no" aria-hidden="true">
        {tier.no}.
      </span>
      <span>
        {tier.name} <span className="kit-method">– {tier.method}</span>
      </span>
    </h3>
  )
}

function BasicCard({ product, title, tone, art, i }) {
  return (
    <article
      className={`kit-card tone-${tone}`}
      data-reveal
      style={{ '--d': `${0.12 + i * 0.12}s` }}
      {...tilt}
    >
      <span className="kit-glare" aria-hidden="true" />
      <h4 className="kit-card-name">{title}</h4>
      <div className="kit-card-body">
        <div className="kit-combos">
          {COMBOS.map((slug, i) => (
            <div key={slug} className="kit-combo">
              <span className={`kit-tag tag-${i + 1}`}>Combo {i + 1}</span>
              <p>{COMBO_COPY[slug].items[product].join(' + ')}</p>
              {allowsUploads(slug) && <span className="kit-upload-chip">Tự tải hình của bạn lên</span>}
            </div>
          ))}
        </div>
        <div className="kit-art-wrap">
          <img className="kit-art" src={art} alt="" loading="lazy" width="340" height="430" />
        </div>
      </div>
      <p className="kit-price">{vndText(priceOf(product, 'combo-1'))}</p>
      <div className="kit-card-ctas">
        {COMBOS.map((slug, i) => (
          <Link
            key={slug}
            to={`/basic/${product}${i ? `?combo=${slug}` : ''}`}
            className={`btn ${i ? 'btn-glass' : 'btn-dark'} btn-sm`}
            aria-label={`Chọn Combo ${i + 1} ${PRODUCTS[product].name.toLowerCase()}`}
          >
            Chọn Combo {i + 1}
          </Link>
        ))}
      </div>
    </article>
  )
}

export default function KitBoard() {
  return (
    <section className="kit-board-wrap" id="combo" aria-labelledby="kit-board-title">
      <h2 className="sr-only" id="kit-board-title">
        Bảng giá bộ kit
      </h2>
      <div className="kit-board">
        <div className="kit-panel panel-blue" data-reveal>
          <KitHead tier={TIERS.basic} />
          <div className="kit-cards">
            {BASIC_CARDS.map((c, i) => (
              <BasicCard key={c.product} {...c} i={i} />
            ))}
          </div>
        </div>

        <div className="kit-panel panel-mint" data-reveal style={{ '--d': '0.15s' }}>
          <KitHead tier={TIERS.premium} />
          <article className="kit-card tone-mint is-premium" data-reveal style={{ '--d': '0.35s' }} {...tilt}>
            <span className="kit-glare" aria-hidden="true" />
            <h4 className="kit-card-name">Áo thun cao cấp</h4>
            <p className="kit-premium-text">{COMBO_COPY.premium.items.ao.join(' + ')}</p>
            {/* dao gạt lướt qua khuôn in, để lại vệt mực */}
            <div className="kit-art-wrap is-screen">
              <img
                className="kit-art"
                src="/images/kits/kit-premium.webp"
                alt=""
                loading="lazy"
                width="644"
                height="247"
              />
              <span className="squeegee" aria-hidden="true">
                <span className="squeegee-ink" />
                <span className="squeegee-blade" />
              </span>
            </div>
            <p className="kit-price">{vndText(priceOf('ao', 'premium'))}</p>
            <div className="kit-card-ctas">
              <Link to="/premium" className="btn btn-dark btn-sm">
                Chọn bộ kit cao cấp
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
