// Hình vẽ áo thun và túi tote dùng chung (hero, trang chọn món, trang sản phẩm).
// Chưa có ảnh chụp thật nên mọi nơi đều dùng SVG này, tô theo màu được chọn.
// outline: viền mảnh để áo/túi màu tối không chìm vào nền tối.

const NECK = {
  front: 'c10 18 28 26 50 26s40-8 50-26',
  back: 'c10 6 28 9 50 9s40-3 50-9',
}

export function TeeArt({
  fill = 'var(--cotton)',
  seam = 'var(--seam)',
  side = 'front',
  outline = false,
  className = 'garment-svg',
}) {
  const neck = NECK[side] ?? NECK.front
  return (
    <svg viewBox="0 0 300 320" className={className} aria-hidden="true">
      <path
        d={`M100 18${neck}l70 34-28 64-34-14v200H92V102l-34 14-28-64z`}
        fill={fill}
        stroke={outline ? seam : undefined}
        strokeOpacity=".35"
        strokeWidth="1.5"
      />
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
      <path d="M22 122h196" stroke={seam} strokeWidth="2" strokeDasharray="5 5" />
      {side === 'back' && <rect x="168" y="280" width="34" height="14" rx="2" fill={seam} opacity=".7" />}
    </svg>
  )
}
