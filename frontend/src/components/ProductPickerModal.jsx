import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PRODUCTS, contentsOf, formatPrice, methodOf, productFor } from '../data/products.js'
import { TeeArt, ToteArt } from './GarmentArt.jsx'
import Sticker from './Sticker.jsx'

const CHOICES = [
  { product: PRODUCTS.ao, Art: TeeArt, sticker: ['star', 'var(--sun)'] },
  { product: PRODUCTS.tui, Art: ToteArt, sticker: ['heart', 'var(--pink)'] },
]

// Bấm "Chọn Combo X" → mờ trang phía sau, hiện 2 khối áo / túi để chọn món nền.
export default function ProductPickerModal({ combo, onClose }) {
  const dialogRef = useRef(null)
  const navigate = useNavigate()
  const { stickers, note } = methodOf(combo)

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
    navigate(`/combo/${combo.slug}/${key}`)
  }

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
            {combo.name} · {formatPrice(combo.price)}
          </p>
          <h2 className="display-sm" id="picker-title">
            {stickers ? 'Bạn muốn dán sticker lên' : 'Bạn muốn tự in lụa lên'} <em>món nào</em>?
          </h2>
        </div>
        <div className="choose-grid">
          {CHOICES.map(({ product, Art, sticker }) => {
            const { key, name, colors } = productFor(product, combo)
            return (
              <button
                key={key}
                type="button"
                className={`choose-card choose-${key}`}
                onClick={() => pick(key)}
              >
                <div className="choose-art">
                  <Art fill={colors[0].fill} seam={colors[0].seam} pattern={combo.patterned} />
                  <Sticker
                    shape={sticker[0]}
                    color={stickers ? sticker[1] : 'var(--brand-strong)'}
                    flat={!stickers}
                    className="choose-sticker"
                    style={{ width: 52 }}
                  />
                </div>
                <div className="choose-copy">
                  <h3>{name}</h3>
                  <ul className="choose-items" aria-label={`${combo.name} gồm`}>
                    {contentsOf(combo, key).map((it) => (
                      <li key={it}>{it}</li>
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
