import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { createOrder, uploadSticker } from '../api.js'
import { tierOf } from '../data/combos.js'
import { PRODUCTS, contentsOf, methodOf, productFor } from '../data/products.js'
import { DELIVERY, PAYMENTS, PRICING, findVoucher, priceOf, quote, vnd } from '../data/pricing.js'
import { STICKER_SETS } from '../data/stickerSets.js'
import { WAIVER_VERSION } from '../data/consent.js'
import { useCustomStickers } from '../data/useCustomStickers.js'
import { OptionGroup, Pills, SizeChart, Stepper } from '../components/ProductParts.jsx'
import Sticker from '../components/Sticker.jsx'
import ProductVisual from '../components/ProductVisual.jsx'
import DesignStudio from '../components/DesignStudio.jsx'
import LiveTryOn from '../components/LiveTryOn.jsx'
import { renderMockup } from '../data/mockup.js'
import CustomStickers from '../components/CustomStickers.jsx'

// Trang đặt hàng cho áo hoặc túi trong gói Basic (Combo 1 / Combo 2) và gói Premium (áo + bộ in lụa).
// Ảnh món bên trái; bên phải: hướng dẫn size → chọn combo → (màu túi) → size → số lượng
// → bộ sticker (gói ép nhiệt) → thanh toán (nhận hàng, thanh toán, mã giảm giá, bảng tính giá) → Phối thử / Đặt hàng.
const INK = 'var(--brand-strong)' // màu mực minh hoạ cho gói in lụa
const PHONE_RE = /^0\d{9}$/
const EMPTY_CUSTOMER = { name: '', phone: '', address: '', note: '' }
const clampInt = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number(n)) || lo))

// Bản phối của từng món (áo / túi) lưu trong sessionStorage theo gói, để tải lại trang không mất.
// Hình khách tự tải lên không lưu được (ảnh chỉ nằm trong trình duyệt), nên chỉ lưu sticker thư viện.
const designKey = (tier) => `tl-design:${tier}`
function loadDesigns(tier) {
  try {
    return JSON.parse(sessionStorage.getItem(designKey(tier))) ?? {}
  } catch {
    return {}
  }
}

function validate({ size, customer, delivery }) {
  const e = {}
  if (!size) e.size = 'Chọn size.'
  if (!customer.name.trim()) e.name = 'Nhập họ tên người nhận.'
  if (!PHONE_RE.test(customer.phone.replace(/\s/g, ''))) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0.'
  if (delivery === 'giao-hang' && !customer.address.trim()) e.address = 'Nhập địa chỉ nhận hàng.'
  return e
}

