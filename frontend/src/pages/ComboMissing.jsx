import { Link } from 'react-router-dom'

export default function ComboMissing() {
  return (
    <section className="page missing">
      <h1 className="display-sm">Không tìm thấy combo này.</h1>
      <p className="lede">Có thể combo đã đổi tên hoặc ngừng bán.</p>
      <Link to="/#combo" className="btn btn-brand">
        Xem các combo
      </Link>
    </section>
  )
}
