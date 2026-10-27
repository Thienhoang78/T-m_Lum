// Làm áo 2.5D (ảnh áo thật bẻ theo dáng người) trông thật hơn trên hình camera:
// - đo bề ngang thân người từ mặt nạ tách người để áo vừa người thật, không theo dáng trung bình
// - ánh màu (nhiệt độ màu) theo hình camera, bóng mờ dưới cổ áo và nách
// - nếp vải nhích theo khi xoay / nghiêng người, mép áo mềm, hạt nhiễu giống camera
// - cổ, cằm và tóc phía trên cổ áo (hoặc tóc tối màu buông trên vai) nằm trên áo
// Mọi xử lý chạy trên trình duyệt, không gửi hình đi đâu.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

// Bề ngang thân người (pixel khung hình) ở hàng y, tìm từ tâm cx ra hai bên trên mặt nạ người.
// mask: { data (0..1), width, height } theo hình camera gốc (chưa lật gương).
export function bodyWidthAt(mask, mirror, W, H, cx, y) {
  if (!mask) return null
  const { data, width: mw, height: mh } = mask
  const row = Math.round(clamp(y / H, 0, 1) * (mh - 1))
  const toMask = (x) => {
    const u = clamp(x / W, 0, 1)
    return Math.round((mirror ? 1 - u : u) * (mw - 1))
  }
  const at = (mx) => data[row * mw + mx] > 0.5
  const c = toMask(cx)
  if (!at(c)) return null
  let l = c
  let r = c
  const limit = Math.round(mw * 0.45)
  while (l > 0 && at(l - 1) && c - l < limit) l--
  while (r < mw - 1 && at(r + 1) && r - c < limit) r++
  return ((r - l) / (mw - 1)) * W
}

// Màu trung bình vùng ngực trên hình camera → { light (độ sáng tương đối), tint [r, g, b] (0..1, trắng = 1) }
export function sceneTone(pixels) {
  let r = 0
  let g = 0
  let b = 0
  const n = pixels.length / 4
  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i]
    g += pixels[i + 1]
    b += pixels[i + 2]
  }
  r /= n
  g /= n
  b /= n
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const m = Math.max(r, g, b, 1)
  // chỉ mượn một phần ánh màu (áo trắng vẫn là trắng, chỉ ấm / lạnh theo đèn)
  const k = 0.2
  const tint = [1 - k + (k * r) / m, 1 - k + (k * g) / m, 1 - k + (k * b) / m]
  return { light: clamp(0.62 + lum / 420, 0.72, 1.08), tint }
}

// Phủ ánh màu lên áo (nhân màu), giữ nguyên độ trong suốt của áo; tmp: canvas nháp cùng cỡ
export function tintLayer(layer, tmp, tint) {
  const W = layer.width
  const H = layer.height
  if (tmp.width !== W || tmp.height !== H) {
    tmp.width = W
    tmp.height = H
  }
  const t = tmp.getContext('2d')
  t.clearRect(0, 0, W, H)
  t.drawImage(layer, 0, 0)
  const [r, gg, b] = tint.map((v) => Math.round(clamp(v, 0, 1) * 255))
  const g = layer.getContext('2d')
  g.save()
  g.globalCompositeOperation = 'multiply'
  g.fillStyle = `rgb(${r}, ${gg}, ${b})`
  g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(tmp, 0, 0)
  g.restore()
}

// Bóng mờ dưới cổ áo và ở hai nách; dst: 4 điểm neo áo trên màn hình
export function shadeCollarArms(g, dst) {
  const sl = dst.shoulderL
  const sr = dst.shoulderR
  const w = Math.hypot(sr.x - sl.x, sr.y - sl.y)
  const neck = lerp(sl, sr, 0.5)
  const down = { x: (dst.hemL.x + dst.hemR.x) / 2 - neck.x, y: (dst.hemL.y + dst.hemR.y) / 2 - neck.y }
  const len = Math.hypot(down.x, down.y) || 1
  const at = (p, t) => ({ x: p.x + (down.x / len) * t, y: p.y + (down.y / len) * t })
  g.save()
  g.globalCompositeOperation = 'source-atop'
  // dưới cổ áo
  const c = at(neck, w * 0.1)
  const rg = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, w * 0.32)
  rg.addColorStop(0, 'rgba(25, 30, 45, 0.16)')
  rg.addColorStop(1, 'rgba(25, 30, 45, 0)')
  g.fillStyle = rg
  g.fillRect(c.x - w, c.y - w, w * 2, w * 2)
  // hai nách
  for (const s of [sl, sr]) {
    const a = at(lerp(s, neck, 0.12), w * 0.42)
    const ag = g.createRadialGradient(a.x, a.y, 0, a.x, a.y, w * 0.22)
    ag.addColorStop(0, 'rgba(25, 30, 45, 0.22)')
    ag.addColorStop(1, 'rgba(25, 30, 45, 0)')
    g.fillStyle = ag
    g.fillRect(a.x - w, a.y - w, w * 2, w * 2)
  }
  g.restore()
}

