// Tách nền sticker ngay trên trình duyệt (không cần máy chủ, không dịch vụ trả phí). Tự chọn cách:
//   1. Ảnh đã có nền trong suốt          → giữ nguyên.
//   2. Viền ảnh phần lớn một màu (nền trơn) → loang từ mép vào, xoá các điểm gần màu nền (flood fill),
//      giữ mép sắc ở độ phân giải gốc, chỉnh được độ nhạy.
//   3. Ảnh chụp / nền nhiều màu           → mô hình AI U²-Netp (Apache-2.0) chạy bằng onnxruntime-web
//      trong Web Worker; mô hình chỉ tải khi cần và được trình duyệt lưu đệm.
// Kết quả là PNG trong suốt, cắt sát quanh sticker, nhỏ hơn 4 MB (giới hạn tải lên).
const MAX_SIDE = 2400 // ảnh lớn hơn thì thu nhỏ trước khi xử lý
const MIN_SIDE = 1500 // khi phải thu nhỏ cho vừa 4 MB thì không nhỏ hơn mức này
const MAX_BYTES = 4 * 1024 * 1024
const MODEL_SIZE = 320
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

const fail = (reason) => ({ blob: null, method: null, reason })
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// ---------- Mô hình AI chạy trong Web Worker ----------
let worker
let seq = 0
const pending = new Map()

function runModel(input) {
  if (!worker) {
    worker = new Worker(new URL('./bgModel.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id)
      pending.delete(e.data.id)
      if (e.data.error) p?.reject(new Error(e.data.error))
      else p?.resolve(e.data.mask)
    }
    worker.onerror = () => {
      pending.forEach((p) => p.reject(new Error('Không tải được mô hình tách nền')))
      pending.clear()
      worker.terminate()
      worker = undefined
    }
  }
  return new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, input, size: MODEL_SIZE }, [input.buffer])
  })
}

async function aiMask(canvas, w, h, px) {
  const S = MODEL_SIZE
  const small = document.createElement('canvas')
  small.width = S
  small.height = S
  const sctx = small.getContext('2d', { willReadFrequently: true })
  sctx.drawImage(canvas, 0, 0, S, S)
  const d = sctx.getImageData(0, 0, S, S).data
  let max = 1
  for (let i = 0; i < d.length; i += 4) max = Math.max(max, d[i], d[i + 1], d[i + 2])
  const input = new Float32Array(3 * S * S)
  for (let i = 0; i < S * S; i++)
    for (let c = 0; c < 3; c++) input[c * S * S + i] = (d[i * 4 + c] / max - MEAN[c]) / STD[c]

  const raw = await runModel(input)
  let lo = Infinity
  let hi = -Infinity
  for (const v of raw) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  // Mặt nạ 320×320 → kênh alpha, tăng tương phản nhẹ cho mép gọn, rồi phóng lên kích thước thật (làm mượt)
  const m = sctx.createImageData(S, S)
  for (let i = 0; i < S * S; i++) {
    const v = clamp01(((raw[i] - lo) / (hi - lo || 1) - 0.15) / 0.7)
    m.data[i * 4 + 3] = Math.round(v * 255)
  }
  sctx.putImageData(m, 0, 0)
  const big = document.createElement('canvas')
  big.width = w
  big.height = h
  const bctx = big.getContext('2d', { willReadFrequently: true })
  bctx.imageSmoothingQuality = 'high'
  bctx.drawImage(small, 0, 0, w, h)
  const a = bctx.getImageData(0, 0, w, h).data
  let kept = 0
  for (let i = 0; i < w * h; i++) {
    px[i * 4 + 3] = Math.round((px[i * 4 + 3] * a[i * 4 + 3]) / 255)
    if (px[i * 4 + 3] > 128) kept++
  }
  return kept / (w * h)
}

