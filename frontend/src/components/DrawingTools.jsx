import { useEffect, useRef, useState } from 'react'
import { DRAW_COLORS, DRAW_TOOLS, applyClip, applyMask, drawStroke, loadMask } from '../data/drawing.js'

// Lớp vẽ phủ lên áo / túi trong trình phối: nhận nét từ chuột, ngón tay hoặc bút cảm ứng.
// Chỉ theo một con trỏ: ngón tay thứ hai (hay lòng bàn tay khi đang dùng bút) bị bỏ qua, không cuộn / phóng trang.
export function DrawingPad({ productKey, strokes, brush, clip, onStroke }) {
  const canvasRef = useRef(null)
  const baseRef = useRef(null) // các nét đã xong, vẽ sẵn để mỗi lần di bút chỉ vẽ thêm nét đang vẽ
  const maskRef = useRef(null)
  const cur = useRef(null) // { id, stroke }
  const penSeen = useRef(false)
  const [, setReady] = useState(0)

  const size = () => {
    const c = canvasRef.current
    if (!c) return 0
    const r = c.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = Math.max(1, Math.round(r.width * dpr))
    if (c.width !== W || c.height !== W) c.width = c.height = W
    return W
  }

  function redrawBase() {
    const W = size()
    if (!W) return
    baseRef.current ??= document.createElement('canvas')
    const b = baseRef.current
    b.width = b.height = W
    const g = b.getContext('2d')
    g.clearRect(0, 0, W, W)
    for (const s of strokes) drawStroke(g, s, W, W)
  }

  function paint() {
    const c = canvasRef.current
    if (!c) return
    const W = c.width
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, W, W)
    if (baseRef.current) ctx.drawImage(baseRef.current, 0, 0)
    if (cur.current) drawStroke(ctx, cur.current.stroke, W, W)
    // giới hạn trong thân áo / túi
    applyMask(ctx, maskRef.current, W, W)
    applyClip(ctx, clip, W, W)
  }

  useEffect(() => {
    let alive = true
    loadMask(productKey).then((m) => {
      if (!alive) return
      maskRef.current = m
      setReady((n) => n + 1)
    })
    return () => {
      alive = false
    }
  }, [productKey])

  // Vẽ lại khi danh sách nét đổi (xong nét, hoàn tác, xoá hết) hoặc khung đổi cỡ
  useEffect(() => {
    redrawBase()
    paint()
    const ro = new ResizeObserver(() => {
      redrawBase()
      paint()
    })
    ro.observe(canvasRef.current)
    return () => ro.disconnect()
  })

  const toPoint = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const p = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100, p]
  }

  function down(e) {
    if (e.pointerType === 'pen') penSeen.current = true
    // ngón thứ hai chạm vào khi nét vừa bắt đầu: là thao tác hai ngón / lòng bàn tay, bỏ nét đó
    if (cur.current && e.pointerType === 'touch' && cur.current.stroke.points.length < 8) {
      cur.current = null
      paint()
      return
    }
    // đang có nét thì bỏ qua con trỏ khác; đã dùng bút thì bỏ qua chạm tay (lòng bàn tay)
    if (cur.current || (penSeen.current && e.pointerType === 'touch')) return
    if (e.button > 0) return
    e.preventDefault()
    try {
      canvasRef.current.setPointerCapture(e.pointerId)
    } catch {
      // con trỏ đã nhả trước khi bắt: vẫn vẽ bình thường
    }
    const t = DRAW_TOOLS[brush.tool]
    cur.current = {
      id: e.pointerId,
      stroke: {
        tool: brush.tool,
        color: brush.color,
        size: brush.sizes[brush.tool],
        opacity: t.alpha ? brush.opacity : t.opacity,
        pressure: e.pointerType === 'pen',
        points: [toPoint(e)],
      },
    }
    paint()
  }
  function move(e) {
    const c = cur.current
    if (!c || c.id !== e.pointerId) return
    e.preventDefault()
    const evs = e.getCoalescedEvents?.() ?? [e]
    for (const ev of evs.length ? evs : [e]) c.stroke.points.push(toPoint(ev))
    paint()
  }
  function up(e) {
    const c = cur.current
    if (!c || c.id !== e.pointerId) return
    cur.current = null
    onStroke(c.stroke)
  }

  return (
    <canvas
      ref={canvasRef}
      className="draw-pad"
      aria-label="Vùng vẽ trên áo"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}

