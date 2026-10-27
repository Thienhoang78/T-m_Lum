import { useId } from 'react'

// Hình vẽ áo thun, túi tote dùng chung (dự phòng khi thiếu ảnh thật, minh hoạ các bước).
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
