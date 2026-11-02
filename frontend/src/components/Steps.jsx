import { PRODUCTS } from '../data/products.js'
import { priceOf } from '../data/pricing.js'
import Icon from './Icon.jsx'
import PrintArt from './landing/PrintArt.jsx'

// Ba bước, mỗi bước một minh hoạ kiểu giao diện sản phẩm (ảnh áo / túi thật), chạy lặp khi cuộn tới:
// 01. hai thẻ áo / túi kèm giá thật, khung chọn chuyển qua lại; 02. thanh chọn cách tạo hình + hình in có khung chọn;
// 03. sóng nhiệt bốc lên trên hình in, vòng tiến độ ép nhiệt chạy đầy rồi báo xong.
const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`

function VisualKit() {
  return (
    <div className="fv fv-kit">
      {['ao', 'tui'].map((k) => (
        <span key={k} className={`fv-tile tile-${k}`}>
          <span className="fv-check">
            <Icon name="check" size={12} />
          </span>
          <img src={PRODUCTS[k].photo} alt="" width="240" height="240" loading="lazy" />
          <b>{PRODUCTS[k].name}</b>
          <small>{vnd(priceOf(k, 'combo-1'))}</small>
        </span>
      ))}
    </div>
  )
}

function VisualDesign() {
  return (
    <div className="fv fv-design">
      <span className="fv-seg">
        <span className="fv-seg-pill" />
        <span>Bộ sticker</span>
        <span>Tải hình</span>
        <span>Vẽ tay</span>
      </span>
      <span className="fv-tee">
        <img src={PRODUCTS.ao.photo} alt="" width="300" height="300" loading="lazy" />
        <span className="fv-art">
          <PrintArt />
          <span className="ed-sel">
            <i />
            <i />
            <i />
            <i />
          </span>
        </span>
        <span className="fv-cursor">
          <Icon name="cursor" size={18} />
        </span>
      </span>
    </div>
  )
}

function VisualPress() {
  return (
    <div className="fv fv-press">
      <span className="fv-tee">
        <img src={PRODUCTS.ao.photo} alt="" width="300" height="300" loading="lazy" />
        <span className="fv-art">
          <PrintArt />
          <span className="fv-waves">
            {[0, 1, 2].map((i) => (
              <svg key={i} viewBox="0 0 12 28" style={{ '--i': i }}>
                <path d="M6 26c-3-3.5 3-6.5 0-10s3-6.5 0-10" />
              </svg>
            ))}
          </span>
        </span>
      </span>
      <span className="fv-gauge">
        <svg className="fv-ring" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" className="track" />
          <circle cx="22" cy="22" r="18" className="bar" pathLength="100" />
        </svg>
        <Icon name="flame" size={18} />
      </span>
      <span className="fv-status">
        <span className="s-run">Đang ép nhiệt…</span>
        <span className="s-done">
          <Icon name="check" size={14} /> Hình bám chắc
        </span>
      </span>
    </div>
  )
}

const STEPS = [
  {
    title: 'Chọn bộ kit',
    body: 'Bộ kit in chuyển nhiệt với áo thun hoặc túi tote trắng, Combo 1 hoặc Combo 2, thêm tấm sticker A5 / A4 nếu thích.',
    Visual: VisualKit,
  },
  {
    title: 'Chọn sticker hoặc tự tạo hình',
    body: 'Chọn bộ sticker đi kèm, xếp thử lên áo trong trình phối; Combo 1 còn cho tải hình hoặc vẽ tay của bạn.',
    Visual: VisualDesign,
  },
  {
    title: 'In chuyển nhiệt',
    body: 'Ủi sticker lên vải theo hướng dẫn trong bộ kit: hình bám chắc, giặt đúng cách không bong.',
    Visual: VisualPress,
  },
]

export default function Steps() {
  return (
    <section className="section" id="cach-lam">
      <div className="section-head" data-reveal>
        <p className="eyebrow">Cách làm</p>
        <h2 className="display-sm">
          Ba bước, một món đồ <em>của riêng bạn</em>.
        </h2>
      </div>
      <ol className="flow">
        {STEPS.map(({ title, body, Visual }, i) => (
          <li key={title} className="flow-step fx-spot" data-reveal style={{ '--d': `${i * 0.12}s` }}>
            <div className="flow-visual" aria-hidden="true">
              <Visual />
            </div>
            <div className="flow-meta" aria-hidden="true">
              <span className="flow-no">Bước {String(i + 1).padStart(2, '0')}</span>
              <span className="flow-line" />
            </div>
            <h3>{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
