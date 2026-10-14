// Ướm áo lên người trong khung hình camera (live mặc thử áo).
// Ảnh áo (đã cắt nền, kèm bản phối) được "bẻ" theo 4 điểm neo: hai vai và hai góc gấu áo.
// Cả ảnh được chia lưới, mỗi ô vẽ bằng 2 tam giác với phép biến đổi affine riêng (nội suy song tuyến từ 4 điểm neo,
// ngoại suy cho cổ áo và tay áo), nên áo nghiêng / xoay / co giãn theo dáng người chứ không chỉ phóng to thu nhỏ.

// Điểm neo trên ảnh áo trắng (ao-trang.png / ao-trang-cat.png), theo tỉ lệ 0..1 của khung ảnh vuông
export const TEE_ANCHORS = {
  shoulderL: { x: 0.245, y: 0.155 },
  shoulderR: { x: 0.755, y: 0.155 },
  hemL: { x: 0.2, y: 0.92 },
  hemR: { x: 0.8, y: 0.92 },
}

// Chỉ số điểm mốc của MediaPipe Pose
export const LM = { nose: 0, shoulderL: 11, shoulderR: 12, hipL: 23, hipR: 24 }

const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

// Từ vai, hông (toạ độ màn hình) suy ra 4 điểm neo của áo trên người:
// vai áo oversize rơi ra ngoài vai thật một chút, gấu áo dài qua hông và rộng hơn hông.
export function bodyAnchors({ shoulderA, shoulderB, hipA, hipB }, fit = 1) {
  const [sl, sr] = shoulderA.x <= shoulderB.x ? [shoulderA, shoulderB] : [shoulderB, shoulderA]
  const [hl, hr] = hipA.x <= hipB.x ? [hipA, hipB] : [hipB, hipA]
  const sMid = lerp(sl, sr, 0.5)
  const hMid = lerp(hl, hr, 0.5)
  const torso = { x: hMid.x - sMid.x, y: hMid.y - sMid.y }
  const spread = (a, b, k) => ({ x: a.x + (a.x - b.x) * k, y: a.y + (a.y - b.y) * k })
  // vai: rộng thêm 18%, nhích lên một chút theo hướng thân
  const shoulderL = spread(sl, sr, 0.18 * fit)
  const shoulderR = spread(sr, sl, 0.18 * fit)
  shoulderL.x -= torso.x * 0.06
  shoulderL.y -= torso.y * 0.06
  shoulderR.x -= torso.x * 0.06
  shoulderR.y -= torso.y * 0.06
  // gấu áo: hông thật hẹp, nên nới rộng nhiều hơn và kéo xuống thêm 22% chiều dài thân
  const down = (p) => ({ x: p.x + torso.x * 0.22, y: p.y + torso.y * 0.22 })
  const hemL = down(spread(hl, hr, 0.55 * fit))
  const hemR = down(spread(hr, hl, 0.55 * fit))
  return { shoulderL, shoulderR, hemL, hemR }
}

// Ánh xạ điểm (u, v) trên ảnh áo (0..1) ra màn hình: song tuyến theo 4 điểm neo, ngoại suy ra ngoài
function mapper(src, dst) {
  const u0 = (src.shoulderL.x + src.hemL.x) / 2
  const u1 = (src.shoulderR.x + src.hemR.x) / 2
  const v0 = (src.shoulderL.y + src.shoulderR.y) / 2
  const v1 = (src.hemL.y + src.hemR.y) / 2
  return (u, v) => {
    const s = (u - u0) / (u1 - u0)
    const t = (v - v0) / (v1 - v0)
    const top = lerp(dst.shoulderL, dst.shoulderR, s)
    const bottom = lerp(dst.hemL, dst.hemR, s)
    return lerp(top, bottom, t)
  }
}

