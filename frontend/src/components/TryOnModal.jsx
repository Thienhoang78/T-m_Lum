import { useEffect, useRef, useState } from 'react'
import Sticker from './Sticker.jsx'
import TeeVisual from './TeeVisual.jsx'

// Phối thử: kéo sticker từ khay lên áo (chuột hoặc cảm ứng), chọn một sticker để xoay, đổi cỡ hoặc bỏ.
// Toạ độ lưu theo % khung ảnh vuông nên hiện lại đúng chỗ trên ảnh lớn của trang áo.
const START_SIZE = 16 // % chiều rộng khung
let nextId = 1

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
function toPct(stage, e) {
  const r = stage.getBoundingClientRect()
  return {
    x: clamp(((e.clientX - r.left) / r.width) * 100, 4, 96),
    y: clamp(((e.clientY - r.top) / r.height) * 100, 4, 96),
  }
}

export default function TryOnModal({ stickerSet, flat, ink, initial, onSave, onClose }) {
  const dialogRef = useRef(null)
  const stageRef = useRef(null)
  const [items, setItems] = useState(() => initial.map((it) => ({ ...it, id: nextId++ })))
  const [selected, setSelected] = useState(null)
  const [dragId, setDragId] = useState(null)

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [])

  // Đang kéo: theo con trỏ trên toàn cửa sổ cho tới khi thả
  useEffect(() => {
    if (dragId == null) return
    const move = (e) => {
      const p = toPct(stageRef.current, e)
      setItems((list) => list.map((it) => (it.id === dragId ? { ...it, ...p } : it)))
    }
    const stop = () => setDragId(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [dragId])

  function close() {
    dialogRef.current?.close()
    onClose()
  }

  function add([shape, color, label], drag) {
    const it = { id: nextId++, shape, color, label, x: 50, y: 45, r: 0, s: START_SIZE }
    setItems((list) => [...list, it])
    setSelected(it.id)
    if (drag) setDragId(it.id)
  }

  const update = (id, patch) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const sel = items.find((it) => it.id === selected)

  function nudge(e, it) {
    const step = e.shiftKey ? 5 : 1
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[
      e.key
    ]
    if (d) {
      e.preventDefault()
      update(it.id, { x: clamp(it.x + d[0], 4, 96), y: clamp(it.y + d[1], 4, 96) })
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      remove(it.id)
    }
  }

  function remove(id) {
    setItems((list) => list.filter((it) => it.id !== id))
    setSelected(null)
  }

  return (
    <dialog
      ref={dialogRef}
      className="auth tryon"
      aria-labelledby="tryon-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => e.target === dialogRef.current && close()}
    >
      <div className="auth-card tryon-card">
        <button type="button" className="auth-close" aria-label="Đóng" onClick={close}>
          ×
        </button>
        <div className="tryon-head">
          <p className="eyebrow">Phối thử · {stickerSet.name}</p>
          <h2 className="display-sm" id="tryon-title">
            Kéo {flat ? 'hình in' : 'sticker'} lên <em>áo của bạn</em>
          </h2>
        </div>

        <div className="tryon-body">
          <div
            className="tryon-stage"
            ref={stageRef}
            onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
          >
            <TeeVisual alt="">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  className="tryon-item"
                  aria-pressed={selected === it.id}
                  aria-label={`${flat ? 'Hình in' : 'Sticker'} ${i + 1}: kéo để di chuyển, phím mũi tên để dịch`}
                  style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.s}%`, rotate: `${it.r}deg` }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    setSelected(it.id)
                    setDragId(it.id)
                  }}
                  onFocus={() => setSelected(it.id)}
                  onKeyDown={(e) => nudge(e, it)}
                >
                  <Sticker shape={it.shape} color={flat ? ink : it.color} flat={flat} label={it.label} />
                </button>
              ))}
            </TeeVisual>
          </div>

          <div className="tryon-side">
            <p className="opt-label">Khay {flat ? 'hình in' : 'sticker'}</p>
            <div className="tryon-tray">
              {stickerSet.stickers.map((k, i) => (
                <button
                  key={i}
                  type="button"
                  className="tryon-tray-item"
                  aria-label={`Thêm ${flat ? 'hình in' : 'sticker'} ${i + 1} lên áo`}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    add(k, true)
                  }}
                  onClick={(e) => e.detail === 0 && add(k, false)}
                >
                  <Sticker shape={k[0]} color={flat ? ink : k[1]} flat={flat} label={k[2]} />
                </button>
              ))}
            </div>
            <p className="tryon-hint">
              Kéo từ khay thả lên áo. Bấm vào một {flat ? 'hình' : 'sticker'} trên áo để xoay, đổi cỡ hoặc bỏ.
            </p>

            <div className="tryon-tools" aria-live="polite">
              {sel ? (
                <>
                  <button type="button" className="pill" onClick={() => update(sel.id, { r: sel.r - 15 })}>
                    ↺ Xoay trái
                  </button>
                  <button type="button" className="pill" onClick={() => update(sel.id, { r: sel.r + 15 })}>
                    ↻ Xoay phải
                  </button>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => update(sel.id, { s: clamp(sel.s - 2, 6, 34) })}
                  >
                    − Nhỏ hơn
                  </button>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => update(sel.id, { s: clamp(sel.s + 2, 6, 34) })}
                  >
                    + To hơn
                  </button>
                  <button type="button" className="pill tryon-remove" onClick={() => remove(sel.id)}>
                    Bỏ {flat ? 'hình' : 'sticker'} này
                  </button>
                </>
              ) : (
                <p className="tryon-hint">Chưa chọn {flat ? 'hình' : 'sticker'} nào trên áo.</p>
              )}
            </div>
          </div>
        </div>

        <div className="tryon-foot">
          <button
            type="button"
            className="btn btn-glass"
            onClick={() => {
              setItems([])
              setSelected(null)
            }}
          >
            Làm lại
          </button>
          <button
            type="button"
            className="btn btn-brand"
            onClick={() => {
              onSave(
                items.map(({ shape, color, label, x, y, r, s }) => ({ shape, color, label, x, y, r, s }))
              )
              close()
            }}
          >
            Lưu bản phối
          </button>
        </div>
      </div>
    </dialog>
  )
}
