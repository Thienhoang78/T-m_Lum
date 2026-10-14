import { useCallback, useEffect, useRef, useState } from 'react'
import { PRODUCTS, productFor } from '../data/products.js'
import { PRICING, priceOf, vnd } from '../data/pricing.js'
import { MAX_CUSTOM_STICKERS } from '../data/consent.js'
import { renderMockup } from '../data/mockup.js'
import ProductVisual from './ProductVisual.jsx'
import Sticker from './Sticker.jsx'

// Trình phối kiểu Canva (toàn màn hình): thanh công cụ trái (Sản phẩm, Thư viện, Tải lên, Lớp),
// áo / túi ở giữa với khung vùng in. Kéo để di chuyển, nắm góc để đổi cỡ, nắm chấm trên để xoay,
// hai ngón để phóng to / xoay trên điện thoại. Có hoàn tác / làm lại, đường căn giữa, khoá / ẩn lớp.
// Dùng DOM + Pointer Events, không thêm thư viện vẽ.
//
// Phần tử (layer): { id, shape, color, label, set } (sticker trong thư viện)
//                  hoặc { id, custom } (hình khách tự tải lên, ảnh lấy theo bản đang chọn: gốc / tách nền)
//                  cùng x, y (tâm, % khung), s (bề ngang, % khung), r (độ xoay), hidden, locked.
// Thứ tự trong mảng là thứ tự lớp: phần tử cuối nằm trên cùng.

