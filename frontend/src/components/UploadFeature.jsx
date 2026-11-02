import { Link } from 'react-router-dom'
import { MAX_CUSTOM_STICKERS } from '../data/consent.js'
import { PRODUCTS } from '../data/products.js'
import Icon from './Icon.jsx'
import PrintArt from './landing/PrintArt.jsx'

// Giới thiệu tính năng tự tạo hình (chỉ Combo 1): bên trái tiêu đề + bốn ý chính có icon nét mảnh,
// bên phải cửa sổ "trình phối" mô phỏng chạy lặp: tải hình lên → tách nền → hình bay vào ngực áo (ảnh áo thật)
// → khung chọn có tay nắm như đang chỉnh vị trí.
const POINTS = [
  {
    icon: 'upload',
    title: 'Tải hình của bạn lên',
    body: `PNG, JPG hoặc WebP, tối đa ${MAX_CUSTOM_STICKERS} hình mỗi đơn, đã gồm trong giá Combo 1.`,
  },
  {
    icon: 'wand',
    title: 'Tự tách nền, đặt lên áo',
    body: 'Hình được tách nền ngay trên máy bạn, rồi kéo thả lên áo hoặc túi trong trình phối.',
  },
  {
    icon: 'pen',
    title: 'Hoặc vẽ tay lên áo',
    body: 'Bút mực, bút kim, bút dạ, bút chì và tẩy, vẽ thẳng lên áo hay túi, khổ tối đa A4.',
  },
  {
    icon: 'shield',
    title: 'Cam kết bản quyền',
    body: 'Khi tải hình lên sẽ hiện mục chính sách pháp lý: bạn tự chịu trách nhiệm về bản quyền hình ảnh và ký tên đồng ý trước khi đặt.',
  },
]
const TOOLS = ['upload', 'wand', 'pen', 'cursor']

function EditorMock() {
  return (
    <div className="ed fx-glow" data-reveal style={{ '--d': '0.15s' }} aria-hidden="true">
      <div className="ed-bar">
        <span className="ed-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="ed-title">Trình phối · Áo thun</span>
        <span className="ed-badge">Combo 1</span>
      </div>
      <div className="ed-body">
        <div className="ed-tools">
          {TOOLS.map((t) => (
            <span key={t} className={`ed-tool t-${t}`}>
              <Icon name={t} size={18} />
            </span>
          ))}
        </div>
        <div className="ed-canvas">
          <div className="ed-stage">
            <img
              className="ed-tee"
              src={PRODUCTS.ao.photo}
              alt=""
              width="1200"
              height="1200"
              loading="lazy"
            />
            <span className="ed-art">
              <PrintArt />
              <span className="ed-sel">
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
          </div>
          <div className="ed-file">
            <span className="ed-thumb">
              <span className="ed-thumb-bg" />
              <PrintArt />
              <span className="ed-scan" />
            </span>
            <span className="ed-file-meta">
              <b>hinh-cua-ban.png</b>
              <small>Tách nền ngay trên máy</small>
              <span className="ed-progress">
                <i />
              </span>
            </span>
          </div>
          <span className="ed-toast">
            <Icon name="check" size={16} /> Đã tách nền, kéo để đặt
          </span>
        </div>
      </div>
    </div>
  )
}

export default function UploadFeature() {
  return (
    <section className="section feat" id="tu-tao-hinh">
      <div className="feat-copy">
        <div className="section-head" data-reveal>
          <p className="eyebrow">Tính năng tự tạo hình</p>
          <h2 className="display-sm">
            Hình của bạn, <em>in{'\u00a0'}lên đồ của bạn</em>.
          </h2>
          <p className="section-lede">
            Chỉ có ở <strong>Combo 1</strong> của bộ kit cơ bản (áo thun trơn và túi tote trơn).
          </p>
        </div>
        <ul className="feat-list">
          {POINTS.map((p, i) => (
            <li key={p.title} className="fx-spot" data-reveal style={{ '--d': `${i * 0.08}s` }}>
              <span className="line-ic">
                <Icon name={p.icon} />
              </span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="feat-ctas" data-reveal>
          <Link to="/basic/ao" className="btn btn-dark btn-shine">
            Tự tạo hình cho áo thun <Icon name="arrow" size={18} className="btn-arrow" />
          </Link>
          <Link to="/basic/tui" className="btn btn-glass">
            Tự tạo hình cho túi tote
          </Link>
        </div>
      </div>
      <EditorMock />
    </section>
  )
}
