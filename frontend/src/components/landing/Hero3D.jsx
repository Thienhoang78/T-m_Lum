import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRODUCTS } from '../../data/products.js'
import { priceOf } from '../../data/pricing.js'
import Icon from '../Icon.jsx'
import HeroLookbook from './HeroLookbook.jsx'
import { useReducedMotion } from './useReducedMotion.js'

// Khu trưng bày 3D ở đầu trang (data/showcase3d.js, Three.js tải sau khi trang đã hiện): 3 mẫu áo thun + 3 mẫu
// túi tote theo các lựa chọn trong bảng giá. Mũi tên ← → (nút hoặc bàn phím) chuyển mẫu, kéo để xoay mẫu đang xem
// 360°, bấm mẫu bên cạnh để tới mẫu đó; bên dưới là tên, combo, giá và nút xem bộ kit.
// Máy không có WebGL thì hiện cụm ảnh người mẫu (HeroLookbook) thay thế.
const SHOWCASE = [
  { kind: 'ao', print: 'logo', combo: 'combo-1', note: 'In hình của bạn' },
  { kind: 'tui', print: 'logo', combo: 'combo-1', note: 'In hình của bạn' },
  { kind: 'ao', print: 'stickers', combo: 'combo-1', note: 'Bộ sticker có sẵn' },
  { kind: 'tui', print: 'stickers', combo: 'combo-1', note: 'Bộ sticker có sẵn' },
  { kind: 'ao', print: 'pattern', combo: 'combo-2', note: 'Hoạ tiết đen trắng có sẵn' },
  { kind: 'tui', print: 'pattern', combo: 'combo-2', note: 'Hoạ tiết đen trắng có sẵn' },
]
const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`
const linkOf = (s) => `/basic/${s.kind}${s.combo === 'combo-1' ? '' : `?combo=${s.combo}`}`

export default function Hero3D() {
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const reduced = useReducedMotion()
  const [state, setState] = useState('loading') // loading | ready | fallback
  const [index, setIndex] = useState(0)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    let disposed = false
    import('../../data/showcase3d.js')
      .then(({ createShowcase }) =>
        createShowcase(hostRef.current, { items: SHOWCASE, reduced, onChange: setIndex })
      )
      .then((v) => {
        if (disposed) return v.dispose()
        viewRef.current = v
        setIndex(0)
        setState('ready')
      })
      .catch(() => {
        if (!disposed) setState('fallback')
      })
    return () => {
      disposed = true
      viewRef.current?.dispose()
      viewRef.current = null
    }
  }, [reduced])

  if (state === 'fallback') return <HeroLookbook />
  const item = SHOWCASE[index]
  const step = (dir) => {
    setTouched(true)
    if (viewRef.current) viewRef.current[dir > 0 ? 'next' : 'prev']()
  }
  const onKey = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      step(e.key === 'ArrowRight' ? 1 : -1)
    }
  }

  return (
    <div className={`m3d sc is-${state}`}>
      <div className="sc-stage">
        <div
          className="m3d-canvas"
          ref={hostRef}
          tabIndex={0}
          role="group"
          aria-roledescription="khu trưng bày 3D"
          aria-label={`${PRODUCTS[item.kind].name}, ${item.note}. Kéo để xoay, phím mũi tên trái phải để đổi mẫu.`}
          onPointerDown={() => setTouched(true)}
          onKeyDown={onKey}
        />
        <button type="button" className="sc-arrow is-prev" aria-label="Mẫu trước" onClick={() => step(-1)}>
          <Icon name="arrow" size={20} />
        </button>
        <button type="button" className="sc-arrow is-next" aria-label="Mẫu tiếp theo" onClick={() => step(1)}>
          <Icon name="arrow" size={20} />
        </button>
        <p className={`m3d-hint${touched ? ' is-hidden' : ''}`} aria-hidden="true">
          <Icon name="rotate" size={16} /> Kéo để xoay 360°
        </p>
      </div>
      <div className="sc-info" aria-live="polite">
        <span className="sc-text">
          <b>{PRODUCTS[item.kind].name}</b>
          <small>
            {item.combo === 'combo-1' ? 'Combo 1' : 'Combo 2'} · {item.note}
          </small>
        </span>
        <span className="sc-price">{vnd(priceOf(item.kind, item.combo))}</span>
        <Link to={linkOf(item)} className="btn btn-sun btn-sm sc-cta">
          Xem bộ kit <Icon name="arrow" size={16} className="btn-arrow" />
        </Link>
      </div>
      <div className="sc-dots">
        {SHOWCASE.map((s, i) => (
          <button
            key={i}
            type="button"
            className={i === index ? 'is-on' : undefined}
            aria-label={`${PRODUCTS[s.kind].name}: ${s.note}`}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => {
              setTouched(true)
              viewRef.current?.go(i)
            }}
          />
        ))}
      </div>
    </div>
  )
}
