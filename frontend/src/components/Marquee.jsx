import Sticker from './Sticker.jsx'

const WORDS = ['áo thun', 'túi tote', 'sticker', 'in ép nhiệt', 'tự chọn', 'không đụng hàng']
const SHAPES = [
  ['star', 'var(--sun)'],
  ['heart', 'var(--pink)'],
  ['bolt', 'var(--sky)'],
  ['flower', 'var(--mint)'],
]

export default function Marquee() {
  const row = WORDS.map((w, i) => (
    <span className="mq-item" key={i}>
      {w}
      <Sticker shape={SHAPES[i % 4][0]} color={SHAPES[i % 4][1]} style={{ width: 28 }} />
    </span>
  ))
  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq-track">
        {row}
        {row}
      </div>
    </div>
  )
}
