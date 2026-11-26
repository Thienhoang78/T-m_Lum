import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { adminApi, trackUrl, uploadUrl } from '../../api.js'
import { DELIVERY, PRICING, fmtKm, vnd } from '../../data/pricing.js'
import { PRODUCTS } from '../../data/products.js'
import { CHOICES } from '../../data/combos.js'
import { STICKER_SETS } from '../../data/stickerSets.js'
import { ORDER_STATUS, PAY_SOURCE, fmtDateTime, payMethodLabel } from '../../data/orderStatus.js'
import { useAction, useApi, zaloUrl } from './kit.js'
import { Copy, ErrorNote, Pager, PayBadge, SearchBox, Select, StatusBadge } from './ui.jsx'

const STATUS_OPTIONS = [['', 'Mọi trạng thái'], ...Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label])]
const PAY_OPTIONS = [
  ['', 'Mọi thanh toán'],
  ['can-thu', 'Chưa thu đủ'],
  ['da-thanh-toan', 'Đã thanh toán'],
  ['hoan-tien', 'Đã hoàn tiền'],
]
const METHOD_OPTIONS = [
  ['', 'Mọi phương thức'],
  ['cod', 'COD'],
  ['qr', 'Chuyển khoản / ví'],
]
const setName = (key) => STICKER_SETS.find((s) => s.key === key)?.name ?? key

// ---------- Danh sách đơn: bộ lọc lưu trên URL để link từ Tổng quan mở đúng danh sách ----------
export function OrderList() {
  const [params, setParams] = useSearchParams()
  const get = (k) => params.get(k) ?? ''
  const setParam = useCallback(
    (k, v) =>
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          if (v) n.set(k, v)
          else n.delete(k)
          if (k !== 'page') n.delete('page')
          return n
        },
        { replace: true }
      ),
    [setParams]
  )
  const onSearch = useCallback((v) => setParam('q', v.trim()), [setParam])
  const { data, error, loading, reload } = useApi(`orders?${params}`)

  return (
    <div className="admin-stack">
      <div className="admin-filters">
        <SearchBox
          value={get('q')}
          onChange={onSearch}
          label="Tìm đơn"
          placeholder="Mã đơn, SĐT hoặc tên khách"
        />
        <Select
          label="Trạng thái"
          value={get('status')}
          onChange={(v) => setParam('status', v)}
          options={STATUS_OPTIONS}
        />
        <Select
          label="Thanh toán"
          value={get('pay')}
          onChange={(v) => setParam('pay', v)}
          options={PAY_OPTIONS}
        />
        <Select
          label="Phương thức"
          value={get('method')}
          onChange={(v) => setParam('method', v)}
          options={METHOD_OPTIONS}
        />
      </div>
      <ErrorNote error={error} onRetry={reload} />
      {!data ? (
        !error && <p className="admin-muted">Đang tải…</p>
      ) : (
        <section className={`admin-card${loading ? ' is-loading' : ''}`}>
          {data.items.length ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Mã đơn</th>
                  <th scope="col">Khách</th>
                  <th scope="col">Món</th>
                  <th scope="col" className="num">
                    Tổng
                  </th>
                  <th scope="col">Thanh toán</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.code}>
                    <td data-label="Mã đơn">
                      <Link to={`/quan-ly/don-hang/${o.code}`} className="row-link">
                        {o.code}
                      </Link>
                      <span className="cell-sub">{fmtDateTime(o.createdAt)}</span>
                    </td>
                    <td data-label="Khách">
                      {o.customer?.name}
                      <span className="cell-sub">
                        {o.customer?.phone}
                        {o.customer?.province ? ` · ${o.customer.province}` : ''}
                      </span>
                    </td>
                    <td data-label="Món">
                      {PRODUCTS[o.product]?.name} {o.comboName}
                      <span className="cell-sub">
                        {o.product === 'ao' ? `Size ${o.size} × ` : '× '}
                        {o.qty}
                      </span>
                    </td>
                    <td data-label="Tổng" className="num">
                      {vnd(o.total)}
                    </td>
                    <td data-label="Thanh toán">
                      <PayBadge status={o.paymentStatus} />
                      <span className="cell-sub">{o.payment === 'cod' ? 'COD' : 'Chuyển khoản / ví'}</span>
                    </td>
                    <td data-label="Trạng thái">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-muted">Không có đơn nào khớp bộ lọc.</p>
          )}
          <Pager
            page={data.page}
            pages={data.pages}
            total={data.total}
            unit="đơn"
            onPage={(n) => setParam('page', String(n))}
          />
        </section>
      )}
    </div>
  )
}

