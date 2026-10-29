// Ướm áo lên người trong khung hình camera (live mặc thử áo).
// Ảnh áo (đã cắt nền, kèm bản phối) được "bẻ" theo 4 điểm neo: hai vai và hai góc gấu áo.
// Cả ảnh được chia lưới, mỗi ô vẽ bằng 2 tam giác với phép biến đổi affine riêng (nội suy song tuyến từ 4 điểm neo,
// ngoại suy cho cổ áo và tay áo), nên áo nghiêng / xoay / co giãn theo dáng người chứ không chỉ phóng to thu nhỏ.

// Điểm neo trên ảnh áo thật (ao-trang.webp / ao-trang-cat.webp): đường may vai rơi và hai góc gấu áo,
// theo tỉ lệ 0..1 của khung ảnh vuông
export const TEE_ANCHORS = {
  shoulderL: { x: 0.213, y: 0.163 },
  shoulderR: { x: 0.788, y: 0.163 },
  hemL: { x: 0.205, y: 0.952 },
  hemR: { x: 0.777, y: 0.952 },
}

// Chỉ số điểm mốc của MediaPipe Pose
export const LM = {
  nose: 0,
  shoulderL: 11,
  shoulderR: 12,
  elbowL: 13,
  elbowR: 14,
  wristL: 15,
  wristR: 16,
  hipL: 23,
  hipR: 24,
}

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

// Góc xoay người (yaw, radian) từ độ sâu hai vai: dương = vai bên phải màn hình xa camera hơn
export function bodyYaw(shoulderA, shoulderB, W) {
  const [sl, sr] = shoulderA.x <= shoulderB.x ? [shoulderA, shoulderB] : [shoulderB, shoulderA]
  const dx = (sr.x - sl.x) / W
  const yaw = Math.atan2((sr.z ?? 0) - (sl.z ?? 0), Math.max(dx, 0.01))
  return Math.max(-0.45, Math.min(0.45, yaw * 0.8))
}

// Uốn ngang theo thân hình trụ: giữa áo phồng ra, hai mép co lại; xoay người thì bên xa co nhiều hơn.
// s: vị trí ngang (0 = vai trái, 1 = vai phải, ngoài khoảng đó là tay áo)
const WRAP = 0.6 // nửa góc ôm của thân (radian)
const LIMIT = 1.45 // quá góc này thì nối thẳng, tránh áo gập ngược ra sau
const arc = (a) =>
  a > LIMIT
    ? Math.sin(LIMIT) + (a - LIMIT) * Math.cos(LIMIT)
    : a < -LIMIT
      ? -Math.sin(LIMIT) + (a + LIMIT) * Math.cos(LIMIT)
      : Math.sin(a)
function wrapX(yaw) {
  const lo = arc(-WRAP + yaw)
  const hi = arc(WRAP + yaw)
  return (s) => (arc((s - 0.5) * 2 * WRAP + yaw) - lo) / (hi - lo)
}

// Ánh xạ điểm (u, v) trên ảnh áo (0..1) ra màn hình: song tuyến theo 4 điểm neo, ngoại suy ra ngoài
function mapper(src, dst, yaw = 0) {
  const u0 = (src.shoulderL.x + src.hemL.x) / 2
  const u1 = (src.shoulderR.x + src.hemR.x) / 2
  const v0 = (src.shoulderL.y + src.shoulderR.y) / 2
  const v1 = (src.hemL.y + src.hemR.y) / 2
  const wrap = wrapX(yaw)
  return (u, v) => {
    const s = wrap((u - u0) / (u1 - u0))
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

// Nếp vải giả (nách, eo, gấu) và bóng dưới cổ áo, vẽ một lần lên ảnh áo theo toạ độ ảnh.
const shaded = new WeakMap()
export function withFolds(img) {
  const hit = shaded.get(img)
  if (hit) return hit
  const w = img.width
  const h = img.height
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.drawImage(img, 0, 0)
  g.globalCompositeOperation = 'multiply'
  const blob = (x, y, rx, ry, rot, dark, blur) => {
    g.save()
    g.filter = `blur(${Math.round(blur * w)}px)`
    g.fillStyle = `rgba(70, 80, 100, ${dark})`
    g.beginPath()
    g.ellipse(x * w, y * h, rx * w, ry * h, rot, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  const { shoulderL: sl, shoulderR: sr, hemL: hl, hemR: hr } = TEE_ANCHORS
  // nếp chéo từ nách xuống eo
  blob(sl.x + 0.06, sl.y + 0.2, 0.014, 0.13, -0.35, 0.14, 0.018)
  blob(sr.x - 0.06, sr.y + 0.2, 0.014, 0.13, 0.35, 0.14, 0.018)
  blob(sl.x + 0.1, sl.y + 0.36, 0.01, 0.1, -0.2, 0.08, 0.018)
  blob(sr.x - 0.1, sr.y + 0.36, 0.01, 0.1, 0.2, 0.08, 0.018)
  // gợn sóng ở gấu áo
  for (let i = 1; i < 6; i++) {
    const x = hl.x + ((hr.x - hl.x) * i) / 6
    blob(x, hl.y - 0.04, 0.01, 0.05, (i - 3) * 0.06, 0.06, 0.016)
  }
  // bóng dưới cổ áo
  blob(0.5, sl.y - 0.02, 0.09, 0.018, 0, 0.18, 0.012)
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(img, 0, 0)
  shaded.set(img, c)
  return c
}

// Vẽ cả ảnh áo đã bẻ theo dáng người. cols × rows: độ mịn lưới; yaw: góc xoay người.
export function drawGarment(ctx, img, dst, { anchors = TEE_ANCHORS, cols = 10, rows = 12, yaw = 0 } = {}) {
  const w = img.width
  const h = img.height
  const map = mapper(anchors, dst, yaw)
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
