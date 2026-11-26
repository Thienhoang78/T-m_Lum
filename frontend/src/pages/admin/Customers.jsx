import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api.js'
import { vnd } from '../../data/pricing.js'
import { PRODUCTS } from '../../data/products.js'
import { NOTE_KINDS, fmtDate, fmtDateTime, toDateInput, todayInput } from '../../data/orderStatus.js'
import { useAction, useApi, vndTile, zaloUrl } from './kit.js'
import { ErrorNote, Pager, PayBadge, SearchBox, Select, StatusBadge } from './ui.jsx'

const SEGMENTS = [
  ['', 'Tất cả'],
  ['cham-soc', 'Cần chăm sóc'],
  ['vip', 'VIP'],
  ['quay-lai', 'Mua từ 2 lần'],
  ['moi', 'Mới 30 ngày'],
  ['lau-chua-mua', 'Lâu chưa mua (90 ngày)'],
  ['chua-mua', 'Chưa mua'],
]
const SORTS = [
  ['', 'Mua gần đây'],
  ['chi-tieu', 'Chi tiêu nhiều'],
  ['don', 'Nhiều đơn'],
  ['cham-soc', 'Lịch hẹn sớm'],
]
const DAY = 24 * 60 * 60 * 1000
const isDue = (d) => d && new Date(d).getTime() < Date.now() + DAY / 2

// ---------- Danh sách khách ----------
export function CustomerList() {
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
  const { data, error, loading, reload } = useApi(`customers?${params}`)
  const sync = useCallback(() => adminApi.post('customers'), [])
  const [runSync, syncing, syncError] = useAction(sync)
  const [syncMsg, setSyncMsg] = useState(null)

  return (
    <div className="admin-stack">
      <div className="admin-filters">
        <SearchBox value={get('q')} onChange={onSearch} label="Tìm khách" placeholder="Tên, SĐT hoặc email" />
        {data?.tags?.length > 0 && (
          <Select
            label="Nhãn"
            value={get('tag')}
            onChange={(v) => setParam('tag', v)}
            options={[['', 'Mọi nhãn'], ...data.tags.map((t) => [t, t])]}
          />
        )}
        <Select label="Sắp xếp" value={get('sort')} onChange={(v) => setParam('sort', v)} options={SORTS} />
        <button
          type="button"
          className="btn btn-glass btn-sm"
          disabled={syncing}
          onClick={async () => {
            const r = await runSync()
            if (r) {
              setSyncMsg(`Đã đồng bộ ${r.customers} khách từ đơn hàng, ${r.users} tài khoản.`)
              reload()
            }
          }}
        >
          {syncing ? 'Đang đồng bộ…' : 'Đồng bộ từ đơn hàng'}
        </button>
      </div>
      <div className="chips" role="group" aria-label="Nhóm khách">
        {SEGMENTS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={get('seg') === k} onClick={() => setParam('seg', k)}>
            {label}
          </button>
        ))}
      </div>
      {(syncMsg || syncError) && (
        <p className={syncError ? 'field-err' : 'admin-muted'} role="status">
          {syncError ?? syncMsg}
        </p>
      )}
      <ErrorNote error={error} onRetry={reload} />
      {!data ? (
        !error && <p className="admin-muted">Đang tải…</p>
      ) : (
        <section className={`admin-card${loading ? ' is-loading' : ''}`}>
          {data.items.length ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Khách</th>
                  <th scope="col" className="num">
                    Đơn
                  </th>
                  <th scope="col" className="num">
                    Chi tiêu
                  </th>
                  <th scope="col">Mua gần nhất</th>
                  <th scope="col">Nhãn</th>
                  <th scope="col">Hẹn chăm sóc</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.phone}>
                    <td data-label="Khách">
                      <Link to={`/quan-ly/khach-hang/${c.phone}`} className="row-link">
                        {c.name || 'Chưa có tên'}
                      </Link>
                      <span className="cell-sub">
                        {c.phone}
                        {c.province ? ` · ${c.province}` : ''}
                      </span>
                    </td>
                    <td data-label="Đơn" className="num">
                      {c.stats?.orders ?? 0}
                      {c.stats?.cancelled > 0 && <span className="cell-sub">{c.stats.cancelled} huỷ</span>}
                    </td>
                    <td data-label="Chi tiêu" className="num">
                      {vnd(c.stats?.spent ?? 0)}
                    </td>
                    <td data-label="Mua gần nhất">
                      {c.stats?.lastOrderAt ? fmtDate(c.stats.lastOrderAt) : '—'}
                    </td>
                    <td data-label="Nhãn">
                      <CustomerTags customer={c} vipFrom={data.vipFrom} />
                    </td>
                    <td data-label="Hẹn chăm sóc">
                      {c.followUpAt ? (
                        <span className={isDue(c.followUpAt) ? 'due' : undefined}>
                          {fmtDate(c.followUpAt)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-muted">Không có khách nào khớp bộ lọc.</p>
          )}
          <Pager
            page={data.page}
            pages={data.pages}
            total={data.total}
            unit="khách"
            onPage={(n) => setParam('page', String(n))}
          />
        </section>
      )}
    </div>
  )
}

