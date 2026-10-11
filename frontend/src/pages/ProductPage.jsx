import { useId, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCombos } from '../data/useCombos.js'
import { useCart } from '../cart.jsx'
import { ORDER_MODES, PRINT_METHOD, PRINT_SIDES, PRODUCTS, formatPrice } from '../data/products.js'
import { TeeArt, ToteArt } from '../components/GarmentArt.jsx'
import Sticker from '../components/Sticker.jsx'
import ComboMissing from './ComboMissing.jsx'

const ART = { ao: TeeArt, tui: ToteArt }

// Sticker minh hoạ trên ảnh chính (toạ độ % theo khung hình áo/túi)
const DEMO_STICKERS = {
  ao: {
    front: [
      { shape: 'star', color: 'var(--sun)', x: 40, y: 44, r: -12, s: 15 },
      { shape: 'smile', color: 'var(--pink)', x: 60, y: 58, r: 8, s: 16 },
      { shape: 'blob', color: 'var(--mint)', x: 44, y: 74, r: 4, s: 18, label: 'tùm lum' },
    ],
    back: [
      { shape: 'flower', color: 'var(--sky)', x: 50, y: 46, r: 10, s: 22 },
      { shape: 'heart', color: 'var(--pink)', x: 42, y: 72, r: -8, s: 13 },
    ],
  },
  tui: {
    front: [
      { shape: 'heart', color: 'var(--pink)', x: 36, y: 56, r: 10, s: 20 },
      { shape: 'bolt', color: 'var(--sky)', x: 64, y: 66, r: -8, s: 18 },
      { shape: 'flower', color: 'var(--sun)', x: 46, y: 82, r: 14, s: 19 },
    ],
    back: [{ shape: 'smile', color: 'var(--mint)', x: 50, y: 66, r: -6, s: 26 }],
  },
}
// Tay áo: nhìn mặt trước thì tay trái của người mặc nằm bên phải hình
const SLEEVES = {
  'Tay trái': { front: 80, back: 20 },
  'Tay phải': { front: 20, back: 80 },
}

const STEPS = [
  ['Đặt hàng', 'Chọn món, màu, size, số lượng rồi thêm vào giỏ.'],
  ['Nhận mã đơn', 'Studio gửi mã đơn và xác nhận lại lựa chọn với bạn.'],
  ['Chọn hoặc gửi sticker', 'Chọn từ kho sticker của studio, hoặc gửi thiết kế riêng của bạn.'],
  ['In ép nhiệt', 'Studio in ép nhiệt, bạn nhận tại studio hoặc nhận hàng giao tận nơi.'],
]

const POLICIES = [
  ['Giao hàng', 'M3 7h11v9H3zM14 10h4l3 3v3h-7'],
  ['Đổi trả', 'M4 9a8 8 0 0114-3l2 2M20 15a8 8 0 01-14 3l-2-2M20 4v4h-4M4 20v-4h4'],
  [
    'Hoàn tiền',
    'M3 6h18v12H3zM12 9v6M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.5-1 1.4-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5',
  ],
]

const TABS = ['Mô tả', 'Bảng size', 'Bảo quản']

export default function ProductPage() {
  const { slug, product } = useParams()
  const combo = useCombos().find((c) => c.slug === slug)
  if (!PRODUCTS[product]) return <Navigate to={`/combo/${slug}`} replace />
  if (!combo) return <ComboMissing />
  // key: đổi combo/món thì bắt đầu lại lựa chọn từ đầu
  return <ProductView key={`${slug}/${product}`} combo={combo} product={PRODUCTS[product]} />
}

function initialState(product) {
  return {
    orderMode: ORDER_MODES[0],
    printSide: PRINT_SIDES[0],
    extras: [],
    color: product.colors[0].key,
    size: product.sizes.length > 1 ? null : product.sizes[0],
    qty: {},
  }
}

