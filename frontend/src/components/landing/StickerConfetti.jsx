import { useRef, useState } from 'react'
import Sticker from '../Sticker.jsx'

// Sticker rải quanh đầu trang: kéo đi đâu cũng được (thả ra thì "dán" lại, nảy nhẹ), rê chuột thì góc sticker
// hơi bóc lên. Chỉ để trang trí, không ảnh hưởng nội dung.
const START = [
  { shape: 'star', color: 'var(--sun)', x: 4, y: 18, w: 62, r: -14 },
  { shape: 'heart', color: 'var(--pink)', x: 90, y: 12, w: 50, r: 12 },
  { shape: 'flower', color: 'var(--mint)', x: 50, y: 7, w: 50, r: 8, wide: true },
  { shape: 'smile', color: 'var(--sun)', x: 46, y: 88, w: 50, r: -6, wide: true },
  { shape: 'bolt', color: 'var(--brand-strong)', x: 93, y: 62, w: 44, r: 16 },
]

export default function StickerConfetti() {
  const [items, setItems] = useState(START)
  const drag = useRef(null)

  function down(e, i) {
    const host = e.currentTarget.parentElement.getBoundingClientRect()
    drag.current = { i, id: e.pointerId, host }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    e.currentTarget.classList.add('is-dragging')
  }
  function move(e) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const x = Math.min(97, Math.max(3, ((e.clientX - d.host.left) / d.host.width) * 100))
    const y = Math.min(97, Math.max(3, ((e.clientY - d.host.top) / d.host.height) * 100))
    setItems((list) => list.map((it, j) => (j === d.i ? { ...it, x, y } : it)))
  }
  function up(e) {
    if (!drag.current || drag.current.id !== e.pointerId) return
    drag.current = null
    const el = e.currentTarget
    el.classList.remove('is-dragging')
    // dán xuống: nảy nhẹ
    el.classList.remove('is-stuck')
    void el.offsetWidth
    el.classList.add('is-stuck')
  }

  return (
    <div className="confetti">
      {items.map((it, i) => (
        <span
          key={i}
          className={`confetti-sticker${it.wide ? ' is-wide-only' : ''}`}
          style={{ left: `${it.x}%`, top: `${it.y}%`, width: it.w, '--r': `${it.r}deg`, '--i': i }}
          onPointerDown={(e) => down(e, i)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          title="Kéo thử sticker"
        >
          <Sticker shape={it.shape} color={it.color} />
        </span>
      ))}
    </div>
  )
}
