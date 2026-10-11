import { Link, useParams } from 'react-router-dom'
import Sticker from '../components/Sticker.jsx'

export default function StickerSoon() {
  const { slug, product } = useParams()
  return (
    <section className="page missing">
      <Sticker shape="flower" color="var(--mint)" style={{ width: 72 }} />
      <p className="eyebrow">Bước tiếp theo</p>
      <h1 className="display-sm">
        Kho sticker đang được <em>dọn kệ</em>.
      </h1>
      <p className="lede">
        Bộ chọn sticker sẽ có ở bản tiếp theo. Bây giờ bạn có thể thêm món vào giỏ và chọn sticker tại studio.
      </p>
      <Link to={`/combo/${slug}/${product}`} className="btn btn-brand">
        ← Quay lại chọn món
      </Link>
    </section>
  )
}
