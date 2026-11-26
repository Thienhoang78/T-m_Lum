import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { vnd } from '../../data/pricing.js'
import { PRODUCTS } from '../../data/products.js'
import { fmtDate } from '../../data/orderStatus.js'
import { niceTicks, useApi, vndShort, vndTile } from './kit.js'
import { ErrorNote, PayBadge, StatusBadge } from './ui.jsx'

const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const METRICS = {
  revenue: { label: 'Doanh thu', note: 'Tiền đã thu theo ngày nhận tiền', fmt: vnd, axis: vndShort },
  orders: { label: 'Số đơn', note: 'Đơn mới theo ngày đặt', fmt: (n) => `${n} đơn`, axis: String },
}

export default function Overview() {
  const { data, error, loading, reload } = useApi('summary')
  if (!data)
    return error ? <ErrorNote error={error} onRetry={reload} /> : <p className="admin-muted">Đang tải…</p>
  const s = data

  return (
    <div className={`admin-stack${loading ? ' is-loading' : ''}`}>
      <ErrorNote error={error} onRetry={reload} />
      {!s.setup.bank && (
        <p className="admin-notice">
          <strong>Chưa cài tài khoản nhận tiền.</strong> Khách chọn chuyển khoản / ví sẽ chưa thấy mã VietQR.
          Đặt <code>BANK_BIN</code>, <code>BANK_ACCOUNT</code>, <code>BANK_ACCOUNT_NAME</code> trong biến môi
          trường của backend (xem README).
        </p>
      )}
      {s.setup.studioPlaceholder && (
        <p className="admin-notice">
          <strong>Vị trí studio đang là vị trí tạm (Cầu Rồng).</strong> Miễn phí giao trong bán kính đang tính
          quanh điểm này. Sửa <code>STUDIO</code> trong <code>frontend/src/data/pricing.js</code> và{' '}
          <code>backend/lib/pricing.js</code> thành toạ độ thật của studio.
        </p>
      )}
      {s.setup.bank && !s.setup.autoConfirm && (
        <p className="admin-notice is-info">
          Chưa bật tự xác nhận chuyển khoản (SePay). Khi thấy tiền về, mở đơn và bấm <em>Ghi nhận</em> trong
          mục Thanh toán.
        </p>
      )}

      <section className="admin-kpis" aria-label="Số liệu 30 ngày">
        <div className="kpi kpi-hero">
          <p className="kpi-label">Doanh thu 30 ngày</p>
          <p className="kpi-value">{vndTile(s.last30.revenue)}</p>
          <p className="kpi-sub">
            Hôm nay {vnd(s.today.revenue)} · 7 ngày {vnd(s.last7.revenue)}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Đơn mới 30 ngày</p>
          <p className="kpi-value">{s.last30.orders}</p>
          <p className="kpi-sub">
            Hôm nay {s.today.orders} · 7 ngày {s.last7.orders}
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Giá trị đơn 30 ngày</p>
          <p className="kpi-value">{vndTile(s.last30.value)}</p>
          <p className="kpi-sub">Không tính đơn đã huỷ</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Khách hàng</p>
          <p className="kpi-value">{s.customers.total}</p>
          <p className="kpi-sub">{s.customers.new30} khách mới trong 30 ngày</p>
        </div>
      </section>

      <div className="admin-cols">
        <DailyChart days={s.days} />

        <section className="admin-card" aria-labelledby="todo-h">
          <h2 id="todo-h" className="admin-h">
            Việc cần làm
          </h2>
          <ul className="todo">
            <Todo
              n={s.status['cho-xac-nhan'] ?? 0}
              to="/quan-ly/don-hang?status=cho-xac-nhan"
              text="đơn chờ xác nhận"
            />
            <Todo
              n={s.awaitingPayment}
              to="/quan-ly/don-hang?pay=can-thu&method=qr"
              text="đơn chuyển khoản chưa trả đủ"
            />
            <Todo n={s.unmatched} to="/quan-ly/giao-dich" text="giao dịch chưa khớp đơn" />
            <Todo
              n={s.status['dang-lam'] ?? 0}
              to="/quan-ly/don-hang?status=dang-lam"
              text="đơn đang làm"
              quiet
            />
            <Todo
              n={s.status['dang-giao'] ?? 0}
              to="/quan-ly/don-hang?status=dang-giao"
              text="đơn đang giao"
              quiet
            />
          </ul>
          <h3 className="admin-h3">Khách cần chăm sóc</h3>
          {s.followUps.length ? (
            <ul className="mini-list">
              {s.followUps.map((c) => (
                <li key={c.phone}>
                  <Link to={`/quan-ly/khach-hang/${c.phone}`}>
                    <strong>{c.name || c.phone}</strong>
                    <span>
                      Hẹn {fmtDate(c.followUpAt)} · {c.stats?.orders ?? 0} đơn
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-muted">Không có lịch hẹn tới hạn.</p>
          )}
        </section>
      </div>

      <section className="admin-card" aria-labelledby="recent-h">
        <div className="admin-card-head">
          <h2 id="recent-h" className="admin-h">
            Đơn mới nhất
          </h2>
          <Link to="/quan-ly/don-hang" className="link">
            Xem tất cả
          </Link>
        </div>
        {s.recent.length ? (
          <ul className="mini-list">
            {s.recent.map((o) => (
              <li key={o.code}>
                <Link to={`/quan-ly/don-hang/${o.code}`}>
                  <strong>
                    {o.code} · {o.customer?.name}
                  </strong>
                  <span>
                    {PRODUCTS[o.product]?.name} {o.comboName} × {o.qty} · {vnd(o.total)} ·{' '}
                    {fmtDate(o.createdAt)}
                  </span>
                  <span className="st-row">
                    <StatusBadge status={o.status} />
                    {o.payment !== 'cod' && <PayBadge status={o.paymentStatus} />}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-muted">Chưa có đơn nào.</p>
        )}
      </section>
    </div>
  )
}

function Todo({ n, to, text, quiet }) {
  return (
    <li className={n && !quiet ? 'is-due' : undefined}>
      <Link to={to}>
        <strong>{n}</strong> {text}
      </Link>
    </li>
  )
}

// Biểu đồ cột 30 ngày, một chuỗi số liệu (doanh thu hoặc số đơn). Mỗi cột là một nút: rê chuột / focus hiện số,
// phím ← → chuyển ngày. Bảng số liệu đầy đủ ở dưới.
function DailyChart({ days }) {
  const [metric, setMetric] = useState('revenue')
  const [active, setActive] = useState(null) // chỉ số cột đang xem
  const [focusIdx, setFocusIdx] = useState(days.length - 1)
  const bars = useRef([])
  const uid = useId()
  const m = METRICS[metric]
  const values = days.map((d) => d[metric])
  const ticks = niceTicks(Math.max(...values))
  const top = ticks.at(-1)
  const empty = values.every((v) => v === 0)

  function onKey(e, i) {
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : null
    const j = e.key === 'End' ? days.length - 1 : next
    if (j == null || j < 0 || j >= days.length) return
    e.preventDefault()
    setFocusIdx(j)
    bars.current[j]?.focus()
  }

  return (
    <section className="admin-card chart-card" aria-labelledby={`${uid}-h`}>
      <div className="admin-card-head">
        <div>
          <h2 id={`${uid}-h`} className="admin-h">
            {m.label} 30 ngày qua
          </h2>
          <p className="admin-muted">{m.note}</p>
        </div>
        <div className="seg" role="group" aria-label="Số liệu">
          {Object.entries(METRICS).map(([k, v]) => (
            <button key={k} type="button" aria-pressed={metric === k} onClick={() => setMetric(k)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart" onPointerLeave={() => setActive(null)}>
        <div className="chart-grid" aria-hidden="true">
          {ticks.map((t) => (
            <div key={t} className="chart-tick" style={{ bottom: `${(t / top) * 100}%` }}>
              <span>{m.axis(t)}</span>
            </div>
          ))}
        </div>
        <div className="chart-bars" role="group" aria-label={`${m.label} theo ngày`}>
          {days.map((d, i) => (
            <button
              key={d.date}
              ref={(el) => (bars.current[i] = el)}
              type="button"
              className={`chart-col${active === i ? ' is-on' : ''}`}
              tabIndex={i === focusIdx ? 0 : -1}
              aria-label={`${ddmm(d.date)}: ${m.fmt(values[i])}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => {
                setActive(i)
                setFocusIdx(i)
              }}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span
                className="chart-bar"
                style={{ height: values[i] ? `max(2px, ${(values[i] / top) * 100}%)` : 0 }}
              />
            </button>
          ))}
          {active != null && (
            <div
              className={`chart-tip${active > days.length * 0.7 ? ' is-left' : ''}`}
              style={{ left: `${((active + 0.5) / days.length) * 100}%` }}
              aria-hidden="true"
            >
              <strong>{m.fmt(values[active])}</strong>
              <span>{fmtDate(`${days[active].date}T12:00:00+07:00`)}</span>
            </div>
          )}
        </div>
        {empty && (
          <p className="chart-empty">Chưa có {metric === 'revenue' ? 'tiền thu' : 'đơn'} trong 30 ngày qua</p>
        )}
      </div>
      <div className="chart-x" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.date}>{i % 7 === 2 || i === days.length - 1 ? ddmm(d.date) : ''}</span>
        ))}
      </div>

      <details className="chart-table">
        <summary>Xem bảng số liệu</summary>
        <table className="admin-table is-compact">
          <thead>
            <tr>
              <th scope="col">Ngày</th>
              <th scope="col" className="num">
                Số đơn
              </th>
              <th scope="col" className="num">
                Giá trị đơn
              </th>
              <th scope="col" className="num">
                Doanh thu
              </th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.date}>
                <td>{ddmm(d.date)}</td>
                <td className="num">{d.orders}</td>
                <td className="num">{vnd(d.value)}</td>
                <td className="num">{vnd(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