function CustomerTags({ customer: c, vipFrom }) {
  const auto = []
  if ((c.stats?.spent ?? 0) >= vipFrom) auto.push('VIP')
  if ((c.stats?.orders ?? 0) >= 2) auto.push('Khách quen')
  if (c.user) auto.push('Có tài khoản')
  if (!auto.length && !c.tags?.length) return '—'
  return (
    <span className="st-row">
      {auto.map((t) => (
        <span key={t} className="crm-tag is-auto">
          {t}
        </span>
      ))}
      {c.tags?.map((t) => (
        <span key={t} className="crm-tag">
          {t}
        </span>
      ))}
    </span>
  )
}

// ---------- Hồ sơ khách ----------
export function CustomerDetail() {
  const { phone } = useParams()
  const { data, error, reload, setData } = useApi(`customers/${phone}`)
  const save = useCallback((body) => adminApi.patch(`customers/${phone}`, body), [phone])

  if (!data)
    return (
      <div className="admin-stack">
        <Link to="/quan-ly/khach-hang" className="admin-back">
          ‹ Khách hàng
        </Link>
        {error ? <ErrorNote error={error} onRetry={reload} /> : <p className="admin-muted">Đang tải…</p>}
      </div>
    )
  const { customer: c, orders, account, vipFrom } = data
  const s = c.stats ?? {}

  return (
    <div className="admin-stack">
      <Link to="/quan-ly/khach-hang" className="admin-back">
        ‹ Khách hàng
      </Link>
      <div className="detail-head">
        <h2 className="detail-title">{c.name || c.phone}</h2>
        <CustomerTags customer={c} vipFrom={vipFrom} />
        <p className="cust-actions">
          <a href={`tel:${c.phone}`} className="btn btn-glass btn-sm">
            Gọi {c.phone}
          </a>
          <a href={zaloUrl(c.phone)} target="_blank" rel="noreferrer" className="btn btn-glass btn-sm">
            Zalo
          </a>
          {c.email && (
            <a href={`mailto:${c.email}`} className="btn btn-glass btn-sm">
              Email
            </a>
          )}
        </p>
      </div>
      <ErrorNote error={error} onRetry={reload} />

      <section className="admin-kpis is-small" aria-label="Số liệu khách">
        <div className="kpi">
          <p className="kpi-label">Số đơn</p>
          <p className="kpi-value">{s.orders ?? 0}</p>
          <p className="kpi-sub">{s.cancelled ? `${s.cancelled} đơn đã huỷ` : 'Không có đơn huỷ'}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Tổng chi tiêu</p>
          <p className="kpi-value">{vndTile(s.spent ?? 0)}</p>
          <p className="kpi-sub">Đã thanh toán {vnd(s.paid ?? 0)}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Khách từ</p>
          <p className="kpi-value">{s.firstOrderAt ? fmtDate(s.firstOrderAt) : fmtDate(c.createdAt)}</p>
          <p className="kpi-sub">Mua gần nhất {s.lastOrderAt ? fmtDate(s.lastOrderAt) : '—'}</p>
        </div>
      </section>

      <div className="admin-cols">
        <div className="admin-stack">
          <NotesCard notes={c.notes ?? []} save={save} onSaved={setData} />
          <section className="admin-card" aria-label="Lịch sử đơn">
            <h3 className="admin-h">Lịch sử đơn ({orders.length})</h3>
            {orders.length ? (
              <ul className="mini-list">
                {orders.map((o) => (
                  <li key={o.code}>
                    <Link to={`/quan-ly/don-hang/${o.code}`}>
                      <strong>
                        {o.code} · {vnd(o.total)}
                      </strong>
                      <span>
                        {PRODUCTS[o.product]?.name} {o.comboName} × {o.qty} · {fmtDate(o.createdAt)}
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
              <p className="admin-muted">Khách chưa có đơn nào.</p>
            )}
          </section>
        </div>
        <div className="admin-stack">
          <ProfileCard customer={c} save={save} onSaved={setData} />
          {account && (
            <section className="admin-card" aria-label="Tài khoản">
              <h3 className="admin-h">Tài khoản trên web</h3>
              <dl className="kv">
                <div>
                  <dt>Tên</dt>
                  <dd>{account.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{account.email}</dd>
                </div>
                <div>
                  <dt>Đăng ký</dt>
                  <dd>{fmtDate(account.createdAt)}</dd>
                </div>
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ customer: c, save, onSaved }) {
  const uid = useId()
  const init = useCallback(
    () => ({
      name: c.name ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      tags: c.tags ?? [],
      followUpAt: toDateInput(c.followUpAt),
    }),
    [c]
  )
  const [f, setF] = useState(init)
  const [tagInput, setTagInput] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => setF(init()), [init])
  const [run, busy, error] = useAction(save)
  const set = (k, v) => {
    setF((x) => ({ ...x, [k]: v }))
    setSaved(false)
  }
  const addTag = (raw) => {
    const t = raw.replace(/,+$/, '').trim()
    if (t && !f.tags.includes(t)) set('tags', [...f.tags, t].slice(0, 12))
    setTagInput('')
  }
  const plusDays = (n) => toDateInput(Date.now() + n * DAY)

  async function submit(e) {
    e.preventDefault()
    const tags = tagInput.trim() ? [...f.tags, tagInput.trim()] : f.tags
    const res = await run({ ...f, tags, followUpAt: f.followUpAt || null })
    if (res) {
      onSaved(res)
      setTagInput('')
      setSaved(true)
    }
  }

  return (
    <form className="admin-card" onSubmit={submit} aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="admin-h">
        Hồ sơ khách
      </h3>
      <div className="field">
        <label htmlFor={`${uid}-name`}>Tên khách</label>
        <input
          id={`${uid}-name`}
          value={f.name}
          maxLength={80}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-email`}>Email</label>
        <input
          id={`${uid}-email`}
          type="email"
          value={f.email}
          maxLength={120}
          onChange={(e) => set('email', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-addr`}>Địa chỉ gần nhất</label>
        <input
          id={`${uid}-addr`}
          value={f.address}
          maxLength={300}
          onChange={(e) => set('address', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-tag`}>Nhãn (Enter để thêm)</label>
        {f.tags.length > 0 && (
          <span className="st-row">
            {f.tags.map((t) => (
              <span key={t} className="crm-tag">
                {t}
                <button
                  type="button"
                  aria-label={`Bỏ nhãn ${t}`}
                  onClick={() =>
                    set(
                      'tags',
                      f.tags.filter((x) => x !== t)
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </span>
        )}
        <input
          id={`${uid}-tag`}
          value={tagInput}
          maxLength={30}
          placeholder="VD: Khách sỉ, Trường học"
          onChange={(e) =>
            e.target.value.endsWith(',') ? addTag(e.target.value) : setTagInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag(tagInput)
            }
          }}
          onBlur={() => tagInput.trim() && addTag(tagInput)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-fu`}>Hẹn chăm sóc lại</label>
        <input
          id={`${uid}-fu`}
          type="date"
          value={f.followUpAt}
          min={todayInput()}
          onChange={(e) => set('followUpAt', e.target.value)}
        />
        <span className="quick">
          <button type="button" className="link" onClick={() => set('followUpAt', plusDays(1))}>
            Mai
          </button>
          <button type="button" className="link" onClick={() => set('followUpAt', plusDays(7))}>
            1 tuần
          </button>
          <button type="button" className="link" onClick={() => set('followUpAt', plusDays(30))}>
            1 tháng
          </button>
          {f.followUpAt && (
            <button type="button" className="link" onClick={() => set('followUpAt', '')}>
              Bỏ hẹn
            </button>
          )}
        </span>
      </div>
      {error && <p className="field-err">{error}</p>}
      {saved && (
        <p className="admin-muted" role="status">
          Đã lưu.
        </p>
      )}
      <button type="submit" className="btn btn-brand btn-sm" disabled={busy}>
        {busy ? 'Đang lưu…' : 'Lưu hồ sơ'}
      </button>
    </form>
  )
}

function NotesCard({ notes, save, onSaved }) {
  const uid = useId()
  const [kind, setKind] = useState('goi-dien')
  const [text, setText] = useState('')
  const [run, busy, error] = useAction(save)

  async function submit(e) {
    e.preventDefault()
    const res = await run({ note: { kind, text } })
    if (res) {
      onSaved(res)
      setText('')
    }
  }
  async function remove(id) {
    if (!window.confirm('Xoá ghi chú này?')) return
    const res = await run({ removeNote: id })
    if (res) onSaved(res)
  }

  return (
    <section className="admin-card" aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="admin-h">
        Chăm sóc khách
      </h3>
      <form className="note-form" onSubmit={submit}>
        <div className="seg" role="group" aria-label="Loại ghi chú">
          {Object.entries(NOTE_KINDS).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-text`} className="sr-only">
            Nội dung
          </label>
          <textarea
            id={`${uid}-text`}
            rows={3}
            value={text}
            maxLength={1000}
            placeholder="VD: Gọi tư vấn đặt 30 áo lớp, khách hẹn chốt mẫu tuần sau"
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        {error && <p className="field-err">{error}</p>}
        <button type="submit" className="btn btn-dark btn-sm" disabled={busy || !text.trim()}>
          {busy ? 'Đang lưu…' : 'Thêm ghi chú'}
        </button>
      </form>
      {notes.length > 0 ? (
        <ol className="timeline">
          {notes.map((n) => (
            <li key={n._id}>
              <span className="cell-sub">
                <strong>{NOTE_KINDS[n.kind] ?? 'Ghi chú'}</strong> · {fmtDateTime(n.at)}
                {n.by ? ` · ${n.by}` : ''}
                <button
                  type="button"
                  className="note-del"
                  onClick={() => remove(n._id)}
                  aria-label="Xoá ghi chú"
                >
                  Xoá
                </button>
              </span>
              <span className="note-text">{n.text}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="admin-muted">
          Chưa có ghi chú. Ghi lại mỗi lần gọi điện, nhắn tin để cả studio cùng nắm.
        </p>
      )}
    </section>
  )
}
