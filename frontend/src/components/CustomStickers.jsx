import { useState } from 'react'
import { MAX_CUSTOM_STICKERS, WAIVER_TERMS, WAIVER_TITLE } from '../data/consent.js'
import { OptionGroup } from './ProductParts.jsx'

const kb = (n) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
const STATUS = { processing: 'Đang tách nền…', uploading: 'Đang tải lên…' }

// Dòng trạng thái của một hình: đang xử lý / lỗi / đã tách nền bằng cách nào / dùng ảnh gốc vì sao
function statusText(it) {
  if (it.status === 'error') return it.error
  if (STATUS[it.status]) return STATUS[it.status]
  if (it.drawn) return 'Hình bạn tự vẽ'
  if (it.useCut && it.cut)
    return `Đã tách nền${it.cut.method === 'ai' ? ' (AI)' : ''}${it.cut.reduced ? ', đã thu nhỏ cho vừa 4 MB' : ''}`
  return it.cutReason ? `Dùng ảnh gốc: ${it.cutReason.toLowerCase()}` : 'Dùng ảnh gốc'
}

// Khối hình tự tạo của Combo 1, theo cách khách đã chọn:
//   kind 'upload': chọn / kéo thả hình, xem trước, bỏ hình (chỉ hiện hình tải lên)
//   kind 'draw': nút mở Phối thử để vẽ, danh sách hình đã vẽ (chỉ hiện hình vẽ)
// Có ít nhất 1 hình thì phải đồng ý và ký tên vào cam kết miễn trừ trách nhiệm bản quyền.
export default function CustomStickers({
  uid,
  custom,
  kind = 'upload',
  onDraw,
  waiver,
  onWaiver,
  waiverError,
}) {
  const [over, setOver] = useState(false)
  const draw = kind === 'draw'
  const items = custom.items.filter((it) => !!it.drawn === draw)
  const active = custom.active.filter((it) => !!it.drawn === draw)
  const full = custom.active.length >= MAX_CUSTOM_STICKERS

  return (
    <OptionGroup
      label={draw ? 'Hình bạn tự vẽ' : 'Hình của bạn'}
      note={draw ? 'vẽ trong Phối thử' : 'tải lên'}
    >
      <div className="upl">
        {draw ? (
          <div className="upl-draw">
            <button type="button" className="btn btn-dark btn-sm" onClick={onDraw}>
              {items.length ? 'Mở Phối thử để vẽ tiếp' : 'Mở Phối thử để vẽ'}
            </button>
            <span className="upl-hint">
              Vẽ thẳng lên áo / túi trong tab Vẽ, khổ tối đa A4; bấm Xong để lưu hình vẽ.
            </span>
          </div>
        ) : (
          <label
            className={`upl-drop${over ? ' is-over' : ''}${full ? ' is-full' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              if (!full) custom.add(e.dataTransfer.files)
            }}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              disabled={full}
              onChange={(e) => {
                custom.add(e.target.files)
                e.target.value = ''
              }}
            />
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path
                d="M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="upl-title">
              {full ? `Đã đủ ${MAX_CUSTOM_STICKERS} hình` : 'Kéo thả hoặc bấm để chọn hình sticker của bạn'}
            </span>
            <span className="upl-hint">
              PNG, JPG, WebP · tối đa {MAX_CUSTOM_STICKERS} hình, mỗi hình 4 MB · đã gồm trong giá combo. Nên
              dùng PNG nền trong suốt, độ phân giải cao để in đẹp.
            </span>
          </label>
        )}

        {custom.notice && (
          <p className="field-err" role="alert">
            {custom.notice}
          </p>
        )}

        {items.length > 0 && (
          <ul className="upl-list">
            {items.map((it) => (
              <li key={it.key} className={`upl-item is-${it.status}`}>
                <img src={it.url} alt="" />
                <span className="upl-name">
                  {it.name}
                  <small aria-live="polite">
                    {kb(it.size)} · {statusText(it)}
                  </small>
                </span>
                <button
                  type="button"
                  className="upl-remove"
                  aria-label={`Bỏ hình ${it.name}`}
                  onClick={() => custom.remove(it.key)}
                >
                  ×
                </button>
                {it.cut && (
                  <div className="upl-tools">
                    <div className="upl-switch" role="group" aria-label={`Bản dùng để in cho ${it.name}`}>
                      <button
                        type="button"
                        aria-pressed={it.useCut}
                        disabled={it.status === 'processing'}
                        onClick={() => custom.setUseCut(it.key, true)}
                      >
                        Đã tách nền
                      </button>
                      <button
                        type="button"
                        aria-pressed={!it.useCut}
                        disabled={it.status === 'processing'}
                        onClick={() => custom.setUseCut(it.key, false)}
                      >
                        Ảnh gốc
                      </button>
                    </div>
                    {it.useCut && it.cut.method === 'flood' && (
                      <label className="upl-tol">
                        <span>Độ nhạy tách nền</span>
                        <input
                          type="range"
                          min="10"
                          max="110"
                          step="4"
                          value={it.tolerance}
                          onChange={(e) => custom.setTolerance(it.key, Number(e.target.value))}
                        />
                      </label>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {!draw && items.length > 0 && (
          <p className="upl-hint upl-note">
            Ảnh được tự tách nền để chỉ giữ lại sticker. Tách nền tự động có thể chưa hoàn hảo với ảnh chụp
            phức tạp, chưa ưng thì chọn “Ảnh gốc”.
          </p>
        )}

        {active.length > 0 && (
          <div className="waiver" id={`${uid}-waiver`}>
            <p className="waiver-title">{WAIVER_TITLE}</p>
            <ol className="waiver-text" tabIndex={0} aria-label="Nội dung cam kết">
              {WAIVER_TERMS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <label className="waiver-check">
              <input
                type="checkbox"
                checked={waiver.accepted}
                onChange={(e) => onWaiver({ ...waiver, accepted: e.target.checked })}
              />
              <span>Tôi đã đọc và đồng ý với cam kết trên</span>
            </label>
            <div className="field">
              <label htmlFor={`${uid}-sign`}>Họ và tên (ký tên)</label>
              <input
                id={`${uid}-sign`}
                value={waiver.signedName}
                autoComplete="name"
                onChange={(e) => onWaiver({ ...waiver, signedName: e.target.value })}
                aria-invalid={!!waiverError && !waiver.signedName.trim()}
              />
            </div>
            {waiverError && <p className="field-err">{waiverError}</p>}
          </div>
        )}
      </div>
    </OptionGroup>
  )
}
