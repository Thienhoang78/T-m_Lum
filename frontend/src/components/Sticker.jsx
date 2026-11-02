// Sticker kiểu die-cut: hình màu có viền trắng dày như sticker thật.
// flat: bỏ viền trắng, trông như hình in lụa một màu in thẳng lên vải.
import { SMILE_FACE, STICKER_PATHS } from '../data/stickerShapes.js'

export default function Sticker({
  shape = 'star',
  color = 'var(--sun)',
  label,
  flat,
  className = '',
  style,
}) {
  return (
    <span className={`sticker ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        {!flat && (
          <g className="die" fill="#fff" stroke="#fff" strokeWidth="14" strokeLinejoin="round">
            <path d={STICKER_PATHS[shape]} />
          </g>
        )}
        <path fill={color} d={STICKER_PATHS[shape]} />
        {shape === 'smile' && (
          <g fill="none" stroke="var(--navy)" strokeWidth="5" strokeLinecap="round">
            {SMILE_FACE.map((d) => (
              <path key={d} d={d} />
            ))}
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
