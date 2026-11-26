import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api.js'
import { vnd } from '../../data/pricing.js'
import { PAY_SOURCE, fmtDateTime } from '../../data/orderStatus.js'
import { useAction, useApi } from './kit.js'
import { ErrorNote } from './ui.jsx'

// Giao dịch: mặc định hiện giao dịch ngân hàng chưa khớp đơn (khách ghi sai nội dung) để gán tay
export default function Payments() {
  const [params, setParams] = useSearchParams()
  const all = params.get('filter') === 'tat-ca'
  const { data, error, loading, reload } = useApi(`payments${all ? '' : '?filter=chua-khop'}`)

  return (
    <div className="admin-stack">
      <div className="admin-filters">
        <div className="seg" role="group" aria-label="Lọc giao dịch">
          <button type="button" aria-pressed={!all} onClick={() => setParams({}, { replace: true })}>
            Chưa khớp đơn
          </button>
          <button
            type="button"
            aria-pressed={all}
            onClick={() => setParams({ filter: 'tat-ca' }, { replace: true })}
          >
            Tất cả (100 gần nhất)
          </button>
        </div>
      </div>
      {!all && (
        <p className="admin-muted">
          Tiền về tài khoản (qua webhook SePay) mà nội dung không có mã đơn sẽ nằm ở đây. Tìm đơn đúng số tiền
          rồi gán.
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
                  <th scope="col">Thời gian</th>
                  <th scope="col" className="num">
                    Số tiền
                  </th>
                  <th scope="col">Nội dung</th>
                  <th scope="col">Nguồn</th>
                  <th scope="col">Đơn</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p._id}>
                    <td data-label="Thời gian">{fmtDateTime(p.at)}</td>
                    <td data-label="Số tiền" className="num">
                      <span className={p.amount < 0 ? 'pay-out' : 'pay-in'}>
                        {p.amount < 0 ? '−' : '+'}
                        {vnd(Math.abs(p.amount))}
                      </span>
                    </td>
                    <td data-label="Nội dung">{p.content || '—'}</td>
                    <td data-label="Nguồn">
                      {PAY_SOURCE[p.source]}
                      {p.bank && <span className="cell-sub">{p.bank}</span>}
                      {p.by && <span className="cell-sub">{p.by}</span>}
                    </td>
                    <td data-label="Đơn">
                      {p.order ? (
                        <Link to={`/quan-ly/don-hang/${p.order}`} className="row-link">
                          {p.order}
                        </Link>
                      ) : (
                        <Assign id={p._id} onDone={reload} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-muted">
              {all ? 'Chưa có giao dịch nào.' : 'Không có giao dịch nào chưa khớp. Tốt lắm!'}
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function Assign({ id, onDone }) {
  const [code, setCode] = useState('')
  const save = useCallback((order) => adminApi.patch(`payments/${id}`, { order }), [id])
  const [run, busy, error] = useAction(save)
  return (
    <form
      className="assign"
      onSubmit={async (e) => {
        e.preventDefault()
        if (await run(code.trim())) onDone()
      }}
    >
      <label className="sr-only" htmlFor={`as-${id}`}>
        Mã đơn
      </label>
      <input
        id={`as-${id}`}
        value={code}
        placeholder="TL-251114-AB12"
        autoCapitalize="characters"
        onChange={(e) => setCode(e.target.value)}
      />
      <button type="submit" className="btn btn-dark btn-sm" disabled={busy || !code.trim()}>
        Gán
      </button>
      {error && <p className="field-err">{error}</p>}
    </form>
  )
}
