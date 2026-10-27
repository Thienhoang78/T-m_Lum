import { getStroke } from 'perfect-freehand'
import { PRODUCTS } from './products.js'

// Vẽ tay lên áo / túi trong trình phối. Nét vẽ lưu theo toạ độ % của khung ảnh vuông (0..100), độ dày theo %
// bề ngang khung, nên vẽ lại được ở mọi cỡ (màn hình, ảnh xuất in). Nét mượt, theo lực nhấn của bút cảm ứng,
// dùng perfect-freehand (MIT). Hình vẽ chỉ nằm trong thân áo (theo ảnh áo đã cắt nền) hoặc thân túi.
//
// Một nét: { tool, color, size, opacity, points: [[x, y, lực nhấn], ...] }

export const DRAW_TOOLS = {
  pen: { name: 'Bút mực', size: 1.1, min: 0.3, max: 4, thinning: 0.6, opacity: 1 },
  fine: { name: 'Bút kim', size: 0.45, min: 0.15, max: 1.5, thinning: 0, opacity: 1 },
  marker: { name: 'Bút dạ', size: 3, min: 1, max: 8, thinning: 0, opacity: 0.45, alpha: true },
  pencil: { name: 'Bút chì', size: 0.6, min: 0.2, max: 2.5, thinning: 0.35, opacity: 0.9, grain: true },
  eraser: { name: 'Tẩy', size: 3, min: 1, max: 10, thinning: 0, opacity: 1, erase: true },
}

export const DRAW_COLORS = [
  '#0d2b45',
  '#ffffff',
  '#e53935',
  '#ff7ab6',
  '#ff8a1f',
  '#ffc93c',
  '#7be0ad',
  '#1e88e5',
  '#7a59ca',
  '#6d4c41',
]

// Vùng được vẽ: túi là thân túi hình chữ nhật (theo hình vẽ túi 240×320 đặt giữa khung vuông)
const TOTE_BODY = { x: 19.4, y: 31.2, w: 61.2, h: 65.6 }

const maskCache = new Map()
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = reject
    im.src = src
  })
}
// Ảnh mặt nạ vùng vẽ cho món nền (áo: ảnh áo đã cắt nền; túi: thân túi). null = không giới hạn
export function loadMask(productKey) {
  if (!maskCache.has(productKey)) {
    const src = PRODUCTS[productKey]?.cutout
    maskCache.set(
      productKey,
      src ? loadImage(src).catch(() => null) : Promise.resolve(productKey === 'tui' ? 'tote' : null)
    )
  }
  return maskCache.get(productKey)
}

export function applyMask(ctx, mask, W, H) {
  if (!mask) return
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  if (mask === 'tote') {
    const r = (v) => (v / 100) * W
    ctx.beginPath()
    ctx.roundRect(r(TOTE_BODY.x), (TOTE_BODY.y / 100) * H, r(TOTE_BODY.w), (TOTE_BODY.h / 100) * H, r(1.5))
    ctx.fill()
  } else ctx.drawImage(mask, 0, 0, W, H)
  ctx.restore()
}

// Hạt chì: chấm trong suốt rải ngẫu nhiên, đục bớt nét bút chì
let grain
function grainPattern(ctx) {
  if (!grain) {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    const img = g.createImageData(64, 64)
    let seed = 11
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647
      img.data[i + 3] = (seed % 1000) / 1000 < 0.42 ? 140 + (seed % 110) : 0
    }
    g.putImageData(img, 0, 0)
    grain = c
  }
  return ctx.createPattern(grain, 'repeat')
}

// Đường viền nét (perfect-freehand) → Path2D
function strokePath(stroke, W) {
  const k = W / 100
  const t = DRAW_TOOLS[stroke.tool] ?? DRAW_TOOLS.pen
  const pts = stroke.points.map(([x, y, p]) => [x * k, y * k, p])
  const outline = getStroke(pts, {
    size: stroke.size * k,
    thinning: t.thinning,
    smoothing: 0.55,
    streamline: 0.45,
    simulatePressure: !stroke.pressure,
    last: true,
  })
  const path = new Path2D()
  if (!outline.length) return path
  path.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length; i++) {
    const [x0, y0] = outline[i - 1]
    const [x1, y1] = outline[i]
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  path.closePath()
  return path
}