// ---------- Nền trơn: loang từ mép ----------
function floodFill(px, w, h, border, bg, tolerance) {
  const dist = (o) => Math.hypot(px[o] - bg[0], px[o + 1] - bg[1], px[o + 2] - bg[2])
  const removed = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let head = 0
  let tail = 0
  const visit = (j) => {
    if (!removed[j] && dist(j * 4) < tolerance) {
      removed[j] = 1
      queue[tail++] = j
    }
  }
  border.forEach(visit)
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    if (x > 0) visit(i - 1)
    if (x < w - 1) visit(i + 1)
    if (i >= w) visit(i - w)
    if (i + w < w * h) visit(i + w)
  }
  // Làm mềm mép: điểm sát vùng đã xoá mà còn hơi giống màu nền thì mờ dần
  const soft = tolerance * 1.8
  for (let i = 0; i < w * h; i++) {
    const o = i * 4
    if (removed[i]) {
      px[o + 3] = 0
      continue
    }
    const x = i % w
    const touches =
      (x > 0 && removed[i - 1]) ||
      (x < w - 1 && removed[i + 1]) ||
      (i >= w && removed[i - w]) ||
      (i + w < w * h && removed[i + w])
    if (touches) {
      const d = dist(o)
      if (d < soft) px[o + 3] = Math.round(px[o + 3] * Math.max(0, (d - tolerance) / (soft - tolerance)))
    }
  }
  return tail / (w * h)
}

// ---------- Cắt sát + nén cho vừa 4 MB ----------
async function cropAndEncode(canvas, w, h, px) {
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (px[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return null
  const pad = 4
  x0 = Math.max(0, x0 - pad)
  y0 = Math.max(0, y0 - pad)
  x1 = Math.min(w - 1, x1 + pad)
  y1 = Math.min(h - 1, y1 + pad)
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext('2d').drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height)

  const encode = (c, type) => new Promise((r) => c.toBlob(r, type, 0.92))
  let blob = await encode(out, 'image/png')
  let reduced = false
  let side = Math.max(out.width, out.height)
  // PNG trong suốt có thể nặng: thu nhỏ dần (không dưới 1500px), cuối cùng thử WebP giữ nền trong suốt
  while (blob && blob.size > MAX_BYTES && side > MIN_SIDE) {
    side = Math.max(MIN_SIDE, Math.round(side * 0.85))
    const k = side / Math.max(out.width, out.height)
    const c2 = document.createElement('canvas')
    c2.width = Math.round(out.width * k)
    c2.height = Math.round(out.height * k)
    c2.getContext('2d').drawImage(out, 0, 0, c2.width, c2.height)
    blob = await encode(c2, 'image/png')
    reduced = true
    if (blob && blob.size > MAX_BYTES && side === MIN_SIDE) blob = await encode(c2, 'image/webp')
  }
  if (!blob || blob.size > MAX_BYTES) return null
  return { blob, reduced }
}

// Kết quả: { blob, method: 'flood' | 'ai', reduced } khi tách được; { blob: null, reason } khi giữ ảnh gốc.
export async function cutOut(file, { tolerance = 42 } = {}) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return fail('Không đọc được ảnh')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  const img = ctx.getImageData(0, 0, w, h)
  const px = img.data

  const border = []
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x)
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1)

  // 1. Đã có nền trong suốt
  if (border.filter((i) => px[i * 4 + 3] < 200).length > border.length * 0.3)
    return fail('Ảnh đã có nền trong suốt')

  // Màu nền = nhóm màu xuất hiện nhiều nhất ở viền (gom theo bước 16)
  const groups = new Map()
  for (const i of border) {
    const o = i * 4
    const key = ((px[o] >> 4) << 8) | ((px[o + 1] >> 4) << 4) | (px[o + 2] >> 4)
    const g = groups.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    g.n++
    g.r += px[o]
    g.g += px[o + 1]
    g.b += px[o + 2]
    groups.set(key, g)
  }
  const top = [...groups.values()].sort((a, b) => b.n - a.n)[0]

  let method = null
  // 2. Nền trơn
  if (top.n >= border.length * 0.5) {
    const backup = new Uint8ClampedArray(px)
    const ratio = floodFill(px, w, h, border, [top.r / top.n, top.g / top.n, top.b / top.n], tolerance)
    if (ratio >= 0.02 && ratio <= 0.98) method = 'flood'
    else px.set(backup) // không tách được gì đáng kể: thử AI
  }
  // 3. Ảnh chụp / nền nhiều màu
  if (!method) {
    try {
      const kept = await aiMask(canvas, w, h, px)
      if (kept < 0.01) return fail('Không nhận ra sticker trong ảnh')
      method = 'ai'
    } catch (err) {
      return fail(err.message || 'Không tách nền được')
    }
  }
  ctx.putImageData(img, 0, 0)
  const enc = await cropAndEncode(canvas, w, h, px)
  if (!enc) return fail('Ảnh sau khi tách nền vẫn quá nặng')
  return { blob: enc.blob, method, reduced: enc.reduced || scale < 1, reason: null }
}