const NIB = {
  pen: 'M12 3l3 6v12H9V9z M12 3v6',
  fine: 'M12 2v5 M10 7h4l1 4v10H9V11z',
  marker: 'M9 3h6l-1 5h1v13H9V8h1z',
  pencil: 'M12 2l3 7v12H9V9z M10.5 6.5h3',
  eraser: 'M8 4h8a1 1 0 011 1v15H7V5a1 1 0 011-1z M7 9h10',
}

// Khay bút phía dưới khung: chọn bút, màu, cỡ (mỗi bút một cỡ), độ trong của bút dạ, hoàn tác / làm lại, xoá hết, xong
export function DrawTray({
  brush,
  onBrush,
  empty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onCancel,
  onDone,
  busy,
  landscape,
  onLandscape,
}) {
  const t = DRAW_TOOLS[brush.tool]
  const set = (p) => onBrush((b) => ({ ...b, ...p }))
  return (
    <div className="draw-tray" role="toolbar" aria-label="Công cụ vẽ">
      <div className="draw-tools">
        {Object.entries(DRAW_TOOLS).map(([key, tool]) => (
          <button
            key={key}
            type="button"
            className={`draw-tool is-${key}`}
            aria-pressed={brush.tool === key}
            title={tool.name}
            onClick={() => set({ tool: key })}
            style={key === 'eraser' ? undefined : { '--ink': brush.color }}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d={NIB[key]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <span>{tool.name}</span>
          </button>
        ))}
      </div>

      <div className="draw-colors" role="group" aria-label="Màu">
        {DRAW_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="draw-swatch"
            style={{ background: c }}
            aria-pressed={brush.color === c}
            aria-label={`Màu ${c}`}
            disabled={t.erase}
            onClick={() => set({ color: c })}
          />
        ))}
        <label className="draw-custom" title="Màu khác">
          <input
            type="color"
            value={brush.color}
            disabled={t.erase}
            onChange={(e) => set({ color: e.target.value })}
            aria-label="Chọn màu khác"
          />
        </label>
      </div>

      <div className="draw-sliders">
        <label>
          <span>Cỡ {t.name.toLowerCase()}</span>
          <input
            type="range"
            min={t.min}
            max={t.max}
            step="0.05"
            value={brush.sizes[brush.tool]}
            onChange={(e) => {
              const v = Number(e.target.value)
              onBrush((b) => ({ ...b, sizes: { ...b.sizes, [b.tool]: v } }))
            }}
          />
        </label>
        {t.alpha && (
          <label>
            <span>Độ đậm</span>
            <input
              type="range"
              min="0.15"
              max="0.9"
              step="0.05"
              value={brush.opacity}
              onChange={(e) => set({ opacity: Number(e.target.value) })}
            />
          </label>
        )}
      </div>

      <div className="draw-actions">
        <button
          type="button"
          className="draw-a4"
          onClick={onLandscape}
          title="Hình vẽ tối đa khổ A4 (21 × 29,7 cm): đổi khung dọc / ngang"
        >
          Khổ A4 {landscape ? 'ngang' : 'dọc'}
        </button>
        <button type="button" onClick={onUndo} disabled={!canUndo} title="Hoàn tác nét">
          Hoàn tác
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} title="Làm lại nét">
          Làm lại
        </button>
        <button type="button" onClick={onClear} disabled={empty} className="studio-danger">
          Xoá hết
        </button>
        <button type="button" onClick={onCancel}>
          Huỷ
        </button>
        <button type="button" className="btn btn-dark btn-sm" onClick={onDone} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Xong'}
        </button>
      </div>
    </div>
  )
}
