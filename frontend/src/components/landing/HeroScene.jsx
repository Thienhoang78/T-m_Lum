import { useEffect, useRef, useState } from 'react'
import { PRODUCTS } from '../../data/products.js'
import { ToteArt } from '../GarmentArt.jsx'
import Sticker from '../Sticker.jsx'
import { useReducedMotion } from './useReducedMotion.js'

// Cảnh đầu trang: thanh treo đồ với áo thun (ảnh thật đã cắt nền) và túi tote đung đưa.
// Mỗi vài giây một bộ sticker mới bay tới, "ép nhiệt" xuống áo / túi (nảy nhẹ, loé sáng, hơi nước bốc lên),
// bộ cũ bóc ra bay đi. Rê chuột thì cảnh nghiêng theo (parallax). Áo và túi đều màu trắng.
// Giảm chuyển động (prefers-reduced-motion): đứng yên với bộ sticker đầu tiên.
const DESIGNS = [
  {
    tee: [
      ['smile', 'var(--sun)', null, 50, 40, 26, -6],
      ['flower', 'var(--sky, #64b5f6)', null, 34, 58, 13, 10],
      ['star', 'var(--pink)', null, 66, 60, 12, -12],
    ],
    tote: [
      ['heart', 'var(--pink)', null, 50, 60, 30, 6],
      ['star', 'var(--sun)', null, 70, 78, 13, 14],
    ],
  },
  {
    tee: [
      ['blob', 'var(--mint)', 'good vibes', 50, 44, 34, -4],
      ['heart', 'var(--pink)', null, 66, 32, 11, 12],
    ],
    tote: [
      ['flower', 'var(--sun)', null, 46, 60, 32, -8],
      ['smile', 'var(--mint)', null, 70, 80, 15, 8],
    ],
  },
  {
    tee: [
      ['bolt', 'var(--brand-strong)', null, 44, 44, 20, -10],
      ['star', 'var(--sun)', null, 62, 36, 15, 8],
      ['flower', 'var(--pink)', null, 60, 60, 13, -6],
    ],
    tote: [
      ['blob', 'var(--brand, #64b5f6)', 'tùm lum', 50, 62, 40, -5],
      ['heart', 'var(--pink)', null, 30, 82, 12, -14],
    ],
  },
]
const CYCLE_MS = 4600

function Prints({ items, cycle, leaving }) {
  return items.map(([shape, color, label, x, y, s, r], i) => (
    <span
      key={`${cycle}-${i}`}
      className={`scene-print${leaving ? ' is-leaving' : ''}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${s}%`,
        '--r': `${r}deg`,
        '--d': `${i * 0.28}s`,
        // hướng bay tới / bay đi: từ phía ngoài cảnh
        '--fx': `${(x - 50) * 6 + (i % 2 ? 120 : -120)}px`,
        '--fy': `${-160 - i * 40}px`,
      }}
    >
      <Sticker shape={shape} color={color} label={label} />
    </span>
  ))
}

function Steam({ cycle, count }) {
  return Array.from({ length: count }, (_, i) => (
    <span
      key={`${cycle}-${i}`}
      className="scene-steam"
      style={{ '--d': `${0.75 + i * 0.28}s`, left: `${38 + i * 12}%` }}
    />
  ))
}

export default function HeroScene() {
  const reduced = useReducedMotion()
  const [cycle, setCycle] = useState(0)
  const toteColor = PRODUCTS.tui.colors[0]
  const sceneRef = useRef(null)

  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => {
      if (!document.hidden) setCycle((c) => c + 1)
    }, CYCLE_MS)
    return () => clearInterval(t)
  }, [reduced])

  // Parallax theo chuột (bỏ qua chạm tay và chế độ giảm chuyển động)
  useEffect(() => {
    const el = sceneRef.current
    const host = el?.closest('.kit-hero')
    if (!el || !host || reduced) return
    const move = (e) => {
      if (e.pointerType === 'touch') return
      const r = host.getBoundingClientRect()
      el.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
      el.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
    }
    const leave = () => {
      el.style.setProperty('--px', 0)
      el.style.setProperty('--py', 0)
    }
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', leave)
    return () => {
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
    }
  }, [reduced])

  const design = DESIGNS[cycle % DESIGNS.length]
  const prev = cycle > 0 ? DESIGNS[(cycle - 1) % DESIGNS.length] : null

  return (
    <div className="scene" ref={sceneRef} aria-hidden="false">
      <div className="scene-glow" aria-hidden="true" />
      <div className="scene-rail" aria-hidden="true" />

      <div className="scene-hang hang-tee" aria-hidden="true">
        <svg className="scene-hanger" viewBox="0 0 120 50">
          <path
            d="M60 4a7 7 0 107 7c0 5-7 6-7 11L8 44h104L60 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="scene-garment is-tee">
          <img src={PRODUCTS.ao.cutout} alt="" width="900" height="900" />
          <div className="scene-prints">
            {prev && <Prints items={prev.tee} cycle={cycle - 1} leaving />}
            <Prints items={design.tee} cycle={cycle} />
            <span key={`f${cycle}`} className="scene-flash" />
            <Steam cycle={cycle} count={3} />
          </div>
        </div>
      </div>

      <div className="scene-hang hang-tote" aria-hidden="true">
        <span className="scene-hook" />
        <div className="scene-garment is-tote">
          <ToteArt fill={toteColor.fill} seam={toteColor.seam} className="scene-tote-art" />
          <div className="scene-prints is-tote">
            {prev && <Prints items={prev.tote} cycle={cycle - 1} leaving />}
            <Prints items={design.tote} cycle={cycle} />
            <span key={`f${cycle}`} className="scene-flash" />
            <Steam cycle={cycle} count={2} />
          </div>
        </div>
      </div>
    </div>
  )
}
