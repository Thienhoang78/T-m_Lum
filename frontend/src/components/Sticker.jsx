// Sticker kiểu die-cut: hình màu có viền trắng dày như sticker thật.
const SHAPES = {
  star: <path d="M50 6l12.6 27.6 30 3.4-22.4 20.3 6.3 29.7L50 71.8 23.5 87l6.3-29.7L7.4 37l30-3.4z" />,
  heart: (
    <path d="M50 88S10 63 10 36c0-14 10-24 22-24 9 0 15 5 18 12 3-7 9-12 18-12 12 0 22 10 22 24 0 27-40 52-40 52z" />
  ),
  bolt: <path d="M58 4L18 56h26l-8 40 46-56H54z" />,
  flower: (
    <path d="M50 8c8 0 13 8 12 17 7-6 17-5 21 2s0 16-8 19c8 3 12 12 8 19s-14 8-21 2c1 9-4 17-12 17s-13-8-12-17c-7 6-17 5-21-2s0-16 8-19c-8-3-12-12-8-19s14-8 21-2c-1-9 4-17 12-17z" />
  ),
  smile: <circle cx="50" cy="50" r="42" />,
  blob: <path d="M18 30c8-18 38-26 56-14s22 40 8 56-46 18-60 4S10 48 18 30z" />,
}

export default function Sticker({ shape = 'star', color = 'var(--sun)', label, className = '', style }) {
  return (
    <span className={`sticker ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <g className="die" fill="#fff" stroke="#fff" strokeWidth="14" strokeLinejoin="round">
          {SHAPES[shape]}
        </g>
        <g fill={color}>{SHAPES[shape]}</g>
        {shape === 'smile' && (
          <g fill="none" stroke="#1b1424" strokeWidth="5" strokeLinecap="round">
            <path d="M33 58c9 12 25 12 34 0" />
            <path d="M37 38v6M63 38v6" />
          </g>
        )}
        {label && (
          <text x="50" y="57" textAnchor="middle" className="sticker-label">
            {label}
          </text>
        )}
      </svg>
    </span>
  )
}
