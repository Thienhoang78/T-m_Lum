import { Link } from 'react-router-dom'
import { MAX_CUSTOM_STICKERS } from '../data/consent.js'
import { PRICING, vnd } from '../data/pricing.js'
import Sticker from './Sticker.jsx'

// Giới thiệu tính năng tự tạo hình: khách tải hình của mình lên để in thành sticker (chỉ Combo 1).
const POINTS = [
  {
    shape: 'star',
    color: 'var(--sun)',
    title: 'Tải hình của bạn lên',
    body: `PNG, JPG hoặc WebP, tối đa ${MAX_CUSTOM_STICKERS} hình mỗi đơn, ${vnd(PRICING.customSticker)} / hình.`,
  },
  {
    shape: 'flower',
    color: 'var(--mint)',
    title: 'Tự tách nền, đặt lên áo',
    body: 'Hình được tách nền ngay trên máy bạn, rồi kéo thả lên áo hoặc túi trong trình phối.',
  },
  {
    shape: 'heart',
    color: 'var(--pink)',
    title: 'Cam kết bản quyền',
    body: 'Khi tải hình lên sẽ hiện mục chính sách pháp lý: bạn tự chịu trách nhiệm về bản quyền hình ảnh và ký tên đồng ý trước khi đặt.',
  },
]

export default function UploadFeature() {
  return (
    <section className="section kit-upload" id="tu-tao-hinh">
      <div className="section-head">
        <p className="eyebrow">Tính năng tự tạo hình</p>
        <h2 className="display-sm">
          Hình của bạn, <em>in lên đồ của bạn</em>.
        </h2>
        <p className="kit-upload-only">
          Chỉ có ở <strong>Combo 1</strong> của bộ kit cơ bản (áo thun trơn và túi tote trơn).
        </p>
      </div>
      <ol className="kit-upload-points">
        {POINTS.map((p) => (
          <li key={p.title}>
            <Sticker shape={p.shape} color={p.color} style={{ width: 44 }} />
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </li>
        ))}
      </ol>
      <div className="kit-hero-ctas">
        <Link to="/basic/ao" className="btn btn-dark">
          Tự tạo hình cho áo thun
        </Link>
        <Link to="/basic/tui" className="btn btn-glass">
          Tự tạo hình cho túi tote
        </Link>
      </div>
    </section>
  )
}
