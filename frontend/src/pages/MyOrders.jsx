import { useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { myOrders } from '../api.js'
import { vnd } from '../data/pricing.js'
import { PRODUCTS } from '../data/products.js'
import { ORDER_STATUS, PAY_STATUS, fmtDate } from '../data/orderStatus.js'

const PHONE_RE = /^0\d{9}$/
const CODE_RE = /^TL-?\d{6}-?[A-Z0-9]{4}$/

// /don-hang: tra cứu đơn bằng mã đơn + số điện thoại; đăng nhập thì thấy luôn các đơn đã đặt bằng tài khoản
export default function MyOrders({ user, onLogin }) {
  const uid = useId()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [orders, setOrders] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!user) return setOrders(null)
    myOrders()
      .then(setOrders)
      .catch((err) => setLoadError(err.message))
  }, [user])

  function lookup(e) {
    e.preventDefault()
    const c = code.trim().toUpperCase().replace(/\s/g, '')
    const p = phone.replace(/[\s.-]/g, '')
    const errs = {}
    if (!CODE_RE.test(c)) errs.code = 'Mã đơn có dạng TL-251114-AB12.'
    if (!PHONE_RE.test(p)) errs.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const m = /^TL-?(\d{6})-?([A-Z0-9]{4})$/.exec(c)
    navigate(`/don-hang/TL-${m[1]}-${m[2]}`, { state: { phone: p } })
  }

  const input = (key, label, value, set, props) => (
    <div className="field">
      <label htmlFor={`${uid}-${key}`}>{label}</label>
      <input
        id={`${uid}-${key}`}
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${uid}-${key}-err` : undefined}
        {...props}
      />
      {errors[key] && (
        <p className="field-err" id={`${uid}-${key}-err`}>
          {errors[key]}
        </p>
      )}
    </div>
  )

  return (
    <div className="page track-page">
      <p className="eyebrow">Đơn hàng</p>
      <h1 className="display-sm">
        Tra cứu <em>đơn hàng</em>
      </h1>
      <div className="track-grid">
        <form className="track-card track-ask" onSubmit={lookup} noValidate>
          <h2 className="track-h">Tìm đơn theo mã</h2>
          {input('code', 'Mã đơn', code, setCode, {
            placeholder: 'TL-251114-AB12',
            autoCapitalize: 'characters',
          })}
          {input('phone', 'Số điện thoại đặt hàng', phone, setPhone, {
            type: 'tel',
            inputMode: 'tel',
            autoComplete: 'tel',
          })}
          <button type="submit" className="btn btn-brand">
            Xem đơn
          </button>
        </form>

        <section className="track-card" aria-labelledby={`${uid}-mine`}>
          <h2 id={`${uid}-mine`} className="track-h">
            Đơn của bạn
          </h2>
          {!user ? (
            <p className="track-muted">
              <button type="button" className="link" onClick={onLogin}>
                Đăng nhập
              </button>{' '}
              để xem các đơn bạn đã đặt khi đăng nhập.
            </p>
          ) : loadError ? (
            <p className="auth-status error">{loadError}</p>
          ) : !orders ? (
            <p className="track-muted">Đang tải…</p>
          ) : !orders.length ? (
            <p className="track-muted">
              Chưa có đơn nào đặt bằng tài khoản này. <Link to="/#combo">Chọn bộ kit</Link>
            </p>
          ) : (
            <ul className="my-orders">
              {orders.map((o) => {
                const st = ORDER_STATUS[o.status] ?? ORDER_STATUS['cho-xac-nhan']
                const ps = PAY_STATUS[o.paymentStatus] ?? PAY_STATUS['chua-thanh-toan']
                return (
                  <li key={o.code}>
                    <Link to={`/don-hang/${o.code}`}>
                      <span className="my-orders-main">
                        <strong>{o.code}</strong>
                        <span>
                          {PRODUCTS[o.product]?.name} {o.comboName} × {o.qty} · {fmtDate(o.createdAt)}
                        </span>
                      </span>
                      <span className="my-orders-side">
                        <strong>{vnd(o.total)}</strong>
                        <span className="st-row">
                          <span className={`st st-${st.tone}`}>{st.label}</span>
                          {o.payment !== 'cod' && <span className={`st st-${ps.tone}`}>{ps.label}</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
