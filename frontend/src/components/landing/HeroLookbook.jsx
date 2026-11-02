import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion.js'

// Cụm ảnh người mẫu ở đầu trang: một ảnh mặc áo thun trắng in logo Tùm Lum Studio, một ảnh cầm túi tote in logo.
// Hai thẻ ảnh xếp chồng, hơi nghiêng, nổi nhẹ; rê chuột thì hai thẻ lệch ngược chiều nhau (parallax),
// rê lên thẻ nào thì thẻ đó thẳng lại và nổi lên trên.
// Ảnh gốc: Artem Podrez trên Pexels (giấy phép Pexels: dùng thương mại, được chỉnh sửa), không lộ mặt người mẫu;
// logo được in giả lên áo / túi theo nếp vải.
//   https://www.pexels.com/photo/6786614/  (áo thun)
//   https://www.pexels.com/photo/6786706/  (túi tote)
const SHOTS = [
  {
    cls: 'look-tee',
    src: '/images/hero/nguoi-mau-ao.webp',
    w: 864,
    h: 1201,
    alt: 'Người mẫu mặc áo thun trắng in logo Tùm Lum Studio',
  },
  {
    cls: 'look-tote',
    src: '/images/hero/nguoi-mau-tui.webp',
    w: 760,
    h: 1249,
    alt: 'Người mẫu cầm túi tote in logo Tùm Lum Studio',
  },
]

export default function HeroLookbook() {
  const ref = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
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

  return (
    <div className="look" ref={ref}>
      {SHOTS.map((s) => (
        <figure key={s.cls} className={`look-card ${s.cls}`}>
          <img src={s.src} alt={s.alt} width={s.w} height={s.h} />
        </figure>
      ))}
    </div>
  )
}
