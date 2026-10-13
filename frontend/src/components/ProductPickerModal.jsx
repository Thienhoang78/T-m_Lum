import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PRODUCTS, methodOf, productFor } from '../data/products.js'
import { priceOf, vnd } from '../data/pricing.js'
import { TeeArt, ToteArt } from './GarmentArt.jsx'
import Sticker from './Sticker.jsx'

const CHOICES = [
  { product: PRODUCTS.ao, Art: TeeArt, sticker: ['star', 'var(--sun)'] },
  { product: PRODUCTS.tui, Art: ToteArt, sticker: ['heart', 'var(--pink)'] },
]

// Bấm "Chọn Basic" → mờ trang phía sau, hiện 2 khối áo / túi; chọn xong vào trang đặt hàng của món đó,
// nơi khách chọn Combo 1 hoặc Combo 2.
export default function ProductPickerModal({ tier, combos, onClose }) {
  const dialogRef = useRef(null)
  const navigate = useNavigate()
  const { note } = methodOf(combos[0])

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [])

  // Gọi onClose trực tiếp, không chờ sự kiện close của <dialog> (có trình duyệt không phát)
  function close() {
    dialogRef.current?.close()
    onClose()
  }

  function pick(key) {
    close()
    navigate(`/${tier.key}/${key}`)
  }

  const choices = CHOICES.filter(({ product }) =>
    combos.some((c) => (c.products ?? ['ao']).includes(product.key))
  )

  return (
    <dialog
      ref={dialogRef}
      className="picker"
      aria-labelledby="picker-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => e.target === dialogRef.current && close()}
    >
      <div className="picker-card">
        <button type="button" className="auth-close" aria-label="Đóng" onClick={close}>
          ×
        </button>
        <div className="picker-head">
          <p className="eyebrow">
            Gói {tier.name} · {combos.map((c) => c.name).join(' hoặc ')}
          </p>
          <h2 className="display-sm" id="picker-title">
            Bạn muốn dán sticker lên <em>món nào</em>?
          </h2>
        </div>
        <div className="choose-grid">
          {choices.map(({ product, Art, sticker }) => {
            const { key, name, colors } = productFor(product, combos[0])
            const prices = combos.map((c) => priceOf(key, c.slug)).filter((p) => p != null)
            return (
              <button
                key={key}
                type="button"
                className={`choose-card choose-${key}`}
                onClick={() => pick(key)}
              >
                <div className="choose-art">
                  <Art fill={colors[0].fill} seam={colors[0].seam} />
                  <Sticker
                    shape={sticker[0]}
                    color={sticker[1]}
                    className="choose-sticker"
                    style={{ width: 52 }}
                  />
                </div>
                <div className="choose-copy">
                  <h3>{name}</h3>
                  {prices.length > 0 && <p className="choose-price">{vnd(Math.min(...prices))}</p>}
                  <ul className="choose-items" aria-label={`Gói ${tier.name} cho ${name.toLowerCase()}`}>
                    {combos.map((c) => (
                      <li key={c.slug}>
                        {c.name}: {c.tagline}
                      </li>
                    ))}
                  </ul>
                  {note && <p className="combo-note">{note}</p>}
                  <span className="choose-cta">Chọn {name.toLowerCase()} →</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </dialog>
  )
}
