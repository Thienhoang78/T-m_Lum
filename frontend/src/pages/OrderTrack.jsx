import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { getOrder } from '../api.js'
import { DELIVERY, PRICING, fmtKm, vnd } from '../data/pricing.js'
import { PRODUCTS } from '../data/products.js'
import { CHOICES } from '../data/combos.js'
import { ORDER_STATUS, ORDER_STEPS, fmtDateTime, payMethodLabel } from '../data/orderStatus.js'
import PaymentBox from '../components/PaymentBox.jsx'

const PHONE_RE = /^0\d{9}$/

// Trang theo dõi một đơn: /don-hang/TL-251114-AB12?k=<mã bí mật>
// Không có mã bí mật (và không đăng nhập đúng tài khoản) thì hỏi số điện thoại đặt hàng.
export default function OrderTrack({ user }) {
  const { code: raw } = useParams()
  const code = raw.toUpperCase()
  const [params] = useSearchParams()
  const location = useLocation()
  const k = params.get('k') ?? ''
  const uid = useId()
  const [phone, setPhone] = useState(location.state?.phone ?? '')
  const [phoneInput, setPhoneInput] = useState('')
  const [order, setOrder] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | need-phone | not-found | error
  const [error, setError] = useState(null)
  const access = useMemo(() => ({ k, phone }), [k, phone])

  const load = useCallback(async () => {
    try {
      setOrder(await getOrder(code, access))
      setState('ok')
    } catch (err) {
      if (err.status === 404) setState(access.k || access.phone ? 'not-found' : 'need-phone')
      else {
        setError(err.message)
        setState('error')
      }
    }
  }, [code, access])

  useEffect(() => {
    load()
  }, [load, user?.id])

  function submitPhone(e) {
    e.preventDefault()
    const p = phoneInput.replace(/[\s.-]/g, '')
    if (!PHONE_RE.test(p)) return setError('Số điện thoại gồm 10 số, bắt đầu bằng 0.')
    setError(null)
    setState('loading')
    setPhone(p)
  }

  return (
    <div className="page track-page">
      <nav className="crumbs" aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">›</span>
        <Link to="/don-hang">Đơn hàng</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{code}</span>
      </nav>
      <p className="eyebrow">Theo dõi đơn hàng</p>
      <h1 className="display-sm">
        Mã đơn <em>{code}</em>
      </h1>

      {state === 'loading' && <p className="track-muted">Đang tải đơn…</p>}

      {(state === 'need-phone' || state === 'not-found') && (
        <form className="track-card track-ask" onSubmit={submitPhone} noValidate>
          <p>
            {state === 'not-found'
              ? 'Không tìm thấy đơn với số điện thoại này. Kiểm tra lại mã đơn và số điện thoại đặt hàng.'
              : 'Nhập số điện thoại đã dùng khi đặt hàng để xem đơn.'}
          </p>
          <div className="field">
            <label htmlFor={`${uid}-phone`}>Số điện thoại đặt hàng</label>
            <input
              id={`${uid}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? `${uid}-err` : undefined}
            />
            {error && (
              <p className="field-err" id={`${uid}-err`}>
                {error}
              </p>
            )}
          </div>
          <button type="submit" className="btn btn-brand">
            Xem đơn
          </button>
        </form>
      )}

      {state === 'error' && (
        <div className="track-card">
          <p className="auth-status error">{error}</p>
          <button
            type="button"
            className="btn btn-glass btn-sm"
            onClick={() => {
              setState('loading')
              load()
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {state === 'ok' && order && <OrderView order={order} access={access} onUpdate={setOrder} />}
    </div>
  )
}

function OrderView({ order, access, onUpdate }) {
  const st = ORDER_STATUS[order.status] ?? ORDER_STATUS['cho-xac-nhan']
  const cancelled = order.status === 'da-huy'
  const at = ORDER_STEPS.indexOf(order.status)
  const product = PRODUCTS[order.product]
  const t = order.totals ?? {}
  const sheets = Object.entries(PRICING.sheets).filter(([key]) => order.sheets?.[key])

  return (
    <div className="track-grid">
      <section className="track-card" aria-labelledby="track-status">
        <h2 id="track-status" className="track-h">
          Trạng thái <span className={`st st-${st.tone}`}>{st.label}</span>
        </h2>
        <p className="track-muted">Đặt lúc {fmtDateTime(order.createdAt)}</p>
        {!cancelled && (
          <ol className="track-steps">
            {ORDER_STEPS.map((key, i) => (
              <li
                key={key}
                className={i < at ? 'is-done' : i === at ? 'is-now' : undefined}
                aria-current={i === at ? 'step' : undefined}
              >
                <span className="track-dot" aria-hidden="true">
                  {i < at ? '✓' : i + 1}
                </span>
                {ORDER_STATUS[key].label}
              </li>
            ))}
          </ol>
        )}
        <p className="track-hint">{st.hint}</p>

        <h2 className="track-h">Thanh toán</h2>
        <p className="track-muted">{payMethodLabel(order.payment)}</p>
        <PaymentBox code={order.code} access={access} pay={order.pay} onUpdate={onUpdate} />
      </section>

      <section className="track-card" aria-labelledby="track-sum">
        <h2 id="track-sum" className="track-h">
          Đơn hàng
        </h2>
        <dl className="tee-placed-sum">
          <div>
            <dt>
              {product?.name ?? order.product} {order.comboName}
            </dt>
            <dd>
              {order.product === 'ao' ? `Size ${order.size} × ` : '× '}
              {order.qty}
            </dd>
          </div>
          {order.choice && CHOICES[order.choice] && (
            <div>
              <dt>Sticker</dt>
              <dd>{CHOICES[order.choice].name}</dd>
            </div>
          )}
          {order.customCount > 0 && (
            <div>
              <dt>Hình bạn tự tạo</dt>
              <dd>× {order.customCount}</dd>
            </div>
          )}
          {order.stickerSets.map((s) => (
            <div key={s.name}>
              <dt>{s.name}</dt>
              <dd>× {s.qty}</dd>
            </div>
          ))}
          {sheets.map(([key, s]) => (
            <div key={key}>
              <dt>{s.name}</dt>
              <dd>× {order.sheets[key]}</dd>
            </div>
          ))}
          <div>
            <dt>Nhận hàng</dt>
            <dd>
              {DELIVERY.find((d) => d.key === order.delivery)?.label}
              {order.delivery === 'giao-hang' && order.customer?.province
                ? ` · ${order.customer.province}`
                : ''}
            </dd>
          </div>
          <div>
            <dt>Người nhận</dt>
            <dd>
              {order.customer?.name} · {order.customer?.phone}
              {order.customer?.address && <span className="track-addr">{order.customer.address}</span>}
            </dd>
          </div>
          <div>
            <dt>Tiền hàng</dt>
            <dd>{vnd(t.goods ?? 0)}</dd>
          </div>
          <div>
            <dt>Phí vận chuyển</dt>
            <dd>
              {t.nearby
                ? `Miễn phí (cách studio ${fmtKm(t.distanceKm)} km)`
                : t.shipping
                  ? vnd(t.shipping)
                  : 'Miễn phí'}
            </dd>
          </div>
          {t.discount > 0 && (
            <div>
              <dt>Giảm giá{order.voucher ? ` (${order.voucher})` : ''}</dt>
              <dd>−{vnd(t.discount)}</dd>
            </div>
          )}
          <div className="tee-placed-total">
            <dt>Tổng cộng</dt>
            <dd>{vnd(t.total ?? 0)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
