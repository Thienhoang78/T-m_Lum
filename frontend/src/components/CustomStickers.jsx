import { useState } from 'react'
import { MAX_CUSTOM_STICKERS, WAIVER_TERMS, WAIVER_TITLE } from '../data/consent.js'
import { PRICING, vnd } from '../data/pricing.js'
import { OptionGroup } from './ProductParts.jsx'

const kb = (n) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
const STATUS = { uploading: 'Đang tải lên…', done: 'Đã tải lên' }

// Khối "Sticker của riêng bạn": chọn / kéo thả hình, xem trước, bỏ hình.
// Có ít nhất 1 hình thì phải đồng ý và ký tên vào cam kết miễn trừ trách nhiệm bản quyền.
export default function CustomStickers({ uid, custom, waiver, onWaiver, waiverError }) {
  const [over, setOver] = useState(false)
  const full = custom.active.length >= MAX_CUSTOM_STICKERS

  return (
    <OptionGroup label="Sticker của riêng bạn" note="tuỳ chọn">
      <div className="upl">
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
            PNG, JPG, WebP · tối đa {MAX_CUSTOM_STICKERS} hình, mỗi hình 4 MB · {vnd(PRICING.customSticker)} /
            hình. Nên dùng PNG nền trong suốt, độ phân giải cao để in đẹp.
          </span>
        </label>

        {custom.notice && (
          <p className="field-err" role="alert">
            {custom.notice}
          </p>
        )}

        {custom.items.length > 0 && (
          <ul className="upl-list">
            {custom.items.map((it) => (
              <li key={it.key} className={`upl-item is-${it.status}`}>
                <img src={it.url} alt="" />
                <span className="upl-name">
                  {it.name}
                  <small>
                    {kb(it.size)} · {it.status === 'error' ? it.error : STATUS[it.status]}
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
              </li>
            ))}
          </ul>
        )}

        {custom.active.length > 0 && (
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
