import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { createOrder } from '../api.js'
import { tierOf } from '../data/combos.js'
import { PRODUCTS, contentsOf, methodOf, productFor } from '../data/products.js'
import { DELIVERY, PAYMENTS, PRICING, findVoucher, priceOf, quote, vnd } from '../data/pricing.js'
import { STICKER_SETS } from '../data/stickerSets.js'
import { OptionGroup, Pills, SizeChart, Stepper } from '../components/ProductParts.jsx'
import Sticker from '../components/Sticker.jsx'
import ProductVisual from '../components/ProductVisual.jsx'
import TryOnModal from '../components/TryOnModal.jsx'

// Trang đặt hàng cho áo hoặc túi trong gói Basic (Combo 1 / Combo 2) và gói Premium (áo + bộ in lụa).
// Ảnh món bên trái; bên phải: hướng dẫn size → chọn combo → (màu túi) → size → số lượng
// → bộ sticker (gói ép nhiệt) → thanh toán (nhận hàng, thanh toán, mã giảm giá, bảng tính giá) → Phối thử / Đặt hàng.
const INK = 'var(--brand-strong)' // màu mực minh hoạ cho gói in lụa
const PHONE_RE = /^0\d{9}$/
const EMPTY_CUSTOMER = { name: '', phone: '', address: '', note: '' }
const clampInt = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number(n)) || lo))

function validate({ size, customer, delivery }) {
  const e = {}
  if (!size) e.size = 'Chọn size.'
  if (!customer.name.trim()) e.name = 'Nhập họ tên người nhận.'
  if (!PHONE_RE.test(customer.phone.replace(/\s/g, ''))) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0.'
  if (delivery === 'giao-hang' && !customer.address.trim()) e.address = 'Nhập địa chỉ nhận hàng.'
  return e
}