const SHAPE_NAMES = {
  star: 'Ngôi sao',
  heart: 'Trái tim',
  bolt: 'Tia sét',
  flower: 'Bông hoa',
  smile: 'Mặt cười',
  blob: 'Nhãn',
}
const TOOLS = [
  ['product', 'Sản phẩm', 'M8 4l4 2 4-2 4 3-2.5 4H16v9H8v-9H4.5L2 7z'],
  ['library', 'Thư viện', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
  ['upload', 'Tải lên', 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3'],
  ['layers', 'Lớp', 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5'],
]
const START_SIZE = 16
const SNAP = 1.2 // % khoảng hút vào đường giữa
const HISTORY = 60

let nextId = 1
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const withIds = (list) => list.map((it) => ({ ...it, id: it.id ?? nextId++ }))
const strip = (list) => list.map(({ id: _id, ...it }) => it)

// Giữ phần tử trong vùng in: cỡ không vượt vùng in, tâm lùi vào trong đủ nửa bề ngang
const fitIn = (s, area) => clamp(s, 4, Math.min(area.x1 - area.x0, area.y1 - area.y0))
function keepIn(it, area) {
  const half = it.s / 2
  return {
    ...it,
    x: area.x1 - area.x0 > it.s ? clamp(it.x, area.x0 + half, area.x1 - half) : (area.x0 + area.x1) / 2,
    y: area.y1 - area.y0 > it.s ? clamp(it.y, area.y0 + half, area.y1 - half) : (area.y0 + area.y1) / 2,
  }
}
// Tâm phần tử theo toạ độ màn hình
function centerOf(stage, it) {
  const r = stage.getBoundingClientRect()
  return { x: r.left + (it.x / 100) * r.width, y: r.top + (it.y / 100) * r.height }
}

function Icon({ d, size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function DesignStudio({
  productKey,
  products, // món nền có trong gói: ['ao', 'tui']
  onProduct,
  combos,
  combo,
  onCombo,
  color,
  onColor,
  stickerSets,
  chosenSets, // { [key]: số bộ }
  onUseSet,
  custom, // useCustomStickers()
  initial,
  onChange,
  total,
  onOrder,
  onClose,
}) {
  const dialogRef = useRef(null)
  const stageRef = useRef(null)
  const exportRef = useRef(null)
  const gesture = useRef(null)
  const pointers = useRef(new Map())
  const product = productFor(PRODUCTS[productKey], combo)
  const area = product.printArea
  const [tool, setTool] = useState('library')
  const [panelOpen, setPanelOpen] = useState(true)
  const [hist, setHist] = useState(() => ({ past: [], present: withIds(initial), future: [] }))
  const [selected, setSelected] = useState(null)
  const [guides, setGuides] = useState({ v: false, h: false })
  const [zoom, setZoom] = useState(100)
  const [dragLayer, setDragLayer] = useState(null)
  const [busy, setBusy] = useState(false)
  const items = hist.present
  const sel = items.find((it) => it.id === selected)

  // Ảnh hiện tại của hình tự tải lên (bản gốc hoặc đã tách nền); hình đã bị bỏ thì không hiện
  const customOf = (key) => custom.items.find((c) => c.key === key && c.status !== 'error')
  const srcOf = (it) => (it.custom ? customOf(it.custom)?.url : null)
  const live = items.filter((it) => !it.custom || customOf(it.custom))

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [])

  // Mỗi thay đổi đều lưu ngay về trang đặt hàng (không cần bấm Lưu)
  useEffect(() => {
    onChange(strip(items))
  }, [items, onChange])

  // ---------- Lịch sử: hoàn tác / làm lại ----------
  const commit = useCallback(
    (fn) =>
      setHist((h) => ({
        past: [...h.past, h.present].slice(-HISTORY),
        present: typeof fn === 'function' ? fn(h.present) : fn,
        future: [],
      })),
    []
  )
  const snapshot = () =>
    setHist((h) => ({ past: [...h.past, h.present].slice(-HISTORY), present: h.present, future: [] }))
  const setLive = (fn) => setHist((h) => ({ ...h, present: fn(h.present) }))
  const undo = () =>
    setHist((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past.at(-1), future: [h.present, ...h.future] }
        : h
    )
  const redo = () =>
    setHist((h) =>
      h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h
    )
  const update = (id, patch) => commit((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const fitSize = (v) => fitIn(v, area)
  const keepInside = (it) => keepIn(it, area)

  function add(base) {
    const it = keepInside({
      id: nextId++,
      ...base,
      x: (area.x0 + area.x1) / 2,
      y: (area.y0 + area.y1) / 2,
      r: 0,
      s: fitSize(START_SIZE),
    })
    commit((list) => [...list, it])
    setSelected(it.id)
    return it
  }
  const addSticker = (set, [shape, colorVar, label]) => {
    add({ shape, color: colorVar, label, set: set.key })
    onUseSet(set.key) // dùng sticker của bộ nào thì bộ đó được thêm vào đơn
  }
  const addCustom = (c) => add({ custom: c.key })

  function remove(id) {
    commit((list) => list.filter((it) => it.id !== id))
    setSelected(null)
  }
  function duplicate(id) {
    const src = items.find((it) => it.id === id)
    if (!src) return
    const copy = keepInside({ ...src, id: nextId++, x: src.x + 3, y: src.y + 3, locked: false })
    commit((list) => {
      const i = list.findIndex((it) => it.id === id)
      return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)]
    })
    setSelected(copy.id)
  }
  // dir: +1 đưa lên một lớp, -1 đưa xuống
  function move(id, dir) {
    commit((list) => {
      const i = list.findIndex((it) => it.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= list.length) return list
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  // Kéo thả trong bảng Lớp: đặt phần tử from vào vị trí của to (theo thứ tự hiển thị, trên cùng trước)
  function reorder(fromId, toId) {
    if (fromId === toId) return
    commit((list) => {
      const from = list.findIndex((it) => it.id === fromId)
      const next = list.filter((it) => it.id !== fromId)
      const to = next.findIndex((it) => it.id === toId)
      next.splice(from > list.findIndex((it) => it.id === toId) ? to : to + 1, 0, list[from])
      return next
    })
  }

  // Đổi áo ↔ túi: vùng in khác, đưa mọi phần tử vào trong vùng in mới (không tính vào lịch sử)
  useEffect(() => {
    setHist((h) => ({ ...h, present: h.present.map((it) => keepIn({ ...it, s: fitIn(it.s, area) }, area)) }))
  }, [area])

  // ---------- Kéo / đổi cỡ / xoay / hai ngón ----------
  const stageBox = () => stageRef.current.getBoundingClientRect()
  const toPct = (e) => {
    const r = stageBox()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }
  const centerPx = (it) => centerOf(stageRef.current, it)

  function startGesture(e, it, mode) {
    e.preventDefault()
    e.stopPropagation()
    setSelected(it.id)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (it.locked) return
    snapshot()
    const c = centerPx(it)
    const p = toPct(e)
    if (pointers.current.size >= 2) {
      // hai ngón: phóng to / xoay phần tử đang chọn
      const [a, b] = [...pointers.current.values()]
      gesture.current = {
        mode: 'pinch',
        id: it.id,
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        s: it.s,
        r: it.r,
      }
    } else {
      gesture.current = {
        mode,
        id: it.id,
        dx: p.x - it.x,
        dy: p.y - it.y,
        dist: Math.hypot(e.clientX - c.x, e.clientY - c.y) || 1,
        angle: Math.atan2(e.clientY - c.y, e.clientX - c.x),
        s: it.s,
        r: it.r,
      }
    }
  }

  useEffect(() => {
    const onMove = (e) => {
      if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const g = gesture.current
      if (!g) return
      setLive((list) =>
        list.map((it) => {
          if (it.id !== g.id) return it
          if (g.mode === 'move') {
            const r = stageRef.current.getBoundingClientRect()
            let x = ((e.clientX - r.left) / r.width) * 100 - g.dx
            let y = ((e.clientY - r.top) / r.height) * 100 - g.dy
            const cx = (area.x0 + area.x1) / 2
            const cy = (area.y0 + area.y1) / 2
            const v = Math.abs(x - cx) < SNAP
            const h = Math.abs(y - cy) < SNAP
            if (v) x = cx
            if (h) y = cy
            setGuides({ v, h })
            return keepIn({ ...it, x, y }, area)
          }
          if (g.mode === 'pinch') {
            const pts = [...pointers.current.values()]
            if (pts.length < 2) return it
            const [a, b] = pts
            const k = Math.hypot(a.x - b.x, a.y - b.y) / g.dist
            const ang = ((Math.atan2(b.y - a.y, b.x - a.x) - g.angle) * 180) / Math.PI
            return keepIn({ ...it, s: fitIn(g.s * k, area), r: Math.round(g.r + ang) }, area)
          }
          const c = centerOf(stageRef.current, it)
          if (g.mode === 'resize') {
            const k = Math.hypot(e.clientX - c.x, e.clientY - c.y) / g.dist
            return keepIn({ ...it, s: fitIn(g.s * k, area) }, area)
          }
          // xoay: hút về các góc 0 / 45 / 90...
          let r = g.r + ((Math.atan2(e.clientY - c.y, e.clientX - c.x) - g.angle) * 180) / Math.PI
          const snapTo = Math.round(r / 45) * 45
          if (Math.abs(r - snapTo) < 4) r = snapTo
          return { ...it, r: Math.round(((r + 540) % 360) - 180) }
        })
      )
    }
    const onUp = (e) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size === 0) {
        gesture.current = null
        setGuides({ v: false, h: false })
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // vùng in đổi khi đổi áo / túi
  }, [area])

  // ---------- Phím tắt ----------
  function onKeyDown(e) {
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      return e.shiftKey ? redo() : undo()
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      return redo()
    }
    if (!sel) return
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      return duplicate(sel.id)
    }
    if (sel.locked) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      return remove(sel.id)
    }
    const step = e.shiftKey ? 5 : 1
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[
      e.key
    ]
    if (d) {
      e.preventDefault()
      update(sel.id, keepInside({ ...sel, x: sel.x + d[0], y: sel.y + d[1] }))
    }
  }

  function close() {
    dialogRef.current?.close()
    onClose()
  }

  async function download() {
    setBusy(true)
    try {
      const blob = await renderMockup(exportRef.current.querySelector('.tee-visual'), visibleForExport, 1200)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tum-lum-${productKey}-${combo.slug}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } finally {
      setBusy(false)
    }
  }

  const visibleForExport = live.filter((it) => !it.hidden).map((it) => ({ ...it, src: srcOf(it) }))
  const layerName = (it) =>
    it.custom
      ? `Ảnh: ${customOf(it.custom)?.name ?? 'đã bỏ'}`
      : `${SHAPE_NAMES[it.shape] ?? 'Sticker'}${it.label ? ` “${it.label}”` : ''}`
  const thumb = (it, w = 34) =>
    it.custom ? (
      <img src={srcOf(it)} alt="" style={{ width: w, height: w }} />
    ) : (
      <Sticker shape={it.shape} color={it.color} label={it.label} style={{ width: w }} />
    )
  const pick = (t) => {
    if (t === tool) setPanelOpen(!panelOpen)
    else {
      setTool(t)
      setPanelOpen(true)
    }
  }
  const usedSets = new Set(items.filter((it) => it.set).map((it) => it.set))

  return (
    <dialog
      ref={dialogRef}
      className="studio"
      aria-label="Trình phối sticker"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        if (selected != null) setSelected(null)
        else close()
      }}
      onKeyDown={onKeyDown}
    >
      {/* ---------- Thanh trên ---------- */}
      <header className="studio-top">
        <button type="button" className="studio-back" onClick={close} aria-label="Quay lại trang đặt hàng">
          <Icon d="M15 5l-7 7 7 7" />
          <span className="brand">
            <span className="brand-dot" aria-hidden="true" />
            Tùm Lum <em>Studio</em>
          </span>
        </button>
        <div className="studio-actions" role="toolbar" aria-label="Thao tác">
          <button type="button" onClick={undo} disabled={!hist.past.length} title="Hoàn tác (Ctrl+Z)">
            <Icon d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" size={18} />
            <span>Hoàn tác</span>
          </button>
          <button type="button" onClick={redo} disabled={!hist.future.length} title="Làm lại (Ctrl+Y)">
            <Icon d="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3" size={18} />
            <span>Làm lại</span>
          </button>
          <button
            type="button"
            onClick={() => sel && remove(sel.id)}
            disabled={!sel || sel.locked}
            title="Xoá phần tử đang chọn (Delete)"
          >
            <Icon d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" size={18} />
            <span>Xoá</span>
          </button>
          <button type="button" onClick={download} disabled={busy} title="Tải mockup PNG">
            <Icon d="M12 4v12m0 0l-4.5-4.5M12 16l4.5-4.5M4 20h16" size={18} />
            <span>{busy ? 'Đang xuất…' : 'Tải xuống'}</span>
          </button>
        </div>
        <p className="studio-total">
          <small>Tổng tạm tính</small>
          <strong>{vnd(total)}</strong>
        </p>
        <button type="button" className="btn btn-dark btn-sm studio-done" onClick={close}>
          Xong
        </button>
        <button type="button" className="btn btn-brand btn-sm" onClick={onOrder}>
          Đặt hàng
        </button>
      </header>

      <div className={`studio-body${panelOpen ? '' : ' is-collapsed'}`}>
        {/* ---------- Thanh công cụ trái ---------- */}
        <nav className="studio-rail" role="tablist" aria-label="Công cụ">
          {TOOLS.map(([key, label, d]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tool === key && panelOpen}
              aria-controls="studio-panel"
              onClick={() => pick(key)}
            >
              <Icon d={d} />
              <span>{label}</span>
              {key === 'layers' && live.length > 0 && <b className="studio-count">{live.length}</b>}
            </button>
          ))}
        </nav>

        {/* ---------- Bảng của công cụ đang chọn ---------- */}
        {panelOpen && (
          <section
            className="studio-panel"
            id="studio-panel"
            role="tabpanel"
            aria-label={TOOLS.find((t) => t[0] === tool)[1]}
          >
            {tool === 'product' && (
              <>
                <h2 className="studio-h">Sản phẩm</h2>
                <div className="studio-choice" role="group" aria-label="Món nền">
                  {products.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={k === productKey}
                      onClick={() => onProduct(k)}
                    >
                      <strong>{PRODUCTS[k].name}</strong>
                      <small>từ {vnd(Math.min(...combos.map((c) => priceOf(k, c.slug) ?? Infinity)))}</small>
                    </button>
                  ))}
                </div>
                {combos.length > 1 && (
                  <>
                    <p className="opt-label">Combo</p>
                    <div className="studio-choice studio-choice-col" role="group" aria-label="Combo">
                      {combos.map((c) => (
                        <button
                          key={c.slug}
                          type="button"
                          aria-pressed={c.slug === combo.slug}
                          onClick={() => onCombo(c.slug)}
                        >
                          <strong>
                            {c.name} · {vnd(priceOf(productKey, c.slug) ?? 0)}
                          </strong>
                          <small>{c.tagline}</small>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {product.colors.length > 1 && (
                  <>
                    <p className="opt-label">Màu {product.unit}</p>
                    <div className="pills">
                      {product.colors.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          className="swatch"
                          aria-pressed={color.key === c.key}
                          onClick={() => onColor(c.key)}
                        >
                          <span className="swatch-dot" style={{ background: c.fill }} aria-hidden="true" />
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="studio-note">{product.blurb}</p>
              </>
            )}

            {tool === 'library' && (
              <>
                <h2 className="studio-h">Thư viện sticker</h2>
                <p className="studio-note">
                  Bấm hoặc kéo sticker lên {product.unit}. Dùng sticker của bộ nào thì bộ đó được thêm vào đơn
                  ({vnd(PRICING.stickerSet)}
                  /bộ, đổi số lượng ở trang đặt hàng).
                </p>
                {stickerSets.map((set) => (
                  <div key={set.key} className="studio-set">
                    <p className="studio-set-head">
                      <strong>
                        {set.name} <small>(mẫu)</small>
                      </strong>
                      {chosenSets[set.key] ? (
                        <span className="studio-tag">Đã thêm vào đơn × {chosenSets[set.key]}</span>
                      ) : (
                        <span className="studio-set-price">+{vnd(PRICING.stickerSet)}</span>
                      )}
                    </p>
                    <div className="studio-grid">
                      {set.stickers.map((k, i) => (
                        <button
                          key={i}
                          type="button"
                          className="studio-tile"
                          aria-label={`Thêm ${SHAPE_NAMES[k[0]] ?? 'sticker'} của ${set.name}`}
                          onClick={() => addSticker(set, k)}
                        >
                          <Sticker shape={k[0]} color={k[1]} label={k[2]} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {usedSets.size > 0 && (
                  <p className="studio-note">
                    Xoá sticker không tự bỏ bộ khỏi đơn; bỏ bộ ở trang đặt hàng nếu cần.
                  </p>
                )}
              </>
            )}

            {tool === 'upload' && (
              <>
                <h2 className="studio-h">Tải lên</h2>
                <label className={`upl-drop${custom.active.length >= MAX_CUSTOM_STICKERS ? ' is-full' : ''}`}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    disabled={custom.active.length >= MAX_CUSTOM_STICKERS}
                    onChange={(e) => {
                      custom.add(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <Icon d={TOOLS[2][2]} size={26} />
                  <span className="upl-title">Tải ảnh sticker của bạn</span>
                  <span className="upl-hint">
                    PNG, JPG, WebP · tối đa {MAX_CUSTOM_STICKERS} hình · {vnd(PRICING.customSticker)}/hình
                  </span>
                </label>
                {custom.notice && <p className="field-err">{custom.notice}</p>}
                <ul className="studio-uploads">
                  {custom.items.map((c) => (
                    <li key={c.key} className={`is-${c.status}`}>
                      <button
                        type="button"
                        className="studio-tile"
                        disabled={c.status === 'error' || c.status === 'processing'}
                        aria-label={`Thêm ${c.name} lên ${product.unit}`}
                        onClick={() => addCustom(c)}
                      >
                        <img src={c.url} alt="" />
                      </button>
                      <div className="studio-upl-info">
                        <span className="studio-upl-name">{c.name}</span>
                        {c.status === 'processing' && <small>Đang tách nền…</small>}
                        {c.status === 'error' && <small className="studio-err">{c.error}</small>}
                        {c.cut ? (
                          <div className="upl-switch" role="group" aria-label={`Bản dùng cho ${c.name}`}>
                            <button
                              type="button"
                              aria-pressed={c.useCut}
                              disabled={c.status === 'processing'}
                              onClick={() => custom.setUseCut(c.key, true)}
                            >
                              Tách nền
                            </button>
                            <button
                              type="button"
                              aria-pressed={!c.useCut}
                              disabled={c.status === 'processing'}
                              onClick={() => custom.setUseCut(c.key, false)}
                            >
                              Giữ ảnh gốc
                            </button>
                          </div>
                        ) : (
                          c.cutReason && <small>Giữ ảnh gốc: {c.cutReason.toLowerCase()}</small>
                        )}
                        {c.cut?.method === 'flood' && c.useCut && (
                          <label className="upl-tol">
                            <span>Độ nhạy</span>
                            <input
                              type="range"
                              min="10"
                              max="110"
                              step="4"
                              value={c.tolerance}
                              onChange={(e) => custom.setTolerance(c.key, Number(e.target.value))}
                            />
                          </label>
                        )}
                      </div>
                      <button
                        type="button"
                        className="upl-remove"
                        aria-label={`Bỏ ${c.name}`}
                        onClick={() => custom.remove(c.key)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                {custom.active.length > 0 && (
                  <p className="studio-note">
                    Dùng ảnh tự tải lên cần ký cam kết bản quyền ở trang đặt hàng trước khi đặt.
                  </p>
                )}
              </>
            )}

            {tool === 'layers' && (
              <>
                <h2 className="studio-h">Lớp</h2>
                {live.length === 0 ? (
                  <p className="studio-note">
                    Chưa có gì trên {product.unit}. Thêm sticker từ Thư viện hoặc Tải lên.
                  </p>
                ) : (
                  <ol className="studio-layers">
                    {[...live].reverse().map((it) => (
                      <li
                        key={it.id}
                        className={`${it.id === selected ? 'is-selected' : ''}${dragLayer === it.id ? ' is-dragging' : ''}${it.hidden ? ' is-hidden' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          setDragLayer(it.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (dragLayer != null) reorder(dragLayer, it.id)
                          setDragLayer(null)
                        }}
                        onDragEnd={() => setDragLayer(null)}
                      >
                        <button
                          type="button"
                          className="studio-layer-main"
                          onClick={() => setSelected(it.id)}
                          aria-pressed={it.id === selected}
                        >
                          <span className="studio-layer-thumb">{thumb(it)}</span>
                          <span className="studio-layer-name">{layerName(it)}</span>
                        </button>
                        <span className="studio-layer-tools">
                          <button
                            type="button"
                            onClick={() => move(it.id, 1)}
                            aria-label={`Đưa ${layerName(it)} lên trên`}
                            title="Đưa lên"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => move(it.id, -1)}
                            aria-label={`Đưa ${layerName(it)} xuống dưới`}
                            title="Đưa xuống"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            aria-pressed={!!it.hidden}
                            onClick={() => update(it.id, { hidden: !it.hidden })}
                            aria-label={it.hidden ? `Hiện ${layerName(it)}` : `Ẩn ${layerName(it)}`}
                            title={it.hidden ? 'Hiện' : 'Ẩn'}
                          >
                            <Icon
                              size={16}
                              d={
                                it.hidden
                                  ? 'M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0122 12a17 17 0 01-2.2 3M6.2 6.2A17 17 0 002 12s4 7 10 7a9.8 9.8 0 004.2-.9'
                                  : 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z'
                              }
                            />
                          </button>
                          <button
                            type="button"
                            aria-pressed={!!it.locked}
                            onClick={() => update(it.id, { locked: !it.locked })}
                            aria-label={it.locked ? `Mở khoá ${layerName(it)}` : `Khoá ${layerName(it)}`}
                            title={it.locked ? 'Mở khoá' : 'Khoá'}
                          >
                            <Icon
                              size={16}
                              d={
                                it.locked
                                  ? 'M6 11h12v10H6zM8 11V7a4 4 0 018 0v4'
                                  : 'M6 11h12v10H6zM8 11V7a4 4 0 017.5-2'
                              }
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicate(it.id)}
                            aria-label={`Nhân bản ${layerName(it)}`}
                            title="Nhân bản"
                          >
                            <Icon size={16} d="M8 8h12v12H8zM4 16V4h12" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(it.id)}
                            aria-label={`Xoá ${layerName(it)}`}
                            title="Xoá"
                          >
                            <Icon size={16} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="studio-note">Kéo thả để sắp xếp; lớp trên cùng nằm đầu danh sách.</p>
              </>
            )}
          </section>
        )}

        {/* ---------- Vùng vẽ ---------- */}
        <main
          className="studio-canvas"
          onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="studio-sheet" style={{ '--zoom': zoom / 100 }}>
            <div
              className="studio-stage"
              ref={stageRef}
              onPointerDown={(e) => {
                if (!e.target.closest('.studio-item')) setSelected(null)
              }}
            >
              <ProductVisual productKey={productKey} color={color} pattern={combo.patterned} alt="">
                <div
                  className="studio-area"
                  style={{
                    left: `${area.x0}%`,
                    top: `${area.y0}%`,
                    width: `${area.x1 - area.x0}%`,
                    height: `${area.y1 - area.y0}%`,
                  }}
                  aria-hidden="true"
                >
                  <span>Vùng in</span>
                </div>
                {guides.v && (
                  <div
                    className="studio-guide studio-guide-v"
                    style={{ left: `${(area.x0 + area.x1) / 2}%` }}
                  />
                )}
                {guides.h && (
                  <div
                    className="studio-guide studio-guide-h"
                    style={{ top: `${(area.y0 + area.y1) / 2}%` }}
                  />
                )}
                {live.map((it) =>
                  it.hidden ? null : (
                    <div
                      key={it.id}
                      className={`studio-item${it.id === selected ? ' is-selected' : ''}${it.locked ? ' is-locked' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={it.id === selected}
                      aria-label={`${layerName(it)}${it.locked ? ' (đã khoá)' : ''}`}
                      style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.s}%`, rotate: `${it.r}deg` }}
                      onPointerDown={(e) => startGesture(e, it, 'move')}
                      onFocus={() => setSelected(it.id)}
                    >
                      {it.custom ? (
                        <img src={srcOf(it)} alt="" draggable={false} />
                      ) : (
                        <Sticker shape={it.shape} color={it.color} label={it.label} />
                      )}
                      {it.id === selected && !it.locked && (
                        <>
                          <span
                            className="studio-handle studio-rotate"
                            title="Xoay"
                            onPointerDown={(e) => startGesture(e, it, 'rotate')}
                          />
                          {['nw', 'ne', 'sw', 'se'].map((c) => (
                            <span
                              key={c}
                              className={`studio-handle studio-resize is-${c}`}
                              title="Đổi cỡ"
                              onPointerDown={(e) => startGesture(e, it, 'resize')}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )
                )}
              </ProductVisual>
            </div>
          </div>

          {sel && (
            <div className="studio-float" role="toolbar" aria-label="Phần tử đang chọn">
              <button type="button" onClick={() => move(sel.id, 1)}>
                Lên trên
              </button>
              <button type="button" onClick={() => move(sel.id, -1)}>
                Xuống dưới
              </button>
              <button type="button" onClick={() => duplicate(sel.id)}>
                Nhân bản
              </button>
              <button type="button" onClick={() => update(sel.id, { locked: !sel.locked })}>
                {sel.locked ? 'Mở khoá' : 'Khoá'}
              </button>
              <button
                type="button"
                className="studio-danger"
                onClick={() => remove(sel.id)}
                disabled={sel.locked}
              >
                Xoá
              </button>
            </div>
          )}

          <label className="studio-zoom">
            <span>{zoom}%</span>
            <input
              type="range"
              min="60"
              max="140"
              step="10"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Thu phóng"
            />
          </label>
          <p className="studio-help">
            Kéo để di chuyển · nắm góc để đổi cỡ · nắm chấm trên để xoay · Ctrl+Z hoàn tác
          </p>
        </main>
      </div>

      {/* Bản ẩn để xuất mockup PNG (không có khung vùng in, không có tay nắm) */}
      <div className="studio-export" aria-hidden="true" ref={exportRef}>
        <ProductVisual
          productKey={productKey}
          color={color}
          pattern={combo.patterned}
          design={visibleForExport}
          className="studio-export-visual"
        />
      </div>
    </dialog>
  )
}
