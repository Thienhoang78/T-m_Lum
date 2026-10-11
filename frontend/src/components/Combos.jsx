import { useState } from 'react'
import { useCombos } from '../data/useCombos.js'
import { formatPrice, methodOf } from '../data/products.js'
import Sticker from './Sticker.jsx'
import ProductPickerModal from './ProductPickerModal.jsx'

const ACCENT = {
  sun: ['var(--sun)', 'star'],
  pink: ['var(--pink)', 'heart'],
  sky: ['var(--brand-strong)', 'bolt'],
  mint: ['var(--mint)', 'flower'],
}

export default function Combos() {
  const combos = useCombos()
  const [picking, setPicking] = useState(null)

  const hasPending = combos.some((c) => c.placeholder || c.price == null)

  return (
    <section className="section" id="combo">
      <div className="section-head">
        <p className="eyebrow">Combo</p>
        <h2 className="display-sm">
          3 combo để bắt đầu <em>tùm lum</em>.
        </h2>
        {hasPending && (
          <p className="placeholder-note">Tên và giá combo sẽ được cập nhật khi có thông tin thật.</p>
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
                {(c.summary ?? (Array.isArray(c.items) ? c.items : [])).map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              {methodOf(c).note && <p className="combo-note">{methodOf(c).note}</p>}
              <button
                type="button"
                className={`btn ${c.featured ? 'btn-dark' : 'btn-glass'} btn-block`}
                onClick={() => setPicking(c)}
              >
                Chọn {c.name}
              </button>
            </article>
          )
        })}
      </div>
      {picking && <ProductPickerModal combo={picking} onClose={() => setPicking(null)} />}
    </section>
  )
}