export default function OrderPage({ combos, combo, productKey, user }) {
  const [, setSearchParams] = useSearchParams()
  const method = methodOf(combo)
  const tier = tierOf(combo)
  const product = productFor(PRODUCTS[productKey], combo)
  const hasSizes = product.sizes.length > 1
  const unit = product.unit
  const sample = !!PRICING.sample[combo.slug]
  const tabs = ['Mô tả', hasSizes ? 'Bảng size' : 'Kích thước', 'Bảo quản']
  const uid = useId()

  const [sizeOpen, setSizeOpen] = useState(false)
  const [size, setSize] = useState(hasSizes ? null : product.sizes[0])
  const [colorKey, setColorKey] = useState(product.colors[0].key)
  const [qty, setQty] = useState(1)
  const [setKey, setSetKey] = useState(null) // null = không chọn bộ sticker
  const [stickerQty, setStickerQty] = useState(1)
  const [customer, setCustomer] = useState(() => ({
    ...EMPTY_CUSTOMER,
    name: user?.name ?? '',
    phone: user?.phone ?? '',
  }))
  const [delivery, setDelivery] = useState('giao-hang')
  const [payment, setPayment] = useState('cod')
  const [voucherInput, setVoucherInput] = useState('')
  const [voucher, setVoucher] = useState(null)
  const [voucherMsg, setVoucherMsg] = useState(null) // { type: 'ok' | 'error', text }
  const [errors, setErrors] = useState({})
  const [design, setDesign] = useState([])
  const [tryOn, setTryOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [placed, setPlaced] = useState(null)
  const [tab, setTab] = useState(0)
  const placedRef = useRef(null)

  // Đăng nhập sau khi đã mở trang: điền tên và số điện thoại vào ô còn trống
  useEffect(() => {
    if (!user) return
    setCustomer((c) => ({ ...c, name: c.name || user.name || '', phone: c.phone || user.phone || '' }))
  }, [user])

  useEffect(() => {
    if (placed) placedRef.current?.focus()
  }, [placed])

  // Đổi sang combo hoạ tiết thì chỉ còn một màu nền: rơi về màu đầu tiên còn hợp lệ
  const color = product.colors.find((c) => c.key === colorKey) ?? product.colors[0]
  const stickerSet = method.stickers ? (STICKER_SETS.find((s) => s.key === setKey) ?? null) : null
  const q = quote({
    product: productKey,
    combo: combo.slug,
    qty,
    stickerQty: stickerSet ? stickerQty : 0,
    delivery,
    voucher,
  })
  const v = findVoucher(voucher)
  const visual = { productKey, color, pattern: combo.patterned }

  // Combo lưu trên URL (?combo=combo-2), combo đầu tiên của gói thì để URL gọn
  function pickCombo(slug) {
    setSearchParams(slug === combos[0].slug ? {} : { combo: slug }, {
      replace: true,
      state: { keepScroll: true },
    })
  }

  function setField(k, value) {
    setCustomer((c) => ({ ...c, [k]: value }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function applyVoucher() {
    const code = voucherInput.trim().toUpperCase()
    if (!code) return setVoucherMsg({ type: 'error', text: 'Nhập mã giảm giá.' })
    const found = findVoucher(code)
    if (!found) return setVoucherMsg({ type: 'error', text: `Mã ${code} không tồn tại.` })
    setVoucher(code)
    setVoucherInput('')
    setVoucherMsg({ type: 'ok', text: `Đã áp dụng ${code}: ${found.label}.` })
  }

  function removeVoucher() {
    setVoucher(null)
    setVoucherMsg(null)
  }

  async function placeOrder() {
    const e = validate({ size, customer, delivery })
    setErrors(e)
    setSubmitError(null)
    const first = ['size', 'name', 'phone', 'address'].find((k) => e[k])
    if (first) {
      const el = document.getElementById(`${uid}-${first}`)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (first !== 'size') el?.focus({ preventScroll: true })
      return
    }
    setBusy(true)
    try {
      const res = await createOrder({
        combo: combo.slug,
        product: productKey,
        color: color.key,
        size,
        qty,
        stickerSet: stickerSet?.key ?? null,
        stickerQty: stickerSet ? stickerQty : 0,
        delivery,
        payment,
        voucher,
        customer: { ...customer, phone: customer.phone.replace(/\s/g, '') },
        design,
      })
      setPlaced({
        code: res.code,
        totals: res.totals,
        comboName: combo.name,
        productName: product.name,
        colorName: color.name,
        hasSizes,
        size,
        qty,
        stickerSet: stickerSet && { name: stickerSet.name, qty: stickerQty },
        delivery: DELIVERY.find((d) => d.key === delivery).label,
        payment: PAYMENTS.find((p) => p.key === payment).label,
        phone: customer.phone,
      })
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const field = (k, label, props = {}) => {
    const Tag = props.as ?? 'input'
    const { as: _as, ...rest } = props
    return (
      <div className="field">
        <label htmlFor={`${uid}-${k}`}>{label}</label>
        <Tag
          id={`${uid}-${k}`}
          value={customer[k]}
          onChange={(ev) => setField(k, ev.target.value)}
          aria-invalid={!!errors[k]}
          aria-describedby={errors[k] ? `${uid}-${k}-err` : undefined}
          {...rest}
        />
        {errors[k] && (
          <p className="field-err" id={`${uid}-${k}-err`}>
            {errors[k]}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="page product tee-page">
      <div className="pp-grid">
        {/* ---------- Cột trái: ảnh áo trắng ---------- */}
        <div className="pp-gallery">
          <div className="pp-main tee-main">
            <ProductVisual
              {...visual}
              design={design}
              flat={!method.stickers}
              ink={INK}
              alt={productKey === 'ao' ? 'Áo thun trắng trơn form oversize, cổ bo gân' : product.title}
            />
            {combo.patterned && (
              <span className="tee-badge">
                <span className="tee-badge-swatch" aria-hidden="true" />
                In sẵn hoạ tiết đen trắng
              </span>
            )}
            {design.length > 0 && <span className="pp-view-tag">Bản phối của bạn</span>}
          </div>
        </div>

        {/* ---------- Cột phải ---------- */}
        <div className="pp-info">
          <nav className="crumbs" aria-label="Đường dẫn">
            <Link to="/">Trang chủ</Link>
            <span aria-hidden="true">›</span>
            <Link to="/#combo">{tier.name}</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{product.name}</span>
          </nav>
          <h1 className="pp-title">
            {product.title} <em>· {combo.slug === tier.key ? tier.name : `${tier.name} ${combo.name}`}</em>
          </h1>
          <p className="pp-price">
            {vnd(q.unit)}{' '}
            <small>
              / {unit}
              {sample && ' · tạm tính'}
            </small>
          </p>
          <p className="pp-blurb">{product.blurb}</p>

          {placed ? (
            <OrderPlaced placed={placed} panelRef={placedRef} onAgain={() => setPlaced(null)} />
          ) : (
            <>
              {/* 1. Hướng dẫn chọn size (bật / tắt) */}
              <div className="tee-guide">
                <button
                  type="button"
                  className="tee-guide-btn"
                  aria-expanded={sizeOpen}
                  aria-controls={`${uid}-guide`}
                  onClick={() => setSizeOpen(!sizeOpen)}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      d="M3 8.5L8.5 3 21 15.5 15.5 21zM7 7l1.5 1.5M10 5.5 11.5 7M8.5 10l1.5 1.5M13 8.5l1.5 1.5M11.5 13l1.5 1.5M16 11.5l1.5 1.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {hasSizes ? 'Hướng dẫn chọn size' : `Kích thước ${unit}`}
                  <span className="tee-chevron" aria-hidden="true" />
                </button>
                <div id={`${uid}-guide`} className="tee-guide-panel" hidden={!sizeOpen}>
                  <SizeChart chart={product.sizeChart} />
                </div>
              </div>

              {/* 2. Chọn combo */}
              <OptionGroup label={combos.length > 1 ? 'Combo' : 'Gói'}>
                <div className="tee-combos">
                  {combos.map((c) => (
                    <label key={c.slug} className="tee-combo">
                      <input
                        type="radio"
                        name={`${uid}-combo`}
                        value={c.slug}
                        checked={c.slug === combo.slug}
                        onChange={() => pickCombo(c.slug)}
                      />
                      <span className="tee-combo-head">
                        <strong>{c.name}</strong>
                        <span>{vnd(priceOf(productKey, c.slug) ?? 0)}</span>
                      </span>
                      <span className="tee-combo-tag">{c.tagline}</span>
                      <ul>
                        {contentsOf(c, productKey).map((it) => (
                          <li key={it}>{it}</li>
                        ))}
                      </ul>
                      {methodOf(c).note && <span className="combo-note">{methodOf(c).note}</span>}
                    </label>
                  ))}
                </div>
              </OptionGroup>

              {/* Màu: túi trơn có nhiều màu; áo và món in sẵn hoạ tiết chỉ một màu */}
              {product.colors.length > 1 && (
                <OptionGroup label={`Màu ${unit}`}>
                  {product.colors.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className="swatch"
                      aria-pressed={color.key === c.key}
                      onClick={() => setColorKey(c.key)}
                    >
                      <span className="swatch-dot" style={{ background: c.fill }} aria-hidden="true" />
                      {c.name}
                    </button>
                  ))}
                </OptionGroup>
              )}

              {/* 3. Size (túi một size thì bỏ qua) */}
              {hasSizes && (
                <div id={`${uid}-size`} className="tee-size">
                  <Pills
                    label="Size"
                    options={product.sizes}
                    value={size}
                    onChange={(s) => {
                      setSize(s)
                      setErrors((e) => ({ ...e, size: undefined }))
                    }}
                  />
                  {errors.size && <p className="field-err">{errors.size}</p>}
                </div>
              )}

              {/* 4. Số lượng */}
              <OptionGroup label="Số lượng">
                <div className="tee-qty">
                  <Stepper
                    value={qty}
                    min={1}
                    label={`Số lượng ${unit}`}
                    onChange={(n) => setQty(clampInt(n, 1, 999))}
                  />
                  <span>{unit}</span>
                </div>
              </OptionGroup>

              {/* 5. Bộ sticker: chỉ Combo 1 và 2 */}
              {method.stickers && (
                <OptionGroup label="Bộ sticker" note="không bắt buộc">
                  <div className="tee-sets">
                    <label className="tee-set tee-set-none">
                      <input
                        type="radio"
                        name={`${uid}-set`}
                        checked={!setKey}
                        onChange={() => setSetKey(null)}
                      />
                      <span className="tee-set-name">Không chọn</span>
                    </label>
                    {STICKER_SETS.map((s) => (
                      <label key={s.key} className="tee-set">
                        <input
                          type="radio"
                          name={`${uid}-set`}
                          checked={setKey === s.key}
                          onChange={() => setSetKey(s.key)}
                        />
                        <span className="tee-set-art" aria-hidden="true">
                          {s.stickers.map(([shape, color], i) => (
                            <Sticker key={i} shape={shape} color={color} style={{ width: 26 }} />
                          ))}
                        </span>
                        <span className="tee-set-name">
                          {s.name} <small>(mẫu)</small>
                        </span>
                        <span className="tee-set-price">+{vnd(PRICING.stickerSet)} / bộ</span>
                      </label>
                    ))}
                  </div>
                  {stickerSet && (
                    <div className="tee-qty">
                      <Stepper
                        value={stickerQty}
                        min={1}
                        label="Số bộ sticker"
                        onChange={(n) => setStickerQty(clampInt(n, 1, 999))}
                      />
                      <span>bộ sticker</span>
                    </div>
                  )}
                </OptionGroup>
              )}

              {/* 6. Thanh toán */}
              <section className="tee-checkout" aria-labelledby={`${uid}-pay`}>
                <h2 className="tee-h2" id={`${uid}-pay`}>
                  Thanh toán
                </h2>

                <fieldset className="tee-fieldset">
                  <legend className="opt-label">Thông tin nhận hàng</legend>
                  {field('name', 'Họ tên', { autoComplete: 'name' })}
                  {field('phone', 'Số điện thoại', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
                </fieldset>

                <fieldset className="tee-fieldset">
                  <legend className="opt-label">Hình thức nhận</legend>
                  <div className="tee-radios">
                    {DELIVERY.map((d) => (
                      <label key={d.key} className="tee-radio">
                        <input
                          type="radio"
                          name={`${uid}-delivery`}
                          checked={delivery === d.key}
                          onChange={() => setDelivery(d.key)}
                        />
                        <span>
                          {d.label}
                          <small>
                            {d.key === 'studio'
                              ? 'Miễn phí vận chuyển'
                              : `${vnd(PRICING.shipping)}, miễn phí cho đơn từ ${vnd(PRICING.freeShipFrom)}`}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                  {delivery === 'giao-hang' &&
                    field('address', 'Địa chỉ nhận hàng', { autoComplete: 'street-address' })}
                  {field('note', 'Ghi chú (không bắt buộc)', { as: 'textarea', rows: 2 })}
                </fieldset>

                <fieldset className="tee-fieldset">
                  <legend className="opt-label">Phương thức thanh toán</legend>
                  <div className="tee-radios">
                    {PAYMENTS.map((p) => (
                      <label key={p.key} className="tee-radio">
                        <input
                          type="radio"
                          name={`${uid}-payment`}
                          checked={payment === p.key}
                          onChange={() => setPayment(p.key)}
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="tee-voucher">
                  <label className="opt-label" htmlFor={`${uid}-voucher`}>
                    Mã giảm giá
                  </label>
                  {voucher ? (
                    <p className="tee-voucher-on">
                      <strong>{voucher}</strong> · {v.label}
                      <button type="button" className="link" onClick={removeVoucher}>
                        Bỏ mã
                      </button>
                    </p>
                  ) : (
                    <div className="tee-voucher-row">
                      <input
                        id={`${uid}-voucher`}
                        value={voucherInput}
                        placeholder="Nhập mã"
                        autoCapitalize="characters"
                        onChange={(ev) => setVoucherInput(ev.target.value)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') {
                            ev.preventDefault()
                            applyVoucher()
                          }
                        }}
                      />
                      <button type="button" className="btn btn-glass btn-sm" onClick={applyVoucher}>
                        Áp dụng
                      </button>
                    </div>
                  )}
                  {voucherMsg && (
                    <p className={voucherMsg.type === 'ok' ? 'tee-voucher-ok' : 'field-err'} role="status">
                      {voucherMsg.text}
                    </p>
                  )}
                </div>

                {/* Bảng tính giá */}
                <div className="tee-bill-wrap">
                  <table className="tee-bill">
                    <caption className="opt-label">Bảng tính giá</caption>
                    <thead>
                      <tr>
                        <th scope="col">Mục</th>
                        <th scope="col">SL</th>
                        <th scope="col">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row">
                          {product.name} {combo.name}
                          {hasSizes ? size && ` · size ${size}` : ` · ${color.name}`}
                          <small>
                            {vnd(q.unit)} / {unit}
                          </small>
                        </th>
                        <td>{qty}</td>
                        <td>{vnd(q.itemTotal)}</td>
                      </tr>
                      {stickerSet && (
                        <tr>
                          <th scope="row">
                            {stickerSet.name}
                            <small>{vnd(PRICING.stickerSet)} / bộ</small>
                          </th>
                          <td>{stickerQty}</td>
                          <td>{vnd(q.stickerTotal)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row" colSpan={2}>
                          Phí vận chuyển
                        </th>
                        <td>{q.shipping === 0 ? 'Miễn phí' : vnd(q.shipping)}</td>
                      </tr>
                      {q.discount > 0 && (
                        <tr className="tee-bill-discount">
                          <th scope="row" colSpan={2}>
                            Giảm giá ({voucher})
                          </th>
                          <td>−{vnd(q.discount)}</td>
                        </tr>
                      )}
                      <tr className="tee-bill-total">
                        <th scope="row" colSpan={2}>
                          Tổng cộng
                        </th>
                        <td>{vnd(q.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="placeholder-note">
                  {sample
                    ? `Giá gói ${tier.name} đang là giá tạm tính, sẽ cập nhật khi có giá chính thức.`
                    : 'Giá dự kiến của studio. Giá bộ sticker, phí vận chuyển và mã giảm giá đang là số mẫu.'}
                </p>
              </section>

              {/* 7. Phối thử + Đặt hàng */}
              {/* Gói in lụa không có sticker để phối nên ẩn Phối thử */}
              <div className={`tee-actions${method.stickers ? '' : ' tee-actions-single'}`}>
                {method.stickers && (
                  <button type="button" className="btn btn-glass" onClick={() => setTryOn(true)}>
                    Phối thử
                  </button>
                )}
                <button type="button" className="btn btn-brand" onClick={placeOrder} disabled={busy}>
                  {busy ? 'Đang gửi đơn…' : `Đặt hàng · ${vnd(q.total)}`}
                </button>
              </div>
              {submitError && (
                <p className="auth-status error" role="alert">
                  {submitError}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ---------- Tab thông tin ---------- */}
      <section className="pp-tabs">
        <div className="auth-tabs" role="tablist" aria-label="Thông tin sản phẩm">
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`${uid}-tab-${i}`}
              aria-selected={tab === i}
              aria-controls={`${uid}-panel`}
              tabIndex={tab === i ? 0 : -1}
              onClick={() => setTab(i)}
              onKeyDown={(e) => {
                const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
                if (!d) return
                const next = (i + d + tabs.length) % tabs.length
                setTab(next)
                document.getElementById(`${uid}-tab-${next}`)?.focus()
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="pp-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
          {tab === 0 && (
            <p>
              {product.blurb}{' '}
              {method.stickers
                ? 'Sticker được in ép nhiệt trực tiếp tại studio nên bám chắc, không bong khi mặc và giặt đúng cách.'
                : `Gói kèm khuôn in (stencil), dao gạt mực và một chai mực in để bạn tự tay in lụa lên ${unit}.`}
            </p>
          )}
          {tab === 1 && <SizeChart chart={product.sizeChart} />}
          {tab === 2 && (
            <ul className="care-list">
              <li>Lộn trái khi giặt để bảo vệ hình in.</li>
              <li>Giặt bằng nước lạnh, không dùng chất tẩy mạnh.</li>
              <li>Không ủi trực tiếp lên hình in.</li>
            </ul>
          )}
        </div>
      </section>

      {tryOn && (
        <TryOnModal
          stickerSet={stickerSet ?? STICKER_SETS[0]}
          visual={visual}
          flat={!method.stickers}
          ink={INK}
          initial={design}
          onSave={setDesign}
          onClose={() => setTryOn(false)}
        />
      )}
    </div>
  )
}

function OrderPlaced({ placed, panelRef, onAgain }) {
  const t = placed.totals
  return (
    <div className="tee-placed" ref={panelRef} tabIndex={-1} role="status">
      <Sticker shape="star" color="var(--sun)" className="tee-placed-star" style={{ width: 56 }} />
      <p className="eyebrow">Đặt hàng thành công</p>
      <h2 className="display-sm">
        Mã đơn <em>{placed.code}</em>
      </h2>
      <p className="tee-placed-sub">
        Studio sẽ liên hệ số {placed.phone} để xác nhận đơn. Giữ lại mã đơn để tra cứu khi cần.
      </p>
      <dl className="tee-placed-sum">
        <div>
          <dt>
            {placed.productName} {placed.comboName}
          </dt>
          <dd>
            {placed.hasSizes ? `Size ${placed.size}` : placed.colorName} × {placed.qty}
          </dd>
        </div>
        {placed.stickerSet && (
          <div>
            <dt>{placed.stickerSet.name}</dt>
            <dd>× {placed.stickerSet.qty}</dd>
          </div>
        )}
        <div>
          <dt>Nhận hàng</dt>
          <dd>{placed.delivery}</dd>
        </div>
        <div>
          <dt>Thanh toán</dt>
          <dd>{placed.payment}</dd>
        </div>
        <div>
          <dt>Phí vận chuyển</dt>
          <dd>{t.shipping === 0 ? 'Miễn phí' : vnd(t.shipping)}</dd>
        </div>
        {t.discount > 0 && (
          <div>
            <dt>Giảm giá</dt>
            <dd>−{vnd(t.discount)}</dd>
          </div>
        )}
        <div className="tee-placed-total">
          <dt>Tổng cộng</dt>
          <dd>{vnd(t.total)}</dd>
        </div>
      </dl>
      <div className="tee-actions">
        <Link to="/" className="btn btn-glass">
          Về trang chủ
        </Link>
        <button type="button" className="btn btn-brand" onClick={onAgain}>
          Đặt thêm đơn
        </button>
      </div>
    </div>
  )
}
