import { useId } from 'react'

// Hình vẽ áo thun, túi tote và bộ in lụa dùng chung (hero, trang chọn món, trang sản phẩm).
// Chưa có ảnh chụp thật nên mọi nơi đều dùng SVG này, tô theo màu được chọn.
// outline: viền mảnh để áo/túi màu tối không chìm vào nền.
// pattern: món nền in sẵn hoạ tiết đen trắng (Combo 2).

const NECK = {
  front: 'c10 18 28 26 50 26s40-8 50-26',
  back: 'c10 6 28 9 50 9s40-3 50-9',
}
const PATTERN_INK = '#17181c'

// Sọc lượn sóng đen đậm, cắt theo đúng dáng áo/túi.
function BwPattern({ shape, width, height }) {
  const id = useId().replace(/:/g, '')
  return (
    <>
      <defs>
        <clipPath id={`${id}-clip`}>{shape}</clipPath>
        <pattern id={`${id}-wave`} width="48" height="28" patternUnits="userSpaceOnUse">
          <path d="M-12 14q12-12 24 0t24 0 24 0" fill="none" stroke={PATTERN_INK} strokeWidth="7" />
          <circle cx="36" cy="4" r="2.5" fill={PATTERN_INK} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${id}-wave)`} clipPath={`url(#${id}-clip)`} />
    </>
  )
}

export function TeeArt({
  fill = 'var(--cotton)',
  seam = 'var(--seam)',
  side = 'front',
  outline = false,
  pattern = false,
  className = 'garment-svg',
}) {
  const neck = NECK[side] ?? NECK.front
  const body = `M100 18${neck}l70 34-28 64-34-14v200H92V102l-34 14-28-64z`
  return (
    <svg viewBox="0 0 300 320" className={className} aria-hidden="true">
      <path d={body} fill={fill} stroke={outline ? seam : undefined} strokeOpacity=".35" strokeWidth="1.5" />
      {pattern && <BwPattern shape={<path d={body} />} width="300" height="320" />}
      <path d={`M100 18${neck}`} fill="none" stroke={seam} strokeWidth="5" />
      <path d="M92 102v200M208 102v200" stroke={seam} strokeWidth="1.5" opacity=".5" />
      {side === 'back' && <rect x="140" y="30" width="20" height="12" rx="2" fill={seam} opacity=".6" />}
    </svg>
  )
}

export function ToteArt({
  fill = 'var(--canvas)',
  seam = 'var(--canvas-dark)',
  side = 'front',
  outline = false,
  pattern = false,
  className = 'garment-svg',
}) {
  return (
    <svg viewBox="0 0 240 320" className={className} aria-hidden="true">
      <path
        d="M70 110V70a50 50 0 01100 0v40"
        fill="none"
        stroke={seam}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <rect
        x="22"
        y="100"
        width="196"
        height="210"
        rx="6"
        fill={fill}
        stroke={outline ? seam : undefined}
        strokeOpacity=".4"
      />
      {pattern && (
        <BwPattern shape={<rect x="22" y="100" width="196" height="210" rx="6" />} width="240" height="320" />
      )}
      <path d="M22 122h196" stroke={seam} strokeWidth="2" strokeDasharray="5 5" />
      {side === 'back' && <rect x="168" y="280" width="34" height="14" rx="2" fill={seam} opacity=".7" />}
    </svg>
  )
}

// ---------- Bộ in lụa (gói Premium): khuôn in, dao gạt mực, chai mực ----------
const STAR = 'M50 6l12.6 27.6 30 3.4-22.4 20.3 6.3 29.7L50 71.8 23.5 87l6.3-29.7L7.4 37l30-3.4z'

const TOOLS = {
  stencil: (
    <>
      <rect x="3" y="7" width="42" height="34" rx="3" fill="var(--navy)" />
      <rect x="8" y="12" width="32" height="24" fill="var(--brand-soft)" />
      <path d={STAR} transform="translate(15 15) scale(.18)" fill="var(--brand-strong)" />
    </>
  ),
  squeegee: (
    <>
      <rect x="5" y="12" width="38" height="13" rx="6.5" fill="var(--sun)" />
      <rect x="9" y="25" width="30" height="5" fill="var(--canvas-dark)" />
      <rect x="9" y="30" width="30" height="7" rx="1" fill="var(--navy)" />
    </>
  ),
  ink: (
    <>
      <rect x="18" y="3" width="12" height="8" rx="2" fill="var(--navy)" />
      <path d="M15 13h18l3 6v22a3 3 0 01-3 3H15a3 3 0 01-3-3V19z" fill="var(--brand-strong)" />
      <rect x="15" y="24" width="18" height="11" rx="1.5" fill="#fff" />
      <path d="M19 30h10" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
}
// Ba icon nhỏ: khuôn in, dao gạt mực, chai mực
export function KitIcons({ className }) {
  return Object.entries(TOOLS).map(([tool, art]) => (
    <svg key={tool} viewBox="0 0 48 48" className={className} aria-hidden="true">
      {art}
    </svg>
  ))
}

// Ba món dụng cụ bày cạnh nhau, dùng cho ảnh "Bộ in lụa" trong thư viện ảnh.
export function KitArt({ className = 'garment-svg' }) {
  return (
    <svg viewBox="0 0 300 240" className={className} aria-hidden="true">
      <g transform="translate(14 8) scale(3.6)">{TOOLS.stencil}</g>
      <g transform="translate(190 30) scale(2.4)">{TOOLS.ink}</g>
      <g transform="translate(40 150) rotate(-8) scale(4.2 2.4)">{TOOLS.squeegee}</g>
    </svg>
  )
}