// ---------- Chi tiết đơn ----------
export function OrderDetail() {
  const { code } = useParams()
  const { data, error, reload, setData } = useApi(`orders/${code}`)
  if (!data)
    return (
      <div className="admin-stack">
        <Link to="/quan-ly/don-hang" className="admin-back">
          ‹ Đơn hàng
        </Link>
        {error ? <ErrorNote error={error} onRetry={reload} /> : <p className="admin-muted">Đang tải…</p>}
      </div>
    )
  const { order: o, payments, customer, pay } = data
  const product = PRODUCTS[o.product]
  const sheets = Object.entries(PRICING.sheets).filter(([k]) => o.sheets?.[k])
  const sets = o.stickerSets?.length ? o.stickerSets : o.stickerSet?.key ? [o.stickerSet] : []
  const previews = [
    [o.preview, 'Mặt trước'],
    [o.previewBack, 'Mặt sau'],
  ].filter(([id]) => id)

  return (
    <div className="admin-stack">
      <Link to="/quan-ly/don-hang" className="admin-back">
        ‹ Đơn hàng
      </Link>
      <div className="detail-head">
        <h2 className="detail-title">{o.code}</h2>
        <span className="st-row">
          <StatusBadge status={o.status} />
          <PayBadge status={o.paymentStatus} />
        </span>
        <p className="admin-muted">
          Đặt lúc {fmtDateTime(o.createdAt)}
          {o.user ? ' · khách đặt khi đã đăng nhập' : ''}
        </p>
      </div>
      <ErrorNote error={error} onRetry={reload} />

      <div className="admin-cols">
        <div className="admin-stack">
          <section className="admin-card" aria-label="Sản phẩm">
            <h3 className="admin-h">Sản phẩm</h3>
            <dl className="kv">
              <div>
                <dt>
                  {product?.name ?? o.product} {o.combo?.name}
                </dt>
                <dd>
                  {o.product === 'ao' ? `Size ${o.size} × ` : '× '}
                  {o.qty}
                </dd>
              </div>
              {o.choice && (
                <div>
                  <dt>Cách làm sticker</dt>
                  <dd>{CHOICES[o.choice]?.name ?? o.choice}</dd>
                </div>
              )}
              {sets.map((s) => (
                <div key={s.key ?? s.name}>
                  <dt>{s.name}</dt>
                  <dd>× {s.qty}</dd>
                </div>
              ))}
              {sheets.map(([k, s]) => (
                <div key={k}>
                  <dt>
                    {s.name}
                    {o.sheetSets?.[k] && (
                      <span className="cell-sub">
                        {o.sheetSets[k] === 'combo' ? 'In bộ đi kèm combo' : `In ${setName(o.sheetSets[k])}`}
                      </span>
                    )}
                  </dt>
                  <dd>× {o.sheets[k]}</dd>
                </div>
              ))}
              <div>
                <dt>Khung in A4</dt>
                <dd>
                  Trước {o.printFrame?.front === 'ngang' ? 'ngang' : 'dọc'} · sau{' '}
                  {o.printFrame?.back === 'ngang' ? 'ngang' : 'dọc'}
                </dd>
              </div>
              <div>
                <dt>Tiền hàng</dt>
                <dd>{vnd(o.totals?.goods ?? 0)}</dd>
              </div>
              <div>
                <dt>Phí giao</dt>
                <dd>
                  {o.totals?.nearby
                    ? `Miễn phí (trong ${PRICING.freeShipRadiusKm} km)`
                    : o.totals?.shipping
                      ? vnd(o.totals.shipping)
                      : 'Miễn phí'}
                </dd>
              </div>
              {o.totals?.discount > 0 && (
                <div>
                  <dt>Giảm giá {o.voucher && `(${o.voucher})`}</dt>
                  <dd>−{vnd(o.totals.discount)}</dd>
                </div>
              )}
              <div className="kv-total">
                <dt>Tổng cộng</dt>
                <dd>{vnd(o.totals?.total ?? 0)}</dd>
              </div>
            </dl>
          </section>

          {(previews.length > 0 || o.customStickers?.length > 0) && (
            <section className="admin-card" aria-label="Bản phối và hình của khách">
              <h3 className="admin-h">Bản phối và hình của khách</h3>
              {previews.length > 0 && (
                <div className="thumbs is-large">
                  {previews.map(([id, label]) => (
                    <a key={id} href={uploadUrl(id)} target="_blank" rel="noreferrer">
                      <img src={uploadUrl(id)} alt={`Mockup ${label.toLowerCase()}`} loading="lazy" />
                      <span>{label}</span>
                    </a>
                  ))}
                </div>
              )}
              {o.customStickers?.length > 0 && (
                <>
                  <h4 className="admin-h3">
                    {o.choice === 've' ? 'Hình khách vẽ' : 'Hình khách tải lên'} ({o.customStickers.length})
                  </h4>
                  <div className="thumbs">
                    {o.customStickers.map((c, i) => (
                      <a key={String(c.upload)} href={uploadUrl(c.upload)} target="_blank" rel="noreferrer">
                        <img src={uploadUrl(c.upload)} alt={`Hình ${i + 1}: ${c.name}`} loading="lazy" />
                        <span>
                          #{i + 1}
                          {c.cut ? ' · tách nền' : ''}
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}
              {o.waiver?.accepted && (
                <p className="admin-muted">
                  Cam kết bản quyền {o.waiver.version}: ký tên “{o.waiver.signedName}” lúc{' '}
                  {fmtDateTime(o.waiver.signedAt)}
                  {o.waiver.ip ? `, IP ${o.waiver.ip}` : ''}.
                </p>
              )}
            </section>
          )}

          <History history={o.history} />
        </div>

        <div className="admin-stack">
          <StatusCard order={o} onSaved={setData} />
          <PaymentCard order={o} pay={pay} payments={payments} onSaved={setData} />
          <section className="admin-card" aria-label="Khách hàng">
            <h3 className="admin-h">Khách hàng</h3>
            <p className="cust-line">
              <Link to={`/quan-ly/khach-hang/${o.customer?.phone}`} className="row-link">
                {o.customer?.name}
              </Link>
              {customer?.tags?.map((t) => (
                <span key={t} className="crm-tag">
                  {t}
                </span>
              ))}
            </p>
            <p className="cust-actions">
              <a href={`tel:${o.customer?.phone}`} className="btn btn-glass btn-sm">
                Gọi {o.customer?.phone}
              </a>
              <a
                href={zaloUrl(o.customer?.phone)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-glass btn-sm"
              >
                Zalo
              </a>
            </p>
            <dl className="kv">
              <div>
                <dt>Nhận hàng</dt>
                <dd>{DELIVERY.find((d) => d.key === o.delivery)?.label}</dd>
              </div>
              {o.delivery === 'giao-hang' && (
                <div>
                  <dt>Địa chỉ</dt>
                  <dd>
                    {o.customer?.address}
                    {o.customer?.province ? `, ${o.customer.province}` : ''}
                  </dd>
                </div>
              )}
              {o.deliveryGeo?.lat != null && (
                <div>
                  <dt>Vị trí khách ghim</dt>
                  <dd>
                    Cách studio {fmtKm(o.deliveryGeo.km)} km ·{' '}
                    <a
                      href={`https://www.google.com/maps?q=${o.deliveryGeo.lat},${o.deliveryGeo.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở bản đồ
                    </a>
                  </dd>
                </div>
              )}
              {o.customer?.note && (
                <div>
                  <dt>Khách ghi chú</dt>
                  <dd>{o.customer.note}</dd>
                </div>
              )}
              {customer?.stats && (
                <div>
                  <dt>Đã mua</dt>
                  <dd>
                    {customer.stats.orders} đơn · {vnd(customer.stats.spent)}
                  </dd>
                </div>
              )}
            </dl>
            {o.accessKey && (
              <div className="track-link">
                <span className="admin-muted">Link theo dõi đơn gửi cho khách</span>
                <code>{trackUrl(o.code, o.accessKey)}</code>
                <Copy text={trackUrl(o.code, o.accessKey)}>Chép link</Copy>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function StatusCard({ order, onSaved }) {
  const uid = useId()
  const [status, setStatus] = useState(order.status)
  const [note, setNote] = useState('')
  useEffect(() => setStatus(order.status), [order.status])
  const save = useCallback((body) => adminApi.patch(`orders/${order.code}`, body), [order.code])
  const [run, busy, error] = useAction(save)
  const changed = status !== order.status
  const paid = order.paidAmount ?? 0

  async function submit(e) {
    e.preventDefault()
    const res = await run({ status: changed ? status : undefined, note: note.trim() || undefined })
    if (res) {
      onSaved(res)
      setNote('')
    }
  }

  return (
    <form className="admin-card" onSubmit={submit} aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="admin-h">
        Xử lý đơn
      </h3>
      <div className="status-pick" role="radiogroup" aria-label="Trạng thái đơn">
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <label key={k} className={`status-opt${status === k ? ' is-on' : ''}`}>
            <input type="radio" name={`${uid}-st`} checked={status === k} onChange={() => setStatus(k)} />
            {v.label}
          </label>
        ))}
      </div>
      {changed && status === 'hoan-tat' && order.payment === 'cod' && paid < (order.totals?.total ?? 0) && (
        <p className="admin-notice is-info">
          Đơn COD: hoàn tất sẽ tự ghi nhận đã thu {vnd((order.totals?.total ?? 0) - paid)} khi giao.
        </p>
      )}
      {changed && status === 'da-huy' && paid > 0 && (
        <p className="admin-notice">Đơn đã thu {vnd(paid)}. Nhớ hoàn tiền cho khách ở mục Thanh toán.</p>
      )}
      <div className="field">
        <label htmlFor={`${uid}-note`}>Ghi chú nội bộ (khách không thấy)</label>
        <textarea
          id={`${uid}-note`}
          rows={2}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      {error && <p className="field-err">{error}</p>}
      <button type="submit" className="btn btn-brand btn-sm" disabled={busy || (!changed && !note.trim())}>
        {busy ? 'Đang lưu…' : changed ? `Chuyển sang “${ORDER_STATUS[status].label}”` : 'Lưu ghi chú'}
      </button>
    </form>
  )
}

function PaymentCard({ order, pay, payments, onSaved }) {
  const uid = useId()
  const due = pay.due
  const [kind, setKind] = useState('thu')
  const [amount, setAmount] = useState(null) // null = dùng số gợi ý (số còn phải thu / số đã thu)
  const [note, setNote] = useState('')
  const save = useCallback((body) => adminApi.post(`orders/${order.code}/payments`, body), [order.code])
  const [run, busy, error] = useAction(save)
  const suggested = kind === 'thu' ? due : pay.paid
  const value = amount == null ? suggested : Number(amount.replace(/\D/g, ''))

  async function submit(e) {
    e.preventDefault()
    const res = await run({ kind, amount: value, note: note.trim() || undefined })
    if (res) {
      onSaved(res)
      setAmount(null)
      setNote('')
    }
  }

  return (
    <section className="admin-card" aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="admin-h">
        Thanh toán <PayBadge status={order.paymentStatus} />
      </h3>
      <dl className="kv">
        <div>
          <dt>Phương thức</dt>
          <dd>{payMethodLabel(order.payment)}</dd>
        </div>
        {order.payment !== 'cod' && (
          <div>
            <dt>Nội dung chuyển khoản</dt>
            <dd>
              <span className="pay-ref">{order.code.replace(/-/g, '')}</span>
            </dd>
          </div>
        )}
        <div>
          <dt>Đã thu / tổng</dt>
          <dd>
            {vnd(pay.paid)} / {vnd(pay.total)}
          </dd>
        </div>
        {due > 0 && order.status !== 'da-huy' && (
          <div className="kv-total">
            <dt>Còn phải thu</dt>
            <dd>{vnd(due)}</dd>
          </div>
        )}
      </dl>
      {payments.length > 0 && (
        <ul className="pay-list">
          {payments.map((p) => (
            <li key={p._id}>
              <span className={p.amount < 0 ? 'pay-out' : 'pay-in'}>
                {p.amount < 0 ? '−' : '+'}
                {vnd(Math.abs(p.amount))}
              </span>
              <span className="cell-sub">
                {PAY_SOURCE[p.source]} · {fmtDateTime(p.at)}
                {p.by ? ` · ${p.by}` : ''}
                {p.content ? ` · ${p.content}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form className="pay-form" onSubmit={submit}>
        <div className="seg" role="group" aria-label="Loại giao dịch">
          <button
            type="button"
            aria-pressed={kind === 'thu'}
            onClick={() => {
              setKind('thu')
              setAmount(null)
            }}
          >
            Thu tiền
          </button>
          <button
            type="button"
            aria-pressed={kind === 'hoan'}
            onClick={() => {
              setKind('hoan')
              setAmount(null)
            }}
            disabled={pay.paid <= 0}
          >
            Hoàn tiền
          </button>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-amt`}>Số tiền (₫)</label>
          <input
            id={`${uid}-amt`}
            inputMode="numeric"
            value={amount ?? (suggested > 0 ? String(suggested) : '')}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-pnote`}>Ghi chú</label>
          <input
            id={`${uid}-pnote`}
            value={note}
            maxLength={200}
            placeholder={
              kind === 'thu' ? 'VD: khách chuyển khoản Vietcombank' : 'VD: huỷ đơn, hoàn qua chuyển khoản'
            }
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && <p className="field-err">{error}</p>}
        <button type="submit" className="btn btn-dark btn-sm" disabled={busy || !(value > 0)}>
          {busy
            ? 'Đang ghi…'
            : `Ghi nhận ${kind === 'thu' ? 'đã thu' : 'đã hoàn'} ${value > 0 ? vnd(value) : ''}`}
        </button>
      </form>
    </section>
  )
}

function History({ history }) {
  if (!history?.length) return null
  return (
    <section className="admin-card" aria-label="Nhật ký đơn">
      <h3 className="admin-h">Nhật ký</h3>
      <ol className="timeline">
        {[...history].reverse().map((h, i) => (
          <li key={i}>
            <span className="cell-sub">
              {fmtDateTime(h.at)}
              {h.by ? ` · ${h.by}` : ''}
            </span>
            {h.action === 'trang-thai' ? (
              <span>
                {ORDER_STATUS[h.from]?.label ?? h.from} → <strong>{ORDER_STATUS[h.to]?.label ?? h.to}</strong>
                {h.note ? `: ${h.note}` : ''}
              </span>
            ) : (
              <span>{h.note}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