export default function OrderPage({ combos, combo, productKey, products, onProduct, user }) {
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
  const [sizeChoice, setSize] = useState(null)
  // Đổi áo ↔ túi ngay trên trang: size cũ không hợp lệ thì phải chọn lại, túi chỉ có một size
  const size = hasSizes ? (product.sizes.includes(sizeChoice) ? sizeChoice : null) : product.sizes[0]
  const [colorKey, setColorKey] = useState(product.colors[0].key)
  const [qty, setQty] = useState(1)
  const [sets, setSets] = useState({}) // bộ sticker đã chọn: { [key]: số bộ }
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
  const [designs, setDesigns] = useState(() => loadDesigns(tier.key))
  const [studio, setStudio] = useState(false)
  const [live, setLive] = useState(false) // live mặc thử áo bằng camera
  const visualRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [placed, setPlaced] = useState(null)
  const [tab, setTab] = useState(0)
  const placedRef = useRef(null)
  const custom = useCustomStickers() // sticker khách tự tải lên
  const [waiver, setWaiver] = useState({ accepted: false, signedName: '' })

  // Đăng nhập sau khi đã mở trang: điền tên và số điện thoại vào ô còn trống
  useEffect(() => {
    if (!user) return
    setCustomer((c) => ({ ...c, name: c.name || user.name || '', phone: c.phone || user.phone || '' }))
  }, [user])

  useEffect(() => {
    if (placed) placedRef.current?.focus()
  }, [placed])

  // Bản phối của món đang xem; lưu sticker thư viện vào sessionStorage
  const design = designs[productKey] ?? []
  const setDesign = useCallback(
    (d) => setDesigns((m) => ({ ...m, [productKey]: typeof d === 'function' ? d(m[productKey] ?? []) : d })),
    [productKey]
  )
  useEffect(() => {
    try {
      const keep = Object.fromEntries(
        Object.entries(designs).map(([k, list]) => [k, list.filter((it) => !it.custom)])
      )
      sessionStorage.setItem(designKey(tier.key), JSON.stringify(keep))
    } catch {
      // trình duyệt chặn lưu trữ: bỏ qua
    }
  }, [designs, tier.key])

  // Đổi sang combo hoạ tiết thì chỉ còn một màu nền: rơi về màu đầu tiên còn hợp lệ
  const color = product.colors.find((c) => c.key === colorKey) ?? product.colors[0]
  const chosenSets = method.stickers ? STICKER_SETS.filter((s) => sets[s.key]) : []
  const setsQty = chosenSets.reduce((n, s) => n + sets[s.key], 0)
  const toggleSet = (key) =>
    setSets((m) => {
      const next = { ...m }
      if (next[key]) delete next[key]
      else next[key] = 1
      return next
    })
  // Dùng sticker của một bộ trong trình phối: thêm bộ đó vào đơn (1 bộ) nếu chưa có
  const useSet = useCallback((key) => setSets((m) => (m[key] ? m : { ...m, [key]: 1 })), [])
  const q = quote({
    product: productKey,
    combo: combo.slug,
    qty,
    stickerQty: setsQty,
    customQty: method.stickers ? custom.active.length : 0,
    delivery,
    voucher,
  })
  // Có sticker tự tải lên thì phải ký cam kết bản quyền; đang tải hình thì chưa cho đặt
  const needsWaiver = method.stickers && custom.active.length > 0
  const waiverOk = waiver.accepted && waiver.signedName.trim() !== ''
  const blockReason = !method.stickers
    ? null
    : custom.uploading
      ? 'Đang tải hình sticker của bạn lên, chờ một chút…'
      : needsWaiver && !waiverOk
        ? 'Cần tick đồng ý và ký tên vào cam kết bản quyền ở phần “Sticker của riêng bạn” để đặt hàng.'
        : null
  // Sticker tự tải lên đã bị bỏ thì không hiện trên bản phối nữa; ảnh lấy theo bản đang chọn (gốc / tách nền)
  const customOf = (key) => custom.items.find((c) => c.key === key && c.status !== 'error')
  const shownDesign = design
    .filter((it) => !it.custom || customOf(it.custom))
    .map((it) => (it.custom ? { ...it, src: customOf(it.custom).url } : it))
  const visibleDesign = shownDesign.filter((it) => !it.hidden)
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
    if (needsWaiver && !waiverOk) e.waiver = 'Hãy tick đồng ý và ghi họ tên để ký cam kết.'
    const first = ['size', 'waiver', 'name', 'phone', 'address'].find((k) => e[k])
    if (first) {
      const el = document.getElementById(`${uid}-${first}`)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (first !== 'size' && first !== 'waiver') el?.focus({ preventScroll: true })
      return
    }
    setBusy(true)
    try {
      // Ảnh mockup áo / túi kèm sticker gửi kèm đơn để studio biết vị trí ép (lỗi thì vẫn đặt hàng được)
      let preview
      if (visibleDesign.length) {
        try {
          const blob = await renderMockup(visualRef.current.querySelector('.tee-visual'), visibleDesign, 1000)
          if (blob)
            preview = (
              await uploadSticker(new File([blob], `mockup-${productKey}.png`, { type: 'image/png' }))
            ).id
        } catch {
          preview = undefined
        }
      }
      // Bản phối gửi lên: sticker thư viện theo hình + bộ, sticker tự tải lên theo vị trí trong customStickers
      const design = visibleDesign
        .filter((it) => !it.custom || custom.done.some((c) => c.key === it.custom))
        .map(({ id: _id, custom: key, src: _src, hidden: _h, locked: _l, ...it }) =>
          key
            ? { x: it.x, y: it.y, r: it.r, s: it.s, upload: custom.done.findIndex((c) => c.key === key) }
            : it
        )
      const res = await createOrder({
        combo: combo.slug,
        product: productKey,
        color: color.key,
        size,
        qty,
        stickerSets: chosenSets.map((s) => ({ key: s.key, qty: sets[s.key] })),
        delivery,
        payment,
        voucher,
        customer: { ...customer, phone: customer.phone.replace(/\s/g, '') },
        customStickers: needsWaiver ? custom.done.map((c) => ({ id: c.id, cut: !!(c.useCut && c.cut) })) : [],
        waiver: needsWaiver
          ? { accepted: true, signedName: waiver.signedName.trim(), version: WAIVER_VERSION }
          : undefined,
        design,
        preview,
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
        stickerSets: chosenSets.map((s) => ({ name: s.name, qty: sets[s.key] })),
        customCount: needsWaiver ? custom.done.length : 0,
        delivery: DELIVERY.find((d) => d.key === delivery).label,
        payment: PAYMENTS.find((p) => p.key === payment).label,
        phone: customer.phone,
      })
      // Hình đã gắn vào đơn này, đơn sau phải tải và ký lại
      custom.reset()
      setWaiver({ accepted: false, signedName: '' })
      setDesign((d) => d.filter((it) => !it.custom))
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
          <div className="pp-main tee-main" ref={visualRef}>
            <ProductVisual
              {...visual}
              design={shownDesign}
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
            {visibleDesign.length > 0 && <span className="pp-view-tag">Bản phối của bạn</span>}
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
                <OptionGroup label="Bộ sticker" note="không bắt buộc, chọn được nhiều bộ">
                  <div className="tee-sets">
                    {STICKER_SETS.map((st) => (
                      <button
                        key={st.key}
                        type="button"
                        className="tee-set"
                        aria-pressed={!!sets[st.key]}
                        onClick={() => toggleSet(st.key)}
                      >
                        <span className="tee-set-art" aria-hidden="true">
                          {st.stickers.map(([shape, color], i) => (
                            <Sticker key={i} shape={shape} color={color} style={{ width: 26 }} />
                          ))}
                        </span>
                        <span className="tee-set-name">
                          {st.name} <small>(mẫu)</small>
                        </span>
                        <span className="tee-set-price">
                          {sets[st.key] ? '✓ Đã chọn' : `+${vnd(PRICING.stickerSet)} / bộ`}
                        </span>
                      </button>
                    ))}
                  </div>
                  {chosenSets.map((st) => (
                    <div key={st.key} className="tee-qty">
                      <Stepper
                        value={sets[st.key]}
                        min={1}
                        label={`Số bộ ${st.name}`}
                        onChange={(n) => setSets((m) => ({ ...m, [st.key]: clampInt(n, 1, 999) }))}
                      />
                      <span>{st.name}</span>
                    </div>
                  ))}
                </OptionGroup>
              )}

              {/* 5b. Sticker khách tự tải lên + cam kết bản quyền (chỉ gói ép nhiệt) */}
              {method.stickers && (
                <CustomStickers
                  uid={uid}
                  custom={custom}
                  waiver={waiver}
                  onWaiver={(w) => {
                    setWaiver(w)
                    if (errors.waiver) setErrors((e) => ({ ...e, waiver: undefined }))
                  }}
                  waiverError={errors.waiver}
                />
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
                      {chosenSets.map((st) => (
                        <tr key={st.key}>
                          <th scope="row">
                            {st.name}
                            <small>{vnd(PRICING.stickerSet)} / bộ</small>
                          </th>
                          <td>{sets[st.key]}</td>
                          <td>{vnd(PRICING.stickerSet * sets[st.key])}</td>
                        </tr>
                      ))}
                      {q.customTotal > 0 && (
                        <tr>
                          <th scope="row">
                            Sticker của bạn
                            <small>{vnd(PRICING.customSticker)} / hình</small>
                          </th>
                          <td>{custom.active.length}</td>
                          <td>{vnd(q.customTotal)}</td>
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
                    : `Giá dự kiến của studio. ${method.stickers ? 'Giá bộ sticker, phí' : 'Phí'} vận chuyển và mã giảm giá đang là số mẫu.`}
                </p>
              </section>

              {/* Live mặc thử áo bằng camera (chỉ áo) */}
              {productKey === 'ao' && (
                <button
                  type="button"
                  className="btn btn-glass btn-block tee-live"
                  onClick={() => setLive(true)}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Live mặc thử áo
                </button>
              )}

              {/* 7. Phối thử + Đặt hàng */}
              {/* Gói in lụa không có sticker để phối nên ẩn Phối thử */}
              <div className={`tee-actions${method.stickers ? '' : ' tee-actions-single'}`}>
                {method.stickers && (
                  <button type="button" className="btn btn-glass" onClick={() => setStudio(true)}>
                    Phối thử
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-brand"
                  onClick={placeOrder}
                  disabled={busy || !!blockReason}
                  aria-describedby={blockReason ? `${uid}-block` : undefined}
                >
                  {busy ? 'Đang gửi đơn…' : `Đặt hàng · ${vnd(q.total)}`}
                </button>
              </div>
              {blockReason && (
                <p className="tee-block" id={`${uid}-block`}>
                  {blockReason}
                </p>
              )}
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

      {live && (
        <LiveTryOn
          makeTexture={() =>
            renderMockup(visualRef.current.querySelector('.tee-visual'), visibleDesign, 800, {
              transparent: true,
              baseSrc: product.cutout,
            })
          }
          onClose={() => setLive(false)}
        />
      )}
      {studio && (
        <DesignStudio
          productKey={productKey}
          products={products}
          onProduct={onProduct}
          combos={combos}
          combo={combo}
          onCombo={pickCombo}
          color={color}
          onColor={setColorKey}
          stickerSets={STICKER_SETS}
          chosenSets={sets}
          onUseSet={useSet}
          custom={custom}
          initial={design}
          onChange={setDesign}
          total={q.total}
          onOrder={() => {
            setStudio(false)
            setTimeout(
              () => document.getElementById(`${uid}-pay`)?.scrollIntoView({ behavior: 'smooth' }),
              60
            )
          }}
          onClose={() => setStudio(false)}
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
        {placed.customCount > 0 && (
          <div>
            <dt>Sticker của bạn (đã ký cam kết)</dt>
            <dd>× {placed.customCount}</dd>
          </div>
        )}
        {placed.stickerSets.map((st) => (
          <div key={st.name}>
            <dt>{st.name}</dt>
            <dd>× {st.qty}</dd>
          </div>
        ))}
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
