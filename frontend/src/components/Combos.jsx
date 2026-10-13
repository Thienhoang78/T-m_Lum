import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCombos } from '../data/useCombos.js'
import { TIERS } from '../data/combos.js'
import { PRODUCTS, contentsOf, methodOf } from '../data/products.js'
import { PRICING, priceOf, vnd } from '../data/pricing.js'
import Sticker from './Sticker.jsx'
import ProductPickerModal from './ProductPickerModal.jsx'

const ACCENT = {
  sun: ['var(--sun)', 'star'],
  pink: ['var(--pink)', 'heart'],
  sky: ['var(--brand-strong)', 'bolt'],
  mint: ['var(--mint)', 'flower'],
}

// Giá thấp nhất của từng món trong gói (Basic: áo và túi; Premium: áo)
function pricesOf(combos) {
  const keys = [...new Set(combos.flatMap((c) => c.products ?? ['ao']))]
  return keys
    .map((k) => {
      const list = combos.map((c) => priceOf(k, c.slug)).filter((p) => p != null)
      return list.length ? { key: k, name: PRODUCTS[k].name, price: Math.min(...list) } : null
    })
    .filter(Boolean)
}

export default function Combos() {
  const combos = useCombos()
  const navigate = useNavigate()
  const [picking, setPicking] = useState(null)

  const tiers = [TIERS.basic, TIERS.premium]
    .map((tier) => ({ tier, combos: combos.filter((c) => (c.tier ?? 'basic') === tier.key) }))
    .filter((t) => t.combos.length)
  const hasSample = combos.some((c) => PRICING.sample[c.slug])

  return (
    <section className="section" id="combo">
      <div className="section-head">
        <p className="eyebrow">Gói</p>
        <h2 className="display-sm">
          {tiers.length} gói để bắt đầu <em>tùm lum</em>.
        </h2>
        {hasSample && (
          <p className="placeholder-note">Một số giá đang tạm tính, sẽ cập nhật khi có giá chính thức.</p>
        )}
      </div>
      <div className="combos combos-2">
        {tiers.map(({ tier, combos: list }) => {
          const [color, shape] = ACCENT[tier.accent] ?? ACCENT.sun
          const isBasic = tier.key === 'basic'
          const note = methodOf(list[0]).note
          return (
            <article
              key={tier.key}
              className={`combo${tier.featured ? ' featured' : ''}`}
              style={{ '--accent': color }}
            >
              <Sticker shape={shape} color={color} className="combo-sticker" style={{ width: 64 }} />
              {tier.featured && <span className="badge">Tự tay in lụa</span>}
              <h3 className="combo-name">{tier.name}</h3>
              <p className="combo-tag">{tier.tagline}</p>
              <ul className="combo-prices">
                {pricesOf(list).map((p) => (
                  <li key={p.key}>
                    <span>{p.name}</span>
                    <strong>
                      {vnd(p.price)}
                      {list.some((c) => PRICING.sample[c.slug]) && <small> tạm tính</small>}
                    </strong>
                  </li>
                ))}
              </ul>
              <ul className="combo-items">
                {isBasic
                  ? list.map((c) => (
                      <li key={c.slug}>
                        <span>
                          <strong>{c.name}:</strong> {c.tagline}
                        </span>
                      </li>
                    ))
                  : contentsOf(list[0], 'ao').map((it) => <li key={it}>{it}</li>)}
              </ul>
              {note && <p className="combo-note">{note}</p>}
              <button
                type="button"
                className={`btn ${tier.featured ? 'btn-dark' : 'btn-glass'} btn-block`}
                onClick={() => (isBasic ? setPicking({ tier, combos: list }) : navigate('/premium'))}
              >
                Chọn {tier.name}
              </button>
            </article>
          )
        })}
      </div>
      {picking && (
        <ProductPickerModal tier={picking.tier} combos={picking.combos} onClose={() => setPicking(null)} />
      )}
    </section>
  )
}