function ProductView({ combo, product }) {
  const navigate = useNavigate()
  const { add } = useCart()
  const [opts, setOpts] = useState(() => initialState(product))
  const [view, setView] = useState({ color: product.colors[0].key, side: 'front' }) // side: front | back | size
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(0)

  const set = (patch) => setOpts((o) => ({ ...o, ...patch }))
  const cell = (size, color) => `${size}|${color}`
  const total = Object.values(opts.qty).reduce((n, v) => n + v, 0)
  const colorOf = (key) => product.colors.find((c) => c.key === key)
  const hasSizes = product.sizes.length > 1

  function setQty(size, color, value) {
    const n = Math.max(0, Math.min(999, Math.floor(Number(value)) || 0))
    setOpts((o) => ({ ...o, qty: { ...o.qty, [cell(size, color)]: n } }))
    if (n > 0) setError(null)
  }

  function pickColor(key) {
    set({ color: key })
    setView((v) => ({ color: key, side: v.side === 'size' ? 'front' : v.side }))
  }

  function pickSide(side) {
    set({ printSide: side })
    if (side === PRINT_SIDES[1]) setView((v) => ({ ...v, side: 'back' }))
    if (side === PRINT_SIDES[0]) setView((v) => ({ ...v, side: 'front' }))
  }

  function pickSize(size) {
    set({ size })
    // Chưa nhập số lượng thì điền sẵn 1 cho ô size × màu đang chọn
    if (total === 0) setQty(size, opts.color, 1)
  }

  function toggleExtra(x) {
    set({ extras: opts.extras.includes(x) ? opts.extras.filter((e) => e !== x) : [...opts.extras, x] })
  }

  function reset() {
    setOpts(initialState(product))
    setView({ color: product.colors[0].key, side: 'front' })
    setError(null)
  }

  function addToCart() {
    if (total === 0) {
      setError(`Nhập số lượng ít nhất 1 ${product.unit} ở bảng số lượng.`)
      return
    }
    const quantities = Object.entries(opts.qty)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => {
        const [size, color] = k.split('|')
        return { size, color: colorOf(color).name, qty: n }
      })
    add({
      combo: combo.slug,
      comboName: combo.name,
      price: combo.price ?? null,
      product: product.key,
      options: {
        orderMode: opts.orderMode,
        printSide: opts.printSide,
        extras: opts.extras,
        method: PRINT_METHOD,
      },
      quantities,
      total,
    })
    setOpts((o) => ({ ...o, qty: {} }))
  }

  const printsFront = opts.printSide !== PRINT_SIDES[1]
  const printsBack = opts.printSide !== PRINT_SIDES[0]
  const Art = ART[product.key]

  function stage(colorKey, side, big) {
    const c = colorOf(colorKey)
    const showPrint = big && (side === 'front' ? printsFront : printsBack)
    return (
      <div className={`pp-art pp-art-${product.key}`}>
        <Art fill={c.fill} seam={c.seam} side={side} className="pp-svg" />
        {showPrint &&
          DEMO_STICKERS[product.key][side].map((k, i) => (
            <Sticker
              key={i}
              shape={k.shape}
              color={k.color}
              label={k.label}
              className="pp-sticker"
              style={{ left: `${k.x}%`, top: `${k.y}%`, width: `${k.s}%`, rotate: `${k.r}deg` }}
            />
          ))}
        {big &&
          opts.extras
            .filter((x) => SLEEVES[x])
            .map((x) => (
              <Sticker
                key={x}
                shape="star"
                color="var(--sky)"
                className="pp-sticker"
                style={{ left: `${SLEEVES[x][side]}%`, top: '22%', width: '9%' }}
              />
            ))}
      </div>
    )
  }

  const thumbs = [
    ...product.colors.flatMap((c) => [
      { color: c.key, side: 'front', label: `${c.name}, mặt trước` },
      { color: c.key, side: 'back', label: `${c.name}, mặt sau` },
    ]),
    { color: view.color, side: 'size', label: 'Bảng size' },
  ]

  return (
    <div className="page product">
      <div className="pp-grid">
        {/* ---------- Cột trái: ảnh ---------- */}
        <div className="pp-gallery">
          <div className="pp-main">
            {view.side === 'size' ? (
              <SizeChart chart={product.sizeChart} />
            ) : (
              <>
                {stage(view.color, view.side, true)}
                <span className="pp-view-tag">
                  {colorOf(view.color).name} · {view.side === 'front' ? 'Mặt trước' : 'Mặt sau'}
                </span>
              </>
            )}
          </div>
          <ul className="pp-thumbs" aria-label="Ảnh sản phẩm">
            {thumbs.map((t) => {
              const active =
                view.side === 'size' ? t.side === 'size' : t.side === view.side && t.color === view.color
              return (
                <li key={`${t.color}-${t.side}`}>
                  <button
                    type="button"
                    className="pp-thumb"
                    aria-pressed={active}
                    aria-label={t.label}
                    onClick={() => setView({ color: t.color, side: t.side })}
                  >
                    {t.side === 'size' ? (
                      <span className="pp-thumb-size">Bảng size</span>
                    ) : (
                      stage(t.color, t.side)
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ---------- Cột phải: thông tin + tuỳ chọn ---------- */}
        <div className="pp-info">
          <nav className="crumbs" aria-label="Đường dẫn">
            <Link to="/">Trang chủ</Link>
            <span aria-hidden="true">›</span>
            <Link to={`/combo/${combo.slug}`}>{combo.name}</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{product.name}</span>
          </nav>
          <span className="pp-new">Mới</span>
          <h1 className="pp-title">
            {product.title} <em>· {combo.name}</em>
          </h1>
          <p className="pp-price">
            {formatPrice(combo.price)}
            {combo.price != null && <small> / {product.unit}</small>}
          </p>
          <p className="pp-stock">
            <span className="dot" aria-hidden="true" /> Có hàng tại studio
          </p>
          <p className="pp-blurb">{product.blurb}</p>

          <Pills
            label="Cách đặt hàng"
            options={ORDER_MODES}
            value={opts.orderMode}
            onChange={(v) => set({ orderMode: v })}
          />
          <Pills label="Mặt in" options={PRINT_SIDES} value={opts.printSide} onChange={pickSide} />
          {product.extras.length > 0 && (
            <Pills
              label="Vị trí in thêm"
              note="phụ thu, chọn nhiều"
              options={product.extras}
              value={opts.extras}
              onChange={toggleExtra}
              multi
            />
          )}
          <Pills label="Công nghệ in" options={[PRINT_METHOD]} value={PRINT_METHOD} onChange={() => {}} />

          <OptionGroup label={product.key === 'ao' ? 'Màu áo' : 'Màu túi'}>
            {product.colors.map((c) => (
              <button
                key={c.key}
                type="button"
                className="swatch"
                aria-pressed={opts.color === c.key}
                onClick={() => pickColor(c.key)}
              >
                <span className="swatch-dot" style={{ background: c.fill }} aria-hidden="true" />
                {c.name}
              </button>
            ))}
          </OptionGroup>

          {hasSizes && (
            <Pills
              label="Size áo"
              options={product.sizes}
              value={opts.size}
              onChange={pickSize}
              aside={
                <button
                  type="button"
                  className="link"
                  onClick={() => setView((v) => ({ ...v, side: 'size' }))}
                >
                  Hướng dẫn chọn size
                </button>
              }
            />
          )}

          {/* Bảng số lượng: size × màu */}
          <OptionGroup label="Số lượng">
            <div className="qty-wrap">
              <table className="qty">
                <thead>
                  <tr>
                    <th scope="col">{hasSizes ? 'Size' : ''}</th>
                    {product.colors.map((c) => (
                      <th key={c.key} scope="col" className={opts.color === c.key ? 'is-on' : undefined}>
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {product.sizes.map((s) => (
                    <tr key={s} className={hasSizes && opts.size === s ? 'is-on' : undefined}>
                      <th scope="row">
                        {hasSizes ? s : product.unit[0].toUpperCase() + product.unit.slice(1)}
                      </th>
                      {product.colors.map((c) => (
                        <td key={c.key}>
                          <Stepper
                            value={opts.qty[cell(s, c.key)] ?? 0}
                            label={`Số lượng ${product.unit} ${hasSizes ? `size ${s}, ` : ''}màu ${c.name}`}
                            onChange={(n) => setQty(s, c.key, n)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="qty-total">
              Tổng: <strong>{total}</strong> {product.unit}
            </p>
          </OptionGroup>

          {/* Bảng tính giá */}
          <div className="pp-quote">
            <p className="eyebrow">Bảng tính giá</p>
            <dl>
              <div>
                <dt>Giá combo</dt>
                <dd>
                  {combo.price == null ? (
                    <span className="pending">Chờ cập nhật</span>
                  ) : (
                    formatPrice(combo.price)
                  )}
                </dd>
              </div>
              <div>
                <dt>Số lượng</dt>
                <dd>
                  {total} {product.unit}
                </dd>
              </div>
              {opts.extras.length > 0 && (
                <div>
                  <dt>Phụ thu: {opts.extras.join(', ')}</dt>
                  <dd className="pending">Chờ cập nhật</dd>
                </div>
              )}
              <div className="pp-quote-sum">
                <dt>Tạm tính</dt>
                <dd>
                  {combo.price == null ? (
                    <span className="pending">Chờ cập nhật</span>
                  ) : (
                    formatPrice(combo.price * total)
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="pp-actions">
            <button
              type="button"
              className="btn btn-light btn-block"
              onClick={() => navigate(`/combo/${combo.slug}/${product.key}/sticker`)}
            >
              Chọn sticker
            </button>
            <button type="button" className="btn btn-glass btn-block" onClick={addToCart}>
              Thêm vào giỏ hàng
            </button>
            {error && (
              <p className="field-err pp-err" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="link pp-reset" onClick={reset}>
              Xóa lựa chọn
            </button>
          </div>

          <div className="pp-howto">
            <p className="eyebrow">Cách đặt hàng</p>
            <ol>
              {STEPS.map(([t, d]) => (
                <li key={t}>
                  <strong>{t}</strong>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="pp-policy">
            <p className="eyebrow">Chính sách hỗ trợ</p>
            <ul>
              {POLICIES.map(([t, d]) => (
                <li key={t}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                  <strong>{t}:</strong> <span className="pending">Chờ cập nhật</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ---------- Tab thông tin ---------- */}
      <section className="pp-tabs">
        <div className="auth-tabs" role="tablist" aria-label="Thông tin sản phẩm">
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`pp-tab-${i}`}
              aria-selected={tab === i}
              aria-controls={`pp-panel-${i}`}
              tabIndex={tab === i ? 0 : -1}
              onClick={() => setTab(i)}
              onKeyDown={(e) => {
                const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
                if (!d) return
                const next = (i + d + TABS.length) % TABS.length
                setTab(next)
                document.getElementById(`pp-tab-${next}`)?.focus()
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="pp-panel" role="tabpanel" id={`pp-panel-${tab}`} aria-labelledby={`pp-tab-${tab}`}>
          {tab === 0 && (
            <>
              <p className="placeholder-note">
                Nội dung mẫu: mô tả chất liệu và định lượng sẽ được thay khi có thông tin thật.
              </p>
              <p>
                {product.title} thuộc {combo.name}. {product.blurb} Sticker được in ép nhiệt trực tiếp tại
                studio nên bám chắc, không bong khi mặc và giặt đúng cách.
              </p>
            </>
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
    </div>
  )
}

function OptionGroup({ label, note, aside, children }) {
  const id = useId()
  return (
    <div className="opt" role="group" aria-labelledby={id}>
      <div className="opt-head">
        <p className="opt-label" id={id}>
          Chọn {label.toLowerCase()}
          {note && <small> ({note})</small>}
        </p>
        {aside}
      </div>
      <div className="pills">{children}</div>
    </div>
  )
}

function Pills({ label, note, aside, options, value, onChange, multi }) {
  return (
    <OptionGroup label={label} note={note} aside={aside}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="pill"
          aria-pressed={multi ? value.includes(o) : value === o}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </OptionGroup>
  )
}

function Stepper({ value, label, onChange }) {
  return (
    <div className="stepper">
      <button
        type="button"
        aria-label={`Bớt 1, ${label}`}
        onClick={() => onChange(value - 1)}
        disabled={value === 0}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="999"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" aria-label={`Thêm 1, ${label}`} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

function SizeChart({ chart }) {
  return (
    <div className="size-chart">
      <table>
        <thead>
          <tr>
            {chart.head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((r) => (
            <tr key={r[0]}>
              {r.map((v, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {v}
                  </th>
                ) : (
                  <td key={i}>{v}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="size-note">{chart.note}</p>
    </div>
  )
}
