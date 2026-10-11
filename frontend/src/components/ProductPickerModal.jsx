import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PRODUCTS, formatPrice } from '../data/products.js'
import { TeeArt, ToteArt } from './GarmentArt.jsx'
import Sticker from './Sticker.jsx'

const CHOICES = [
  { ...PRODUCTS.ao, Art: TeeArt, color: PRODUCTS.ao.colors[0], sticker: ['star', 'var(--sun)'] },
  { ...PRODUCTS.tui, Art: ToteArt, color: PRODUCTS.tui.colors[0], sticker: ['heart', 'var(--pink)'] },
]

// Bấm "Chọn Combo X" → mờ trang phía sau, hiện 2 khối áo / túi để chọn món nền.
export default function ProductPickerModal({ combo, onClose }) {
  const dialogRef = useRef(null)
  const navigate = useNavigate()

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
            Bạn muốn dán sticker lên <em>món nào</em>?
          </h2>
        </div>
        <div className="choose-grid">
          {CHOICES.map(({ key, name, blurb, Art, color, sticker }) => (
            <button key={key} type="button" className={`choose-card choose-${key}`} onClick={() => pick(key)}>
              <div className="choose-art">
                <Art fill={color.fill} seam={color.seam} />
                <Sticker
                  shape={sticker[0]}
                  color={sticker[1]}
                  className="choose-sticker"
                  style={{ width: 52 }}
                />
              </div>
              <div className="choose-copy">
                <h3>{name}</h3>
                <p>{blurb}</p>
                <span className="choose-cta">Chọn {name.toLowerCase()} →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}
