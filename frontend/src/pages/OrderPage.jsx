import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { createOrder, uploadSticker } from '../api.js'
import { CHOICES, tierOf } from '../data/combos.js'
import { PRODUCTS, contentsOf, productFor } from '../data/products.js'
import {
  DELIVERY,
  PAYMENTS,
  PRICING,
  PROVINCES,
  choicesOf,
  findVoucher,
  priceOf,
  quote,
  vnd,
} from '../data/pricing.js'
import { STICKER_SETS } from '../data/stickerSets.js'
import { WAIVER_VERSION } from '../data/consent.js'
import { normalizeDesign, onSide } from '../data/design.js'
import { useCustomStickers } from '../data/useCustomStickers.js'
import { OptionGroup, Pills, SizeChart, Stepper } from '../components/ProductParts.jsx'
import Sticker from '../components/Sticker.jsx'
import ProductVisual from '../components/ProductVisual.jsx'
import DesignStudio from '../components/DesignStudio.jsx'
import LiveTryOn from '../components/LiveTryOn.jsx'
import { renderMockup } from '../data/mockup.js'
import { useAnywearTryOn } from '../data/anywear.js'
import CustomStickers from '../components/CustomStickers.jsx'

// Trang đặt hàng áo hoặc túi (trắng) trong bộ kit cơ bản – in chuyển nhiệt (Combo 1 / Combo 2).
// Ảnh món (xem mặt trước / mặt sau) + "Bộ kit gồm" bên trái; bên phải: hướng dẫn size → chọn combo → size
// → số lượng → Combo 1: chọn 1 trong 3 cách làm sticker (tự vẽ / tải hình / bộ sticker có sẵn); Combo 2: bộ có sẵn
// → tấm sticker mua thêm (in lại đúng nội dung đã chọn theo khổ A5 / A4)
// → thanh toán (nhận hàng, tỉnh / thành, thanh toán, mã giảm giá, bảng tính giá) → Phối thử / Đặt hàng.
// Sticker không tính tiền riêng; phí giao theo tỉnh (xem data/pricing.js).
const PHONE_RE = /^0\d{9}$/
const EMPTY_CUSTOMER = { name: '', phone: '', address: '', note: '' }
const clampInt = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number(n)) || lo))
// Hình minh hoạ bộ kit (cắt từ bảng giá của studio)
const KIT_ART = { ao: '/images/kits/kit-ao.webp', tui: '/images/kits/kit-tui.webp' }
const SIDES = [
  ['front', 'Mặt trước'],
  ['back', 'Mặt sau'],
]

// Bản phối của từng món (áo / túi) lưu trong sessionStorage theo gói, để tải lại trang không mất.
// Hình khách tự tải lên / tự vẽ không lưu được (ảnh chỉ nằm trong trình duyệt), nên chỉ lưu sticker thư viện.
const designKey = (tier) => `tl-design:${tier}`
function loadDesigns(tier) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(designKey(tier))) ?? {}
    return Object.fromEntries(Object.entries(saved).map(([k, list]) => [k, normalizeDesign(list, k)]))
  } catch {
    return {}
  }
}

// Khung in A4 (dọc / ngang) từng mặt của từng món, lưu cùng chỗ với bản phối
const framesKey = (tier) => `tl-frames:${tier}`
function loadFrames(tier) {
  try {
    return JSON.parse(sessionStorage.getItem(framesKey(tier))) ?? {}
  } catch {
    return {}
  }
}

function validate({ size, customer, delivery, province }) {
  const e = {}
  if (!size) e.size = 'Chọn size.'
  if (!customer.name.trim()) e.name = 'Nhập họ tên người nhận.'
  if (!PHONE_RE.test(customer.phone.replace(/\s/g, ''))) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0.'
  if (delivery === 'giao-hang' && !province) e.province = 'Chọn tỉnh / thành phố nhận hàng.'
  if (delivery === 'giao-hang' && !customer.address.trim()) e.address = 'Nhập địa chỉ nhận hàng.'
  return e
}

