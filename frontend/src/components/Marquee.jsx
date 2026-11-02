// Dải chữ chạy tràn viền trên nền navy: hàng lớn là khẩu hiệu (chữ đặc xen chữ viền, ngăn bằng ngôi sao
// bốn cánh màu thương hiệu), hàng nhỏ chạy ngược chiều là những thứ có trong bộ kit. Rê chuột thì dừng.
const BIG = ['Tùm Lum Studio', 'DIY Kits', 'Không đụng hàng', 'Good ideas brighter days']
const SMALL = [
  'Áo thun',
  'Túi tote',
  'Sticker in chuyển nhiệt',
  'Tấm sticker A5 · A4',
  'Tự tạo hình',
  'Vẽ tay lên áo',
]
const SPARK_COLORS = ['var(--sun)', 'var(--pink)', 'var(--brand)', 'var(--mint)']

const Spark = ({ color }) => (
  <svg className="band-spark" viewBox="0 0 24 24" style={{ color }}>
    <path d="M12 1.5c.7 5.6 4.9 9.8 10.5 10.5-5.6.7-9.8 4.9-10.5 10.5-.7-5.6-4.9-9.8-10.5-10.5C7.1 11.3 11.3 7.1 12 1.5z" />
  </svg>
)

function Row({ cls, children }) {
  return (
    <div className={`band-row ${cls}`}>
      <div className="band-track">
        {children}
        {children}
        {children}
      </div>
    </div>
  )
}

export default function Marquee() {
  return (
    <div className="band" aria-hidden="true">
      <Row cls="band-big">
        {BIG.map((w, i) => (
          <span className="band-item" key={w}>
            <span className={i % 2 ? 'is-outline' : undefined}>{w}</span>
            <Spark color={SPARK_COLORS[i % SPARK_COLORS.length]} />
          </span>
        ))}
      </Row>
      <Row cls="band-small">
        {SMALL.map((w) => (
          <span className="band-item" key={w}>
            {w}
            <i className="band-dot" />
          </span>
        ))}
      </Row>
    </div>
  )
}
