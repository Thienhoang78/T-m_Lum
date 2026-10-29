import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FRAMES,
  PRODUCTS,
  cmToPct,
  maxWidthPctA4,
  printArea,
  productFor,
  stickerPct,
} from '../data/products.js'
import { insideArea, keepInArea, normalizeDesign, onSide, sideOf } from '../data/design.js'
import { priceOf, vnd } from '../data/pricing.js'
import { MAX_CUSTOM_STICKERS } from '../data/consent.js'
import { renderMockup } from '../data/mockup.js'
import ProductVisual from './ProductVisual.jsx'
import LiveTryOn from './LiveTryOn.jsx'
import Sticker from './Sticker.jsx'
import { DrawTray, DrawingPad } from './DrawingTools.jsx'
import { exportDrawing, initialBrush, loadMask, placeStrokes } from '../data/drawing.js'

// Trình phối kiểu Canva (toàn màn hình): thanh công cụ trái (Sản phẩm, Thư viện, Vẽ, Tải lên, Lớp),
// áo / túi ở giữa. Kéo để di chuyển, nắm góc để đổi cỡ, nắm chấm trên để xoay,
// hai ngón để phóng to / xoay trên điện thoại. Có hoàn tác / làm lại, đường căn giữa, khoá / ẩn lớp.
// Dùng DOM + Pointer Events, không thêm thư viện vẽ.
//
// Phần tử (layer): { id, shape, color, label, set } (sticker trong thư viện)
//                  hoặc { id, custom } (hình khách tự tải lên, ảnh lấy theo bản đang chọn: gốc / tách nền)
//                  hoặc { id, custom, drawing: { strokes, box } } (hình khách tự vẽ: ảnh PNG đã tải lên như hình
//                  tự tải lên, kèm các nét để mở ra sửa tiếp; box là vị trí lúc vẽ xong)
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
  ['draw', 'Vẽ', 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3'],
  ['upload', 'Tải lên', 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3'],
  ['layers', 'Lớp', 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5'],
]
const START_CM = 12 // hình tự tải lên mới đặt lên áo rộng 12 cm (đổi cỡ được, tối đa A4)
const SIDES = [
  ['front', 'Mặt trước'],
  ['back', 'Mặt sau'],
]
const SNAP = 1.2 // % khoảng hút vào đường giữa
const HISTORY = 60

let nextId = 1
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const withIds = (list) => list.map((it) => ({ ...it, id: it.id ?? nextId++ }))
const strip = (list) => list.map(({ id: _id, ...it }) => it)

// Mỗi mặt có một khung in khổ A4 theo thang cỡ của áo / túi (dọc / ngang): sticker đặt ở vị trí nào trong khung cũng được,
// không kéo ra ngoài khung. Sticker thư viện có cỡ in cố định; hình tự tải lên / hình vẽ đổi cỡ được, tối đa vừa khung.
const DEFAULT_FRAMES = { front: 'doc', back: 'doc' }
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
  stickerSets,
  chosenSets, // { [key]: số bộ }
  onUseSet,
  custom, // useCustomStickers()
  // Công cụ theo cách làm sticker (Combo 1 chọn 1 trong 3: tự vẽ / tải hình / bộ sticker có sẵn; Combo 2: bộ có sẵn)
  allowUpload = false, // tab Tải lên
  allowDraw = false, // tab Vẽ
  libraryOn = true, // tab Thư viện
  librarySets = null, // chỉ hiện các bộ này trong Thư viện (null = mọi bộ)
  initial,
  onChange,
  initialFrames, // khung A4 từng mặt: { front: 'doc' | 'ngang', back: ... }
  onFrames,
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
  const [tool, setTool] = useState('library')
  const [panelOpen, setPanelOpen] = useState(true)
  const [frames, setFrames] = useState(() => ({ ...DEFAULT_FRAMES, ...initialFrames }))
  const [hist, setHist] = useState(() => ({
    past: [],
    // bản phối cũ có lớp nằm ngoài khung A4 thì đưa vào trong khung
    present: withIds(normalizeDesign(initial, productKey)).map((it) =>
      keepInArea(it, printArea(productKey, sideOf(it), frames[sideOf(it)]))
    ),
    future: [],
  }))
  const [side, setSide] = useState('front') // mặt đang phối
  const [frameNote, setFrameNote] = useState(null) // thông báo ngắn khi đưa lớp vào lại khung
  const [selected, setSelected] = useState(null)
  const [guides, setGuides] = useState({ v: false, h: false })
  const [zoom, setZoom] = useState(100)
  const [dragLayer, setDragLayer] = useState(null)
  const [busy, setBusy] = useState(false)
  const [liveOpen, setLiveOpen] = useState(false) // live mặc thử áo bằng camera
  // Đang vẽ: { editId (lớp hình vẽ đang sửa, hoặc null), strokes, past, future }
  const [draw, setDraw] = useState(null)
  const [brush, setBrush] = useState(initialBrush)
  const [saving, setSaving] = useState(false)
  const items = hist.present
  const sel = items.find((it) => it.id === selected)

  // Ảnh hiện tại của hình tự tải lên (bản gốc hoặc đã tách nền); hình đã bị bỏ thì không hiện
  // Combo không nhận hình tự tải lên thì các hình đó không hiện trên bản phối
  const customOf = (key) =>
    custom.items.find((c) => c.key === key && c.status !== 'error' && (c.drawn ? allowDraw : allowUpload))
  const toolOn = { upload: allowUpload, draw: allowDraw, library: libraryOn }
  const tools = TOOLS.filter(([key]) => toolOn[key] ?? true)
  const fallbackTool = allowDraw ? 'draw' : allowUpload ? 'upload' : libraryOn ? 'library' : 'product'
  const activeTool = tools.some(([key]) => key === tool) ? tool : fallbackTool
  const shownSets = librarySets ? stickerSets.filter((st) => librarySets.includes(st.key)) : stickerSets
  const srcOf = (it) => (it.custom ? customOf(it.custom)?.url : null)
  const live = items.filter((it) => !it.custom || customOf(it.custom))
  const here = onSide(live, side) // các lớp của mặt đang phối
  // Khung in A4 của từng mặt (% khung ảnh, theo thang cỡ của món)
  const areaOf = useCallback((s) => printArea(productKey, s, frames[s]), [productKey, frames])
  const a4 = areaOf(draw?.side ?? side)
  const a4c = useMemo(() => ({ x: a4.x + a4.w / 2, y: a4.y + a4.h / 2 }), [a4.x, a4.y, a4.w, a4.h])
  const keepIn = useCallback((it, shrink) => keepInArea(it, areaOf(sideOf(it)), shrink), [areaOf])
  // Cỡ hợp lệ: sticker thư viện giữ cỡ in thật; hình tự tải lên / vẽ không vượt khổ A4 và vừa khung
  const fitIn = useCallback(
    (s, it) => {
      if (!it?.custom) return stickerPct(productKey, it?.shape)
      const area = areaOf(sideOf(it))
      const ar = it.ar ?? 1
      return clamp(s, 3, Math.min(maxWidthPctA4(productKey, ar), area.w, area.h / ar))
    },
    [productKey, areaOf]
  )
  const drawingCount = custom.items.filter((c) => c.drawn).length

  // Đổi sang combo không cho tự tạo hình thì thoát chế độ vẽ
  useEffect(() => {
    if (!allowDraw) setDraw(null)
  }, [allowDraw])

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [])

  // Combo 1 chọn "Tự vẽ": mở trình phối là vào luôn chế độ vẽ
  const autoDraw = useRef(allowDraw)
  useEffect(() => {
    if (!autoDraw.current) return
    autoDraw.current = false
    setTool('draw')
    setDraw({ editId: null, strokes: [], past: [], future: [], side: 'front' })
  }, [])

  // Mỗi thay đổi đều lưu ngay về trang đặt hàng (không cần bấm Lưu)
  useEffect(() => {
    onChange(strip(items))
  }, [items, onChange])
  useEffect(() => {
    onFrames?.(frames)
  }, [frames, onFrames])
  // Đổi món (áo ↔ túi) hay đổi khung: lớp nào lọt ra ngoài khung A4 thì đưa vào lại
  useEffect(() => {
    setHist((h) => ({ ...h, present: h.present.map((it) => keepIn(it)) }))
  }, [keepIn])
  useEffect(() => {
    if (!frameNote) return
    const t = setTimeout(() => setFrameNote(null), 3200)
    return () => clearTimeout(t)
  }, [frameNote])

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

  const keepInside = keepIn

  // Đổi khung A4 của một mặt (dọc ↔ ngang): lớp nào lọt ra ngoài khung mới thì đưa vào lại và báo ngắn
  function setFrame(s, frame) {
    if (frames[s] === frame) return
    const area = printArea(productKey, s, frame)
    const out = items.filter((it) => sideOf(it) === s && !insideArea(it, area))
    setFrames((f) => ({ ...f, [s]: frame }))
    if (out.length) {
      commit((list) => list.map((it) => (sideOf(it) === s ? keepInArea(it, area) : it)))
      setFrameNote(`Đã đưa ${out.length} lớp vào lại trong khung A4 ${FRAMES[frame].toLowerCase()}.`)
    }
  }

  function add(base) {
    const it = keepInside({
      id: nextId++,
      ...base,
      side,
      x: a4c.x,
      y: a4c.y,
      r: 0,
      s: base.custom ? fitIn(cmToPct(productKey, START_CM), base) : stickerPct(productKey, base.shape),
    })
    commit((list) => [...list, it])
    setSelected(it.id)
    return it
  }
  const addSticker = (set, [shape, colorVar, label]) => {
    add({ shape, color: colorVar, label, set: set.key })
    onUseSet(set.key) // dùng sticker của bộ nào thì bộ đó được thêm vào đơn
  }
  // Hình tự tải lên: lấy tỉ lệ cao / ngang để giới hạn cỡ theo khổ A4
  const addCustom = (c) => {
    const im = new Image()
    im.onload = () => add({ custom: c.key, ar: im.naturalHeight / Math.max(1, im.naturalWidth) })
    im.onerror = () => add({ custom: c.key, ar: 1 })
    im.src = c.url
  }

  function remove(id) {
    const gone = items.find((it) => it.id === id)
    commit((list) => list.filter((it) => it.id !== id))
    setSelected(null)
    // hình vẽ không còn lớp nào dùng thì bỏ luôn (không tính tiền)
    if (gone?.drawing && !items.some((it) => it.id !== id && it.custom === gone.custom))
      custom.remove(gone.custom)
  }

  // ---------- Vẽ tay ----------
  function startDraw(target = sel) {
    if (!allowDraw) return
    const editing = target?.drawing && !target.locked ? target : null
    setDraw({
      editId: editing?.id ?? null,
      strokes: editing ? placeStrokes(editing.drawing.strokes, editing.drawing.box, editing) : [],
      side: editing ? sideOf(editing) : side,
      past: [],
      future: [],
    })
    if (editing) setSide(sideOf(editing))
    setSelected(null)
  }
  const drawCommit = (strokes) =>
    setDraw((d) => ({ ...d, strokes, past: [...d.past, d.strokes].slice(-HISTORY), future: [] }))
  const drawUndo = () =>
    setDraw((d) =>
      d.past.length
        ? { ...d, strokes: d.past.at(-1), past: d.past.slice(0, -1), future: [d.strokes, ...d.future] }
        : d
    )
  const drawRedo = () =>
    setDraw((d) =>
      d.future.length
        ? { ...d, strokes: d.future[0], past: [...d.past, d.strokes], future: d.future.slice(1) }
        : d
    )
  // Xong: xuất PNG nền trong suốt (cắt sát nét), tải lên như hình tự tải lên, đặt thành một lớp trên áo
  async function finishDraw() {
    const d = draw
    if (!d || saving) return
    const old = d.editId != null ? items.find((it) => it.id === d.editId) : null
    if (!d.strokes.length && !old) return setDraw(null)
    setSaving(true)
    try {
      const out = await exportDrawing(d.strokes, await loadMask(productKey), a4)
      const shared = old && items.some((it) => it.id !== old.id && it.custom === old.custom)
      if (old && !shared) custom.remove(old.custom)
      if (!out) {
        if (old) commit((list) => list.filter((it) => it.id !== old.id))
        return setDraw(null)
      }
      const key = custom.addDrawing(out.blob, `Hình vẽ ${drawingCount + (old && !shared ? 0 : 1)}.png`)
      if (key == null) return // đã đủ số hình: giữ nguyên chế độ vẽ, thông báo hiện ở bảng Vẽ
      const placed = {
        custom: key,
        side: d.side,
        ar: out.ar,
        drawing: { strokes: d.strokes, box: { x: out.x, y: out.y, s: out.s, r: 0 } },
        x: out.x,
        y: out.y,
        s: out.s,
        r: 0,
      }
      if (old) {
        commit((list) => list.map((it) => (it.id === old.id ? { ...it, ...placed } : it)))
        setSelected(old.id)
      } else {
        const it = { id: nextId++, ...placed }
        commit((list) => [...list, it])
        setSelected(it.id)
      }
      setDraw(null)
    } finally {
      setSaving(false)
    }
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
            // hút vào đường giữa của khung A4
            const cx = a4c.x
            const cy = a4c.y
            const v = Math.abs(x - cx) < SNAP
            const h = Math.abs(y - cy) < SNAP
            if (v) x = cx
            if (h) y = cy
            setGuides({ v, h })
            return keepIn({ ...it, x, y })
          }
          if (g.mode === 'pinch') {
            const pts = [...pointers.current.values()]
            if (pts.length < 2) return it
            const [a, b] = pts
            const k = Math.hypot(a.x - b.x, a.y - b.y) / g.dist
            const ang = ((Math.atan2(b.y - a.y, b.x - a.x) - g.angle) * 180) / Math.PI
            return keepIn(
              { ...it, s: it.custom ? fitIn(g.s * k, it) : it.s, r: Math.round(g.r + ang) },
              false
            )
          }
          const c = centerOf(stageRef.current, it)
          if (g.mode === 'resize') {
            const k = Math.hypot(e.clientX - c.x, e.clientY - c.y) / g.dist
            return keepIn({ ...it, s: fitIn(g.s * k, it) })
          }
          // xoay: hút về các góc 0 / 45 / 90...
          let r = g.r + ((Math.atan2(e.clientY - c.y, e.clientX - c.x) - g.angle) * 180) / Math.PI
          const snapTo = Math.round(r / 45) * 45
          if (Math.abs(r - snapTo) < 4) r = snapTo
          return keepIn({ ...it, r: Math.round(((r + 540) % 360) - 180) }, false)
        })
      )
    }
    const onUp = (e) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size === 0) {
        // xoay xong mà hình tự tạo lớn hơn khung thì thu nhỏ cho vừa
        const g = gesture.current
        if (g) setLive((list) => list.map((it) => (it.id === g.id ? keepIn(it) : it)))
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
    // khung A4 và cỡ hợp lệ đổi khi đổi món / đổi khung
  }, [a4c, keepIn, fitIn])

  // ---------- Phím tắt ----------
  function onKeyDown(e) {
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    const mod = e.ctrlKey || e.metaKey
    if (draw) {
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        return e.shiftKey ? drawRedo() : drawUndo()
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        return drawRedo()
      }
      return
    }
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
      const blob = await renderMockup(
        exportRef.current.querySelector(`.studio-export-${side} .tee-visual`),
        exportSide(side),
        1200
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tum-lum-${productKey}-${combo.slug}${side === 'back' ? '-mat-sau' : ''}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } finally {
      setBusy(false)
    }
  }

  const visibleForExport = live.filter((it) => !it.hidden).map((it) => ({ ...it, src: srcOf(it) }))
  const exportSide = (s) => onSide(visibleForExport, s)
  const layerName = (it) =>
    it.drawing
      ? (customOf(it.custom)?.name.replace(/\.png$/, '') ?? 'Hình vẽ')
      : it.custom
        ? `Ảnh: ${customOf(it.custom)?.name ?? 'đã bỏ'}`
        : `${SHAPE_NAMES[it.shape] ?? 'Sticker'}${it.label ? ` “${it.label}”` : ''}`
  const thumb = (it, w = 34) =>
    it.custom ? (
      <img src={srcOf(it)} alt="" style={{ width: w, height: w }} />
    ) : (
      <Sticker shape={it.shape} color={it.color} label={it.label} style={{ width: w }} />
    )
  const pick = (t) => {
    // rời bảng Vẽ thì lưu hình đang vẽ
    if (draw && t !== 'draw') finishDraw()
    if (t === activeTool) setPanelOpen(!panelOpen)
    else {
      setTool(t)
      setPanelOpen(true)
      if (t === 'draw' && !draw) startDraw()
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
        if (draw) setDraw(null)
        else if (selected != null) setSelected(null)
        else close()
      }}
      onKeyDown={onKeyDown}
    >
      {/* ---------- Thanh trên ---------- */}
      <header className="studio-top">
        <button type="button" className="studio-back" onClick={close} aria-label="Quay lại trang đặt hàng">
          <Icon d="M15 5l-7 7 7 7" />
          <span className="brand">
            <img className="brand-logo" src="/brand/logo-128.webp" alt="" width="44" height="44" />
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
        {productKey === 'ao' && (
          <button type="button" className="studio-live" onClick={() => setLiveOpen(true)}>
            <Icon d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z" size={18} />
            <span>Live mặc thử áo</span>
          </button>
        )}
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

      <div className={`studio-body${panelOpen ? '' : ' is-collapsed'}${draw ? ' is-drawing' : ''}`}>
        {/* ---------- Thanh công cụ trái ---------- */}
        <nav className="studio-rail" role="tablist" aria-label="Công cụ">
          {tools.map(([key, label, d]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTool === key && panelOpen}
              aria-controls="studio-panel"
              onClick={() => pick(key)}
            >
              <Icon d={d} />
              <span>{label}</span>
              {key === 'layers' && here.length > 0 && <b className="studio-count">{here.length}</b>}
            </button>
          ))}
        </nav>

        {/* ---------- Bảng của công cụ đang chọn ---------- */}
        {panelOpen && (
          <section
            className="studio-panel"
            id="studio-panel"
            role="tabpanel"
            aria-label={TOOLS.find((t) => t[0] === activeTool)[1]}
          >
            {activeTool === 'product' && (
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
                <p className="studio-note">{product.blurb}</p>
              </>
            )}

            {activeTool === 'library' && (
              <>
                <h2 className="studio-h">Thư viện sticker</h2>
                <p className="studio-note">
                  Bấm sticker để đặt lên {product.unit}, kéo để đổi vị trí, nắm chấm trên để xoay. Sticker có
                  cỡ in cố định nên không phóng to / thu nhỏ.
                </p>
                {shownSets.map((set) => (
                  <div key={set.key} className="studio-set">
                    <p className="studio-set-head">
                      <strong>
                        {set.name} <small>(mẫu)</small>
                      </strong>
                      {chosenSets[set.key] > 0 && (
                        <span className="studio-tag">Bộ đi kèm × {chosenSets[set.key]}</span>
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

            {activeTool === 'draw' && (
              <>
                <h2 className="studio-h">Vẽ</h2>
                <p className="studio-note">
                  Vẽ trực tiếp lên {product.unit} bằng chuột, ngón tay hoặc bút cảm ứng. Chọn bút, màu và cỡ ở
                  khay bên dưới; bấm Xong để đặt hình vẽ thành một lớp, kéo / đổi cỡ / xoay như sticker.
                </p>
                {!draw && (
                  <button type="button" className="btn btn-dark btn-sm" onClick={() => startDraw()}>
                    {sel?.drawing ? 'Sửa hình vẽ đang chọn' : 'Vẽ hình mới'}
                  </button>
                )}
                {custom.notice && <p className="field-err">{custom.notice}</p>}
                <p className="studio-note">
                  Hình vẽ nằm trong khung A4 nét đứt (21 × 29,7 cm), in như một hình bạn tự tạo: đã gồm trong
                  giá combo, tối đa {MAX_CUSTOM_STICKERS} hình mỗi đơn, cần ký cam kết bản quyền ở trang đặt
                  hàng.
                </p>
              </>
            )}

            {activeTool === 'upload' && (
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
                  <Icon d={TOOLS.find(([k]) => k === 'upload')[2]} size={26} />
                  <span className="upl-title">Tải ảnh sticker của bạn</span>
                  <span className="upl-hint">
                    PNG, JPG, WebP · tối đa {MAX_CUSTOM_STICKERS} hình · cỡ in tối đa A4
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

            {activeTool === 'layers' && (
              <>
                <h2 className="studio-h">Lớp · {side === 'back' ? 'mặt sau' : 'mặt trước'}</h2>
                {here.length === 0 ? (
                  <p className="studio-note">
                    Chưa có gì trên {product.unit}. Thêm sticker từ Thư viện hoặc Tải lên.
                  </p>
                ) : (
                  <ol className="studio-layers">
                    {[...here].reverse().map((it) => (
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
          className={`studio-canvas${draw ? ' is-drawing' : ''}`}
          onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="studio-sheet" style={{ '--zoom': zoom / 100 }}>
            <div
              className={`studio-stage${draw ? ' is-drawing' : ''}`}
              ref={stageRef}
              onPointerDown={(e) => {
                if (!e.target.closest('.studio-item')) setSelected(null)
              }}
            >
              <ProductVisual
                productKey={productKey}
                color={color}
                pattern={combo.patterned}
                side={side}
                alt=""
              >
                {guides.v && <div className="studio-guide studio-guide-v" style={{ left: `${a4c.x}%` }} />}
                {guides.h && <div className="studio-guide studio-guide-h" style={{ top: `${a4c.y}%` }} />}
                {here.map((it) =>
                  it.hidden || it.id === draw?.editId ? null : (
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
                          {/* sticker thư viện có cỡ in cố định: chỉ hình tự tạo mới đổi cỡ (tối đa A4) */}
                          {(it.custom ? ['nw', 'ne', 'sw', 'se'] : []).map((c) => (
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
              {/* khung in khổ A4: chỉ hiện trong trình phối, không có trong ảnh mockup */}
              <span
                className={`draw-a4-frame${draw ? ' is-drawing' : ''}`}
                style={{ left: `${a4.x}%`, top: `${a4.y}%`, width: `${a4.w}%`, height: `${a4.h}%` }}
                aria-hidden="true"
              >
                <small>
                  Khổ A4 · {frames[draw?.side ?? side] === 'ngang' ? '29,7 × 21' : '21 × 29,7'} cm
                </small>
              </span>
              {draw && (
                <DrawingPad
                  productKey={productKey}
                  strokes={draw.strokes}
                  brush={brush}
                  clip={a4}
                  onStroke={(st) => drawCommit([...draw.strokes, st])}
                />
              )}
            </div>
          </div>

          {draw && (
            <DrawTray
              brush={brush}
              onBrush={setBrush}
              empty={!draw.strokes.length}
              canUndo={draw.past.length > 0}
              canRedo={draw.future.length > 0}
              onUndo={drawUndo}
              onRedo={drawRedo}
              onClear={() => drawCommit([])}
              onCancel={() => setDraw(null)}
              onDone={finishDraw}
              busy={saving}
              landscape={frames[draw.side] === 'ngang'}
              onLandscape={() => setFrame(draw.side, frames[draw.side] === 'ngang' ? 'doc' : 'ngang')}
            />
          )}

          {frameNote && (
            <p className="a4-note" role="status">
              {frameNote}
            </p>
          )}

          {sel && !draw && (
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
              {sel.drawing && allowDraw && !sel.locked && (
                <button
                  type="button"
                  onClick={() => {
                    setTool('draw')
                    setPanelOpen(true)
                    startDraw(sel)
                  }}
                >
                  Sửa hình vẽ
                </button>
              )}
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

          {!draw && (
            <>
              <div className="side-switch studio-sides" role="group" aria-label="Mặt đang phối">
                {SIDES.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={side === k}
                    onClick={() => {
                      setSide(k)
                      setSelected(null)
                    }}
                  >
                    {label}
                    {onSide(live, k).length > 0 && <b>{onSide(live, k).length}</b>}
                  </button>
                ))}
              </div>
              <div className="side-switch studio-frame" role="group" aria-label="Khung in khổ A4">
                <span>Khổ A4</span>
                {Object.entries(FRAMES).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={frames[side] === k}
                    onClick={() => setFrame(side, k)}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
                Thiết kế trong khung A4 nét đứt · kéo để di chuyển · nắm chấm trên để xoay · hình tự tạo đổi
                cỡ ở góc · Ctrl+Z hoàn tác
              </p>
            </>
          )}
        </main>
      </div>

      {liveOpen && (
        <LiveTryOn
          makeTexture={(opts) =>
            renderMockup(
              exportRef.current.querySelector('.studio-export-front .tee-visual'),
              exportSide('front'),
              800,
              {
                transparent: true,
                baseSrc: PRODUCTS.ao.cutout,
                ...opts,
              }
            )
          }
          color={color?.fill}
          onClose={() => setLiveOpen(false)}
        />
      )}

      {/* Bản ẩn để xuất mockup PNG (không có tay nắm, đường căn) */}
      <div className="studio-export" aria-hidden="true" ref={exportRef}>
        {SIDES.map(([k]) => (
          <div key={k} className={`studio-export-${k}`}>
            <ProductVisual
              productKey={productKey}
              color={color}
              pattern={combo.patterned}
              side={k}
              design={visibleForExport}
              className="studio-export-visual"
            />
          </div>
        ))}
      </div>
    </dialog>
  )
}
