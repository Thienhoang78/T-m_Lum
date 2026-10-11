import { useEffect, useState } from 'react'
import { fetchCombos } from '../api.js'
import { PLACEHOLDER_COMBOS } from '../data/combos.js'
import Sticker from './Sticker.jsx'

const ACCENT = {
  sun: ['var(--sun)', 'star'],
  pink: ['var(--pink)', 'heart'],
  sky: ['var(--sky)', 'bolt'],
  mint: ['var(--mint)', 'flower'],
}

const formatPrice = (p) => (p == null ? 'Giá: chờ cập nhật' : `${new Intl.NumberFormat('vi-VN').format(p)}₫`)

export default function Combos() {
  const [combos, setCombos] = useState(PLACEHOLDER_COMBOS)

  useEffect(() => {
    fetchCombos().then(setCombos)
  }, [])

  const hasPlaceholder = combos.some((c) => c.placeholder)

  return (
    <section className="section" id="combo">
      <div className="section-head">
        <p className="eyebrow">Combo</p>
        <h2 className="display-sm">
          3 combo để bắt đầu <em>tùm lum</em>.
        </h2>
        {hasPlaceholder && (
          <p className="placeholder-note">
            Nội dung mẫu: tên, giá và thành phần combo sẽ được thay khi có thông tin thật.
          </p>
        )}
      </div>
      <div className="combos">
        {combos.map((c) => {
          const [color, shape] = ACCENT[c.accent] ?? ACCENT.sun
          return (
            <article
              key={c.slug}
              className={`combo${c.featured ? ' featured' : ''}`}
              style={{ '--accent': color }}
            >
              <Sticker shape={shape} color={color} className="combo-sticker" style={{ width: 64 }} />
              {c.featured && <span className="badge">Được chọn nhiều</span>}
              <h3 className="combo-name">{c.name}</h3>
              <p className="combo-tag">{c.tagline}</p>
              <p className="combo-price">{formatPrice(c.price)}</p>
              <ul className="combo-items">
                {c.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              <a href="#lien-he" className={`btn ${c.featured ? 'btn-light' : 'btn-glass'} btn-block`}>
                Chọn {c.name}
              </a>
            </article>
          )
        })}
      </div>
    </section>
  )
}