// Ảnh mockup một mặt (khối ẩn trong trang) → id ảnh đã tải lên, hoặc undefined
async function uploadMockup(el, items, name) {
  if (!el || !items.length) return undefined
  try {
    const blob = await renderMockup(el.querySelector('.tee-visual'), items, 1000)
    return blob ? (await uploadSticker(new File([blob], name, { type: 'image/png' }))).id : undefined
  } catch {
    return undefined
  }
}

export default function OrderPage({ combos, combo, productKey, products, onProduct, user }) {
  const [, setSearchParams] = useSearchParams()
  const tier = tierOf(combo)
  const product = productFor(PRODUCTS[productKey], combo)
  const hasSizes = product.sizes.length > 1
  const unit = product.unit
  const tabs = ['Mô tả', hasSizes ? 'Bảng size' : 'Kích thước', 'Bảo quản']
  const uid = useId()
  const choices = choicesOf(combo.slug) // Combo 1: 3 cách làm sticker, chọn đúng 1

  const [sizeOpen, setSizeOpen] = useState(false)
  const [sizeChoice, setSize] = useState(null)
  // Đổi áo ↔ túi ngay trên trang: size cũ không hợp lệ thì phải chọn lại, túi chỉ có một size
  const size = hasSizes ? (product.sizes.includes(sizeChoice) ? sizeChoice : null) : product.sizes[0]
  const color = product.colors[0] // áo và túi đều màu trắng
  const [qty, setQty] = useState(1)
  const [sets, setSets] = useState({}) // bộ sticker đi kèm đã chọn (Combo 1): { [key]: số bộ }
  const [sheets, setSheets] = useState({}) // tấm sticker mua thêm: { a5, a4 }
  // Combo 2: nội dung tấm mua thêm theo khổ: 'combo' (bộ đi kèm) hoặc khoá một bộ sticker của shop
  const [sheetSets, setSheetSets] = useState({})
  const [choiceKey, setChoice] = useState(null) // cách làm sticker của Combo 1
  const [side, setSide] = useState('front') // mặt đang xem
  const [customer, setCustomer] = useState(() => ({
    ...EMPTY_CUSTOMER,
    name: user?.name ?? '',
    phone: user?.phone ?? '',
  }))
  const [delivery, setDelivery] = useState('giao-hang')
  const [province, setProvince] = useState('')
  const [payment, setPayment] = useState('cod')
  const [voucherInput, setVoucherInput] = useState('')
  const [voucher, setVoucher] = useState(null)
  const [voucherMsg, setVoucherMsg] = useState(null) // { type: 'ok' | 'error', text }
  const [errors, setErrors] = useState({})
  const [designs, setDesigns] = useState(() => loadDesigns(tier.key))
  const [frames, setFramesAll] = useState(() => loadFrames(tier.key))
  const [studio, setStudio] = useState(false)
  const [live, setLive] = useState(false) // live mặc thử áo bằng camera
  const visualRef = useRef(null)
  const exportRefs = { front: useRef(null), back: useRef(null) } // khối ẩn để xuất mockup từng mặt
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [placed, setPlaced] = useState(null)
  const [tab, setTab] = useState(0)
  const placedRef = useRef(null)
  const custom = useCustomStickers() // hình khách tự tải lên / tự vẽ
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

  const printFrame = frames[productKey]
  const setPrintFrame = useCallback((f) => setFramesAll((m) => ({ ...m, [productKey]: f })), [productKey])
  useEffect(() => {
    try {
      sessionStorage.setItem(framesKey(tier.key), JSON.stringify(frames))
    } catch {
      // trình duyệt chặn lưu trữ: bỏ qua
    }
  }, [frames, tier.key])

  // Combo 1: chọn 1 trong 3 (đổi cách thì các lớp của cách khác bị ẩn, không mất; đổi lại thì hiện lại)
  const choice = choices.includes(choiceKey) ? choiceKey : null
  const pickSet = choice === 'bo-sticker'
  const allowDraw = choice === 've'
  const allowUpload = choice === 'tai-len'
  // Bộ sticker có sẵn: chọn đúng 1 bộ, mỗi áo / túi 1 bộ
  const setKey = Object.keys(sets)[0] ?? null
  const chosenSets = pickSet && setKey ? STICKER_SETS.filter((st) => st.key === setKey) : []
  const setsQty = chosenSets.length ? qty : 0
  const chooseOneSet = (key) => setSets({ [key]: 1 })
  // Dùng sticker của một bộ trong trình phối: bộ đó thành bộ được chọn (Combo 1, cách bộ sticker có sẵn)
  const useSet = useCallback((key) => setSets((m) => (m[key] ? m : { [key]: 1 })), [])
  // Hình tự tạo đúng loại với cách đã chọn: tự vẽ → hình vẽ; tải hình → hình tải lên
  const ofChoice = (c) => (allowDraw ? !!c.drawn : allowUpload ? !c.drawn : false)
  const myActive = custom.active.filter(ofChoice)
  const myDone = custom.done.filter(ofChoice)
  const sheetCount = Object.values(sheets).reduce((n, x) => n + (x || 0), 0)
  const q = quote({ product: productKey, combo: combo.slug, qty, sheets, delivery, province, voucher })
  // Có hình tự tải lên / tự vẽ thì phải ký cam kết bản quyền; đang tải hình thì chưa cho đặt
  const needsWaiver = (allowDraw || allowUpload) && myActive.length > 0
  const waiverOk = waiver.accepted && waiver.signedName.trim() !== ''
  const blockReason = !(allowDraw || allowUpload)
    ? null
    : custom.uploading
      ? 'Đang tải hình của bạn lên, chờ một chút…'
      : needsWaiver && !waiverOk
        ? 'Cần tick đồng ý và ký tên vào cam kết bản quyền ở phần “Sticker của riêng bạn” để đặt hàng.'
        : null
  // Hình tự tải lên đã bị bỏ thì không hiện trên bản phối nữa; ảnh lấy theo bản đang chọn (gốc / tách nền)
  const customOf = (key) => custom.items.find((c) => c.key === key && c.status !== 'error' && ofChoice(c))
  // Chỉ hiện các lớp của cách làm sticker đang chọn: Combo 1 theo 1 trong 3; Combo 2 chỉ sticker có sẵn
  const libraryOk = (it) => (choices.length ? pickSet && (!setKey || it.set === setKey) : true)
  const shownDesign = design
    .filter((it) => (it.custom ? !!customOf(it.custom) : libraryOk(it)))
    .map((it) => (it.custom ? { ...it, src: customOf(it.custom).url } : it))
  const visibleDesign = shownDesign.filter((it) => !it.hidden)
  const sideItems = (s) => onSide(visibleDesign, s)
  // Live mặc thử áo: Anywear (AI của Decart) nếu nạp được widget, không thì áo 3D tự làm
  const tryOn = useAnywearTryOn({
    enabled: productKey === 'ao',
    hasDesign: sideItems('front').length > 0,
    makeImage: () =>
      renderMockup(exportRefs.front.current.querySelector('.tee-visual'), sideItems('front'), 1000, {
        baseSrc: product.cutout,
        type: 'image/jpeg',
        quality: 0.9,
      }),
    onFallback: () => setLive(true),
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
    const e = validate({ size, customer, delivery, province })
    if (choices.length && !choice) e.choice = `${combo.name}: chọn 1 trong 3 cách làm sticker.`
    else if (pickSet && !setsQty) e.choice = 'Chọn 1 bộ sticker có sẵn của shop.'
    else if (allowDraw && !myDone.length) e.choice = 'Vẽ ít nhất 1 hình trong Phối thử → Vẽ.'
    else if (allowUpload && !myDone.length) e.choice = 'Tải lên ít nhất 1 hình của bạn.'
    if (needsWaiver && !waiverOk) e.waiver = 'Hãy tick đồng ý và ghi họ tên để ký cam kết.'
    setErrors(e)
    setSubmitError(null)
    const first = ['size', 'choice', 'waiver', 'name', 'phone', 'province', 'address'].find((k) => e[k])
    if (first) {
      const el = document.getElementById(`${uid}-${first}`)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (!['size', 'choice', 'waiver'].includes(first)) el?.focus({ preventScroll: true })
      return
    }
    setBusy(true)
    try {
      // Ảnh mockup mặt trước / mặt sau kèm sticker gửi kèm đơn để studio biết vị trí ép (lỗi vẫn đặt hàng được)
      const preview = await uploadMockup(
        exportRefs.front.current,
        sideItems('front'),
        `mockup-${productKey}.png`
      )
      const previewBack = await uploadMockup(
        exportRefs.back.current,
        sideItems('back'),
        `mockup-${productKey}-sau.png`
      )
      // Bản phối gửi lên: sticker thư viện theo hình + bộ, hình tự tải lên theo vị trí trong customStickers
      const sent = visibleDesign
        .filter((it) => !it.custom || myDone.some((c) => c.key === it.custom))
        .map(({ id: _id, custom: key, src: _src, hidden: _h, locked: _l, drawing: _d, ar: _ar, ...it }) =>
          key
            ? {
                side: it.side,
                x: it.x,
                y: it.y,
                r: it.r,
                s: it.s,
                upload: myDone.findIndex((c) => c.key === key),
              }
            : it
        )
      const res = await createOrder({
        combo: combo.slug,
        product: productKey,
        color: color.key,
        size,
        qty,
        choice: choice ?? undefined,
        stickerSets: chosenSets.map((st) => ({ key: st.key, qty })),
        sheets,
        sheetSets: choices.length ? undefined : sheetSets,
        delivery,
        province: delivery === 'giao-hang' ? province : undefined,
        payment,
        voucher,
        customer: { ...customer, phone: customer.phone.replace(/\s/g, '') },
        customStickers: needsWaiver
          ? myDone.map((c) => ({ id: c.id, cut: !!(c.useCut && c.cut), drawn: !!c.drawn }))
          : [],
        waiver: needsWaiver
          ? { accepted: true, signedName: waiver.signedName.trim(), version: WAIVER_VERSION }
          : undefined,
        design: sent,
        printFrame: { front: printFrame?.front ?? 'doc', back: printFrame?.back ?? 'doc' },
        preview,
        previewBack,
      })
      setPlaced({
        code: res.code,
        totals: res.totals,
        comboName: combo.name,
        productName: product.name,
        hasSizes,
        size,
        qty,
        choiceName: choice ? CHOICES[choice].name : null,
        stickerSets: chosenSets.map((st) => ({ name: st.name, qty })),
        sheets: Object.entries(PRICING.sheets)
          .filter(([k]) => sheets[k])
          .map(([k, s]) => ({ name: s.name, qty: sheets[k] })),
        customCount: needsWaiver ? myDone.length : 0,
        delivery:
          DELIVERY.find((d) => d.key === delivery).label +
          (delivery === 'giao-hang' ? ` · ${PROVINCES.find((p) => p.key === province)?.name}` : ''),
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

  const shipText = `Đà Nẵng ${vnd(PRICING.shipping['da-nang'])} · miền Trung ${vnd(
    PRICING.shipping['mien-trung']
  )} · tỉnh khác ${vnd(PRICING.shipping['con-lai'])}; miễn phí cho đơn từ ${vnd(PRICING.freeShipFrom)}`

  return (
    <div className="page product tee-page">
      <div className="pp-grid">
        {/* ---------- Cột trái: ảnh món, xem mặt trước / mặt sau ---------- */}
        <div className="pp-gallery">
          <div className="pp-main tee-main" ref={visualRef}>
            <ProductVisual
              {...visual}
              side={side}
              design={shownDesign}
              alt={`${product.title}, ${side === 'back' ? 'mặt sau' : 'mặt trước'}`}
            />
            {combo.patterned && (
              <span className="tee-badge">
                <span className="tee-badge-swatch" aria-hidden="true" />
                In sẵn hoạ tiết đen trắng
              </span>
            )}
            {visibleDesign.length > 0 && <span className="pp-view-tag">Bản phối của bạn</span>}
            <div className="side-switch" role="group" aria-label="Xem mặt">
              {SIDES.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={side === k} onClick={() => setSide(k)}>
                  {label}
                  {sideItems(k).length > 0 && <b>{sideItems(k).length}</b>}
                </button>
              ))}
            </div>
          </div>
          <div className={`kit-inbox tone-${productKey}`}>
            <img src={KIT_ART[productKey]} alt="" loading="lazy" />
            <div>
              <p>Bộ kit gồm</p>
              <ul>
                {contentsOf(combo, productKey).map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
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
          <p className="kit-label">
            <span className="kit-no" aria-hidden="true">
              {tier.no}.
            </span>
            {tier.name} – {tier.method}
          </p>
          <h1 className="pp-title">
            {product.title} <em>· {combo.name}</em>
          </h1>
          <p className={`pp-price kit-price-pill kit-tone-${productKey}`}>
            {vnd(q.unit)} <small>/ {unit}</small>
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
              <OptionGroup label="Combo">
                <div className="tee-combos">
                  {combos.map((c, i) => (
                    <label key={c.slug} className="tee-combo">
                      <input
                        type="radio"
                        name={`${uid}-combo`}
                        value={c.slug}
                        checked={c.slug === combo.slug}
                        onChange={() => pickCombo(c.slug)}
                      />
                      <span className="tee-combo-head">
                        <strong className={`kit-tag tag-${i + 1}`}>{c.name}</strong>
                        <span>{vnd(priceOf(productKey, c.slug) ?? 0)}</span>
                      </span>
                      <span className="tee-combo-tag">{c.tagline}</span>
                      <ul>
                        {contentsOf(c, productKey).map((it) => (
                          <li key={it}>{it}</li>
                        ))}
                      </ul>
                    </label>
                  ))}
                </div>
              </OptionGroup>

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

              {/* 5. Combo 1: chọn 1 trong 3 cách làm sticker; Combo 2: bộ sticker có sẵn trong kit */}
              {choices.length ? (
                <OptionGroup label="Sticker của bạn" note="chọn 1 trong 3">
                  <div className="choice-cards" id={`${uid}-choice`} role="radiogroup">
                    {choices.map((k) => (
                      <label key={k} className="choice-card">
                        <input
                          type="radio"
                          name={`${uid}-choice-r`}
                          checked={choice === k}
                          onChange={() => {
                            setChoice(k)
                            if (errors.choice) setErrors((e) => ({ ...e, choice: undefined }))
                          }}
                        />
                        <Sticker shape={CHOICES[k].shape} color={CHOICES[k].color} style={{ width: 34 }} />
                        <strong>{CHOICES[k].name}</strong>
                        <small>{CHOICES[k].body}</small>
                      </label>
                    ))}
                  </div>
                  {errors.choice && <p className="field-err">{errors.choice}</p>}

                  {pickSet && (
                    <div className="tee-sets" role="radiogroup" aria-label="Bộ sticker">
                      {STICKER_SETS.map((st) => (
                        <button
                          key={st.key}
                          type="button"
                          className="tee-set"
                          aria-pressed={setKey === st.key}
                          onClick={() => {
                            chooseOneSet(st.key)
                            if (errors.choice) setErrors((e) => ({ ...e, choice: undefined }))
                          }}
                        >
                          <span className="tee-set-art" aria-hidden="true">
                            {st.stickers.map(([shape, c], i) => (
                              <Sticker key={i} shape={shape} color={c} style={{ width: 26 }} />
                            ))}
                          </span>
                          <span className="tee-set-name">
                            {st.name} <small>(mẫu)</small>
                          </span>
                          <span className="tee-set-price">
                            {setKey === st.key ? '✓ Đã chọn' : 'Chọn bộ này'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {pickSet && qty > 1 && <p className="upl-hint">Mỗi {unit} kèm 1 bộ đã chọn.</p>}
                </OptionGroup>
              ) : (
                <p className="kit-included">
                  Đã gồm 1 bộ sticker in chuyển nhiệt cho mỗi {unit} trong {combo.name}.
                </p>
              )}

              {/* 5b. Hình tự tải lên / tự vẽ + cam kết bản quyền (Combo 1, theo cách đã chọn) */}
              {(allowUpload || allowDraw) && (
                <CustomStickers
                  uid={uid}
                  custom={custom}
                  kind={allowDraw ? 'draw' : 'upload'}
                  onDraw={() => setStudio(true)}
                  waiver={waiver}
                  onWaiver={(w) => {
                    setWaiver(w)
                    if (errors.waiver) setErrors((e) => ({ ...e, waiver: undefined }))
                  }}
                  waiverError={errors.waiver}
                />
              )}
              {!choices.length && combos.some((c) => choicesOf(c.slug).length) && (
                <p className="kit-upload-off">
                  Muốn tự vẽ hay in hình của riêng bạn lên {unit}? Chọn Combo 1.
                  <button
                    type="button"
                    className="link"
                    onClick={() => pickCombo(combos.find((c) => choicesOf(c.slug).length).slug)}
                  >
                    Chuyển sang Combo 1
                  </button>
                </p>
              )}

              {/* 5c. Tấm sticker mua thêm (mọi combo) */}
              <OptionGroup label="Mua thêm tấm sticker" note="không bắt buộc">
                <p className="upl-hint sheet-note">
                  {choices.length
                    ? choice
                      ? `In lại nội dung bạn đã chọn (${CHOICES[choice].name.toLowerCase()}) trên khổ A5 / A4.`
                      : 'In lại nội dung bạn chọn ở trên (tự vẽ, hình của bạn hoặc bộ sticker) trên khổ A5 / A4.'
                    : 'Mặc định in bộ sticker đi kèm combo; đổi sang bộ khác của shop cho từng khổ nếu thích.'}
                </p>
                <div className="sheet-rows">
                  {Object.entries(PRICING.sheets).map(([k, sh]) => (
                    <div key={k} className="sheet-row">
                      <span className="sheet-name">
                        <strong>{sh.name}</strong>
                        <small>{vnd(sh.price)} / tấm</small>
                      </span>
                      <Stepper
                        value={sheets[k] ?? 0}
                        min={0}
                        label={`Số ${sh.name.toLowerCase()}`}
                        onChange={(n) => setSheets((m) => ({ ...m, [k]: clampInt(n, 0, PRICING.maxSheets) }))}
                      />
                      {!choices.length && sheets[k] > 0 && (
                        <select
                          className="sheet-set"
                          aria-label={`Nội dung ${sh.name.toLowerCase()}`}
                          value={sheetSets[k] ?? 'combo'}
                          onChange={(ev) => setSheetSets((m) => ({ ...m, [k]: ev.target.value }))}
                        >
                          <option value="combo">Bộ đi kèm {combo.name}</option>
                          {STICKER_SETS.map((st) => (
                            <option key={st.key} value={st.key}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </OptionGroup>

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
                          {d.key === 'giao-hang' && <small>{shipText}</small>}
                        </span>
                      </label>
                    ))}
                  </div>
                  {delivery === 'giao-hang' && (
                    <>
                      <div className="field">
                        <label htmlFor={`${uid}-province`}>Tỉnh / thành phố</label>
                        <select
                          id={`${uid}-province`}
                          value={province}
                          onChange={(ev) => {
                            setProvince(ev.target.value)
                            if (errors.province) setErrors((e) => ({ ...e, province: undefined }))
                          }}
                          aria-invalid={!!errors.province}
                          aria-describedby={errors.province ? `${uid}-province-err` : undefined}
                        >
                          <option value="">Chọn tỉnh / thành phố</option>
                          {PROVINCES.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {errors.province && (
                          <p className="field-err" id={`${uid}-province-err`}>
                            {errors.province}
                          </p>
                        )}
                      </div>
                      {field('address', 'Địa chỉ nhận hàng (số nhà, đường, phường / xã)', {
                        autoComplete: 'street-address',
                      })}
                    </>
                  )}
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
                          {hasSizes && size && ` · size ${size}`}
                          <small>
                            {vnd(q.unit)} / {unit}
                          </small>
                        </th>
                        <td>{qty}</td>
                        <td>{vnd(q.itemTotal)}</td>
                      </tr>
                      {choices.length ? (
                        choice && (
                          <tr>
                            <th scope="row">
                              {pickSet && chosenSets[0] ? chosenSets[0].name : CHOICES[choice].name}
                              <small>sticker đã gồm trong combo</small>
                            </th>
                            <td>{pickSet ? qty : myActive.length}</td>
                            <td>0₫</td>
                          </tr>
                        )
                      ) : (
                        <tr>
                          <th scope="row">
                            Bộ sticker in chuyển nhiệt
                            <small>đã gồm trong combo</small>
                          </th>
                          <td>{qty}</td>
                          <td>0₫</td>
                        </tr>
                      )}
                      {Object.entries(PRICING.sheets)
                        .filter(([k]) => sheets[k])
                        .map(([k, sh]) => (
                          <tr key={k}>
                            <th scope="row">
                              {sh.name}
                              <small>{vnd(sh.price)} / tấm</small>
                            </th>
                            <td>{sheets[k]}</td>
                            <td>{vnd(sh.price * sheets[k])}</td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row" colSpan={2}>
                          Phí vận chuyển
                        </th>
                        <td>
                          {q.shippingPending ? 'Chọn tỉnh' : q.shipping === 0 ? 'Miễn phí' : vnd(q.shipping)}
                        </td>
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
                  Giá dự kiến của studio. Sticker đi kèm và hình bạn tự tạo đã gồm trong giá combo
                  {sheetCount > 0 ? '; tấm sticker mua thêm tính theo tấm' : ''}. Mã giảm giá đang là số mẫu.
                </p>
              </section>

              {/* Live mặc thử áo bằng camera (chỉ áo, mặt trước) */}
              {productKey === 'ao' && (
                <>
                  <button
                    type="button"
                    className="btn btn-glass btn-block tee-live"
                    onClick={() => tryOn.start()}
                    disabled={tryOn.busy}
                    aria-busy={tryOn.busy}
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
                    {tryOn.busy ? 'Đang mở phòng thử…' : 'Live mặc thử áo'}
                  </button>
                  {tryOn.notice && (
                    <p className="auth-status error" role="alert">
                      {tryOn.notice}
                    </p>
                  )}
                </>
              )}

              {/* 7. Phối thử + Đặt hàng */}
              <div className="tee-actions">
                <button type="button" className="btn btn-glass" onClick={() => setStudio(true)}>
                  Phối thử
                </button>
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
              {product.blurb} Sticker in chuyển nhiệt bám chắc lên vải, không bong khi mặc và giặt đúng cách.
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

      {/* Khối ẩn để xuất mockup PNG từng mặt gửi kèm đơn */}
      <div className="studio-export" aria-hidden="true">
        {SIDES.map(([k]) => (
          <div key={k} ref={exportRefs[k]}>
            <ProductVisual {...visual} side={k} design={visibleDesign} />
          </div>
        ))}
      </div>

      {live && (
        <LiveTryOn
          makeTexture={(opts) =>
            renderMockup(exportRefs.front.current.querySelector('.tee-visual'), sideItems('front'), 800, {
              transparent: true,
              baseSrc: product.cutout,
              ...opts,
            })
          }
          color={color?.fill}
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
          stickerSets={STICKER_SETS}
          chosenSets={sets}
          onUseSet={useSet}
          custom={custom}
          allowUpload={allowUpload}
          allowDraw={allowDraw}
          libraryOn={!choices.length || pickSet}
          librarySets={pickSet && setKey ? [setKey] : null}
          initial={design}
          onChange={setDesign}
          initialFrames={printFrame}
          onFrames={setPrintFrame}
          total={q.total}
          onLive={tryOn.start}
          liveBusy={tryOn.busy}
          liveNotice={tryOn.notice}
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
            {placed.hasSizes ? `Size ${placed.size} × ` : '× '}
            {placed.qty}
          </dd>
        </div>
        {placed.choiceName && (
          <div>
            <dt>Sticker</dt>
            <dd>{placed.choiceName}</dd>
          </div>
        )}
        {placed.customCount > 0 && (
          <div>
            <dt>Hình bạn tự tạo (đã ký cam kết)</dt>
            <dd>× {placed.customCount}</dd>
          </div>
        )}
        {placed.stickerSets.map((st) => (
          <div key={st.name}>
            <dt>{st.name}</dt>
            <dd>× {st.qty}</dd>
          </div>
        ))}
        {placed.sheets.map((st) => (
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