let scratch
export function drawStroke(ctx, stroke, W, H) {
  const t = DRAW_TOOLS[stroke.tool] ?? DRAW_TOOLS.pen
  const path = strokePath(stroke, W)
  ctx.save()
  if (t.erase) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fill(path)
  } else if (t.grain) {
    // vẽ nét ra lớp tạm, đục hạt rồi mới đặt lên
    scratch ??= document.createElement('canvas')
    if (scratch.width !== W || scratch.height !== H) {
      scratch.width = W
      scratch.height = H
    }
    const g = scratch.getContext('2d')
    g.clearRect(0, 0, W, H)
    g.fillStyle = stroke.color
    g.fill(path)
    g.globalCompositeOperation = 'destination-out'
    g.fillStyle = grainPattern(g)
    g.fill(path)
    g.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = stroke.opacity ?? t.opacity
    ctx.drawImage(scratch, 0, 0)
  } else {
    ctx.globalAlpha = stroke.opacity ?? t.opacity
    ctx.fillStyle = stroke.color
    ctx.fill(path)
  }
  ctx.restore()
}

// Vẽ cả hình (các nét theo thứ tự, tẩy xoá nét bên dưới) rồi giới hạn trong vùng áo / túi
// Giới hạn trong khung chữ nhật (khổ A4) theo % khung ảnh: { x, y, w, h }
export function applyClip(ctx, clip, W, H) {
  if (!clip) return
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillRect((clip.x / 100) * W, (clip.y / 100) * H, (clip.w / 100) * W, (clip.h / 100) * H)
  ctx.restore()
}

export function renderDrawing(ctx, strokes, W, H, mask, clip) {
  ctx.clearRect(0, 0, W, H)
  for (const s of strokes) drawStroke(ctx, s, W, H)
  applyMask(ctx, mask, W, H)
  applyClip(ctx, clip, W, H)
}

// Xuất hình vẽ thành PNG nền trong suốt, cắt sát nét (độ phân giải in: khung 1600 px).
// Trả về null nếu không còn nét nào; ngược lại { blob, x, y, s, ar } là vị trí đặt lên khung (%) và tỉ lệ cao / ngang.
// clip: khung A4 (%) mà hình vẽ không được vượt ra ngoài.
export async function exportDrawing(strokes, mask, clip, F = 1600) {
  const c = document.createElement('canvas')
  c.width = c.height = F
  const ctx = c.getContext('2d', { willReadFrequently: true })
  renderDrawing(ctx, strokes, F, F, mask, clip)
  const data = ctx.getImageData(0, 0, F, F).data
  let x0 = F
  let y0 = F
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < F; y++)
    for (let x = 0; x < F; x++)
      if (data[(y * F + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return null
  // chừa vài điểm ảnh quanh nét, nhưng không vượt khung A4
  const pad = 4
  const lo = (v) => (clip ? Math.floor((v / 100) * F) : 0)
  const hi = (v, d) => (clip ? Math.ceil(((v + d) / 100) * F) - 1 : F - 1)
  x0 = Math.max(lo(clip?.x), 0, x0 - pad)
  y0 = Math.max(lo(clip?.y), 0, y0 - pad)
  x1 = Math.min(hi(clip?.x, clip?.w), F - 1, x1 + pad)
  y1 = Math.min(hi(clip?.y, clip?.h), F - 1, y1 + pad)
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h)
  const blob = await new Promise((r) => out.toBlob(r, 'image/png'))
  return { blob, x: ((x0 + w / 2) / F) * 100, y: ((y0 + h / 2) / F) * 100, s: (w / F) * 100, ar: h / w }
}

// Nét của hình vẽ đã bị kéo / đổi cỡ / xoay trên áo: đưa về toạ độ khung hiện tại để sửa tiếp
export function placeStrokes(strokes, from, to) {
  const k = to.s / from.s
  const a = ((to.r ?? 0) * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return strokes.map((st) => ({
    ...st,
    size: st.size * k,
    points: st.points.map(([x, y, p]) => {
      const dx = (x - from.x) * k
      const dy = (y - from.y) * k
      return [to.x + dx * cos - dy * sin, to.y + dx * sin + dy * cos, p]
    }),
  }))
}

// Bút mặc định khi mở chế độ vẽ: bút mực navy, mỗi bút một cỡ riêng
export const initialBrush = () => ({
  tool: 'pen',
  color: DRAW_COLORS[0],
  opacity: DRAW_TOOLS.marker.opacity,
  sizes: Object.fromEntries(Object.entries(DRAW_TOOLS).map(([k, t]) => [k, t.size])),
})