// Vẽ ảnh img (kích thước w×h) lên ctx theo tam giác s0,s1,s2 (toạ độ ảnh) → d0,d1,d2 (toạ độ màn hình)
function drawTriangle(ctx, img, s0, s1, s2, d0, d1, d2) {
  // nới tam giác đích 1.4px để các ô chồng mép lên nhau, không lộ đường nối
  const cx = (d0.x + d1.x + d2.x) / 3
  const cy = (d0.y + d1.y + d2.y) / 3
  const grow = (p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / len) * 1.4, y: p.y + (dy / len) * 1.4 }
  }
  const [e0, e1, e2] = [grow(d0), grow(d1), grow(d2)]
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(e0.x, e0.y)
  ctx.lineTo(e1.x, e1.y)
  ctx.lineTo(e2.x, e2.y)
  ctx.closePath()
  ctx.clip()
  // giải hệ affine: [a c e; b d f] biến s* thành d*
  const den = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y)
  if (Math.abs(den) < 1e-6) {
    ctx.restore()
    return
  }
  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / den
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / den
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / den
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / den
  const e =
    (d0.x * (s1.x * s2.y - s2.x * s1.y) +
      d1.x * (s2.x * s0.y - s0.x * s2.y) +
      d2.x * (s0.x * s1.y - s1.x * s0.y)) /
    den
  const f =
    (d0.y * (s1.x * s2.y - s2.x * s1.y) +
      d1.y * (s2.x * s0.y - s0.x * s2.y) +
      d2.y * (s0.x * s1.y - s1.x * s0.y)) /
    den
  ctx.transform(a, b, c, d, e, f)
  // chỉ vẽ phần ảnh quanh tam giác nguồn (nhanh hơn nhiều so với vẽ cả ảnh rồi cắt)
  const x0 = Math.max(0, Math.floor(Math.min(s0.x, s1.x, s2.x)) - 3)
  const y0 = Math.max(0, Math.floor(Math.min(s0.y, s1.y, s2.y)) - 3)
  const x1 = Math.min(img.width, Math.ceil(Math.max(s0.x, s1.x, s2.x)) + 3)
  const y1 = Math.min(img.height, Math.ceil(Math.max(s0.y, s1.y, s2.y)) + 3)
  if (x1 > x0 && y1 > y0) ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0)
  ctx.restore()
}

// Ô lưới nào hoàn toàn trong suốt (ngoài thân áo) thì bỏ qua khi vẽ; tính một lần cho mỗi ảnh
const emptyCells = new WeakMap()
function findEmpty(img, cols, rows) {
  const key = `${cols}x${rows}`
  const cached = emptyCells.get(img)
  if (cached?.key === key) return cached.empty
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const data = g.getImageData(0, 0, c.width, c.height).data
  const empty = new Set()
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const xa = Math.floor((i / cols) * c.width)
      const xb = Math.ceil(((i + 1) / cols) * c.width)
      const ya = Math.floor((j / rows) * c.height)
      const yb = Math.ceil(((j + 1) / rows) * c.height)
      let solid = false
      for (let y = ya; y < yb && !solid; y += 2)
        for (let x = xa; x < xb; x += 2)
          if (data[(y * c.width + x) * 4 + 3] > 4) {
            solid = true
            break
          }
      if (!solid) empty.add(j * cols + i)
    }
  emptyCells.set(img, { key, empty })
  return empty
}

// Vẽ cả ảnh áo đã bẻ theo dáng người. cols × rows: độ mịn lưới.
export function drawGarment(ctx, img, dst, { anchors = TEE_ANCHORS, cols = 10, rows = 12 } = {}) {
  const w = img.width
  const h = img.height
  const map = mapper(anchors, dst)
  const empty = findEmpty(img, cols, rows)
  const P = []
  for (let j = 0; j <= rows; j++) {
    const row = []
    for (let i = 0; i <= cols; i++) {
      const u = i / cols
      const v = j / rows
      row.push({ s: { x: u * w, y: v * h }, d: map(u, v) })
    }
    P.push(row)
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      if (empty.has(j * cols + i)) continue
      const p00 = P[j][i]
      const p10 = P[j][i + 1]
      const p01 = P[j + 1][i]
      const p11 = P[j + 1][i + 1]
      drawTriangle(ctx, img, p00.s, p10.s, p11.s, p00.d, p10.d, p11.d)
      drawTriangle(ctx, img, p00.s, p11.s, p01.s, p00.d, p11.d, p01.d)
    }
}
