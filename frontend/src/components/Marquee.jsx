import Sticker from './Sticker.jsx'

// Hai dải ruy băng chéo nhau chạy ngược chiều: khẩu hiệu và những thứ có trong bộ kit, xen sticker.
const TOP = ['Good ideas brighter days', 'Tùm Lum Studio', 'DIY Kits', 'Không đụng hàng']
const BOTTOM = [
  'áo thun',
  'túi tote',
  'sticker in chuyển nhiệt',
  'tấm sticker A5 · A4',
  'tự tạo hình',
  'vẽ tay lên áo',
]
const SHAPES = [
  ['star', 'var(--sun)'],
  ['heart', 'var(--pink)'],
  ['flower', 'var(--mint)'],
  ['smile', 'var(--sun)'],
]

function Row({ words, cls }) {
  const row = words.map((w, i) => (
    <span className="mq-item" key={i}>
      {w}
      <Sticker shape={SHAPES[i % 4][0]} color={SHAPES[i % 4][1]} style={{ width: 26 }} />
    </span>
  ))
  return (
    <div className={`ribbon ${cls}`}>
      <div className="mq-track">
        {row}
        {row}
        {row}
      </div>
    </div>
  )
}

export default function Marquee() {
  return (
    <div className="ribbons" aria-hidden="true">
      <Row words={BOTTOM} cls="ribbon-b" />
      <Row words={TOP} cls="ribbon-a" />
    </div>
  )
}