// Nếp vải động: vài nếp chéo từ nách xuống eo, dịch theo góc xoay (yaw) và độ nghiêng thân (lean)
export function dynamicFolds(g, dst, yaw, lean) {
  const sl = dst.shoulderL
  const sr = dst.shoulderR
  const hl = dst.hemL
  const hr = dst.hemR
  const w = Math.hypot(sr.x - sl.x, sr.y - sl.y)
  const shift = (yaw * 0.25 + lean * 0.6) * w
  g.save()
  g.globalCompositeOperation = 'source-atop'
  g.lineCap = 'round'
  g.filter = `blur(${Math.max(2, Math.round(w * 0.025))}px)`
  const folds = [
    [0.08, 0.32, 0.36, 0.62, 0.16],
    [0.92, 0.32, 0.64, 0.62, 0.16],
    [0.14, 0.5, 0.4, 0.85, 0.1],
    [0.86, 0.5, 0.6, 0.85, 0.1],
  ]
  for (const [u0, v0, u1, v1, a] of folds) {
    const p = (u, v) => lerp(lerp(sl, sr, u), lerp(hl, hr, u), v)
    const s = p(u0, v0)
    const e = p(u1, v1)
    const m = lerp(s, e, 0.5)
    g.strokeStyle = `rgba(25, 30, 45, ${a})`
    g.lineWidth = Math.max(2, w * 0.035)
    g.beginPath()
    g.moveTo(s.x, s.y)
    g.quadraticCurveTo(m.x + shift, m.y, e.x + shift * 0.5, e.y)
    g.stroke()
    // vệt sáng cạnh nếp cho có khối
    g.strokeStyle = `rgba(255, 255, 255, ${a * 0.8})`
    g.lineWidth = Math.max(1, w * 0.02)
    g.beginPath()
    g.moveTo(s.x + w * 0.03, s.y)
    g.quadraticCurveTo(m.x + shift + w * 0.03, m.y, e.x + shift * 0.5 + w * 0.03, e.y)
    g.stroke()
  }
  g.restore()
}

// Mép áo mềm: nhân alpha của áo với bản mờ của chính nó (trong lòng áo không đổi, sát mép mờ dần)
export function featherLayer(layer, tmp, px) {
  const W = layer.width
  const H = layer.height
  if (tmp.width !== W || tmp.height !== H) {
    tmp.width = W
    tmp.height = H
  }
  const t = tmp.getContext('2d')
  t.clearRect(0, 0, W, H)
  t.filter = `blur(${px}px)`
  t.drawImage(layer, 0, 0)
  t.filter = 'none'
  const g = layer.getContext('2d')
  g.save()
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(tmp, 0, 0)
  g.restore()
}

// Hạt nhiễu giống camera, đổi vị trí mỗi khung hình; amount 0..1
let grain
export function addGrain(g, amount, frame) {
  if (amount <= 0) return
  if (!grain) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const x = c.getContext('2d')
    const img = x.createImageData(128, 128)
    let seed = 7
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647
      const v = seed % 256
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    x.putImageData(img, 0, 0)
    grain = c
  }
  const pat = g.createPattern(grain, 'repeat')
  const off = (frame * 37) % 128
  g.save()
  g.globalCompositeOperation = 'source-atop'
  g.globalAlpha = amount
  g.translate(off, (frame * 53) % 128)
  g.fillStyle = pat
  g.fillRect(-off, -((frame * 53) % 128), g.canvas.width, g.canvas.height)
  g.restore()
}

// Vùng cổ / cằm / tóc phía trên cổ áo: vẽ lại từ camera lên trên áo, giới hạn bằng mặt nạ người.
// Tóc tối màu buông xuống vai: giữ thêm các điểm ảnh tối trong dải vai cạnh cổ.
export function drawNeckHair(g, video, maskCanvas, mirror, W, H, dst, nose) {
  const sl = dst.shoulderL
  const sr = dst.shoulderR
  const w = Math.hypot(sr.x - sl.x, sr.y - sl.y)
  const neck = lerp(sl, sr, 0.5)
  g.clearRect(0, 0, W, H)
  g.save()
  // vùng giữ lại: phía trên đường cổ áo (rộng bằng đầu), thêm dải hai bên cổ cho tóc dài
  g.beginPath()
  const collarY = neck.y + w * 0.04
  const headTop = Math.min(nose?.y ?? neck.y - w * 0.6, neck.y - w * 0.4) - w * 0.5
  g.rect(neck.x - w * 0.24, headTop, w * 0.48, collarY - headTop)
  g.fill()
  g.restore()
  g.save()
  if (mirror) {
    g.translate(W, 0)
    g.scale(-1, 1)
  }
  g.globalCompositeOperation = 'source-in'
  g.drawImage(video, 0, 0, W, H)
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(maskCanvas, 0, 0, W, H)
  g.restore()
}
