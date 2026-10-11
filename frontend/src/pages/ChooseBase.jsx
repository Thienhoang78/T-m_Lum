import { Link, useParams } from 'react-router-dom'
import { useCombos } from '../data/useCombos.js'
import { PRODUCTS, formatPrice } from '../data/products.js'
import { TeeArt, ToteArt } from '../components/GarmentArt.jsx'
import Sticker from '../components/Sticker.jsx'
import ComboMissing from './ComboMissing.jsx'

const CHOICES = [
  { ...PRODUCTS.ao, Art: TeeArt, color: PRODUCTS.ao.colors[0], sticker: ['star', 'var(--sun)'] },
  { ...PRODUCTS.tui, Art: ToteArt, color: PRODUCTS.tui.colors[0], sticker: ['heart', 'var(--pink)'] },
]

export default function ChooseBase() {
  const { slug } = useParams()
  const combo = useCombos().find((c) => c.slug === slug)
  if (!combo) return <ComboMissing />

  return (
    <section className="page choose">
      <Link to="/#combo" className="back-link">
        ← Quay lại combo
      </Link>
      <div className="section-head">
        <p className="eyebrow">
          {combo.name} · {formatPrice(combo.price)}
        </p>
        <h1 className="display-sm">
          Bạn muốn dán sticker lên <em>món nào</em>?
        </h1>
        <p className="lede">Chọn món nền trước, sau đó chọn màu, size, mặt in và số lượng.</p>
      </div>
      <div className="choose-grid">
        {CHOICES.map(({ key, name, blurb, Art, color, sticker }) => (
          <Link key={key} to={`/combo/${slug}/${key}`} className={`choose-card choose-${key}`}>
            <div className="choose-art">
              <Art fill={color.fill} seam={color.seam} />
              <Sticker
                shape={sticker[0]}
                color={sticker[1]}
                className="choose-sticker"
                style={{ width: 56 }}
              />
            </div>
            <div className="choose-copy">
              <h2>{name}</h2>
              <p>{blurb}</p>
              <span className="choose-cta">Chọn {name.toLowerCase()} →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
