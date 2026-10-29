import { PRODUCTS, maxWidthPctA4, stickerPct } from './products.js'

// Bản phối: mỗi lớp thuộc một mặt ('front' | 'back'; lớp cũ chưa có mặt = mặt trước).
// Sticker thư viện có cỡ in cố định: bề ngang luôn theo cỡ thật (STICKER_CM), chỉ đổi vị trí / góc xoay.
// Hình tự tải lên / hình vẽ đổi cỡ được nhưng không lớn hơn khổ A4.
export const sideOf = (it) => (it.side === 'back' ? 'back' : 'front')
export const onSide = (list, side) => list.filter((it) => sideOf(it) === side)

export function normalizeItem(it, productKey) {
  if (it.custom) {
    const max = maxWidthPctA4(productKey, it.ar ?? 1)
    return it.s > max ? { ...it, s: max } : it
  }
  if (!it.shape) return it
  return { ...it, s: stickerPct(productKey, it.shape) }
}
export const normalizeDesign = (list, productKey) => list.map((it) => normalizeItem(it, productKey))

// Giữ lớp nằm gọn trong khung in A4 (area: % khung ảnh). Bề ngang / cao tính cả góc xoay; sticker thư viện vuông.
// shrink: hình tự tạo lớn hơn khung (vd. đổi khung ngang → dọc, xoay nghiêng) thì thu nhỏ cho vừa.
function extent(it) {
  const h = it.s * (it.custom ? (it.ar ?? 1) : 1)
  const a = ((it.r ?? 0) * Math.PI) / 180
  const c = Math.abs(Math.cos(a))
  const s = Math.abs(Math.sin(a))
  return { w: it.s * c + h * s, h: it.s * s + h * c }
}
const fitAxis = (v, lo, size, ext) =>
  ext >= size ? lo + size / 2 : Math.min(lo + size - ext / 2, Math.max(lo + ext / 2, v))
export function keepInArea(it, area, shrink = true) {
  let next = it
  const e = extent(it)
  const k = Math.min(1, area.w / e.w, area.h / e.h)
  if (shrink && it.custom && k < 1) next = { ...it, s: it.s * k * 0.999 }
  const f = next === it ? e : extent(next)
  return { ...next, x: fitAxis(next.x, area.x, area.w, f.w), y: fitAxis(next.y, area.y, area.h, f.h) }
}
// Lớp có nằm trọn trong khung không (sai số nhỏ do làm tròn)
export function insideArea(it, area) {
  const e = extent(it)
  const d = 0.05
  return (
    it.x - e.w / 2 >= area.x - d &&
    it.x + e.w / 2 <= area.x + area.w + d &&
    it.y - e.h / 2 >= area.y - d &&
    it.y + e.h / 2 <= area.y + area.h + d
  )
}

// Ảnh mặt sau của món nền: túi dùng lại ảnh mặt trước; áo dựng từ ảnh mặt trước, che phần khoét cổ phía trước
// bằng màu vải rồi vẽ cổ bo phía sau cao hơn (ảnh áo thật chụp mặt trước nên không có sẵn mặt sau).
const backCache = new Map()
export function backPhoto(productKey) {
  const p = PRODUCTS[productKey]
  if (!p?.photo) return Promise.resolve(null)
  if (!p.backNeck) return Promise.resolve(p.photo)
  if (!backCache.has(productKey))
    backCache.set(
      productKey,
      buildBack(p.photo, p.backNeck).catch(() => p.photo)
    )
  return backCache.get(productKey)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = reject
    im.src = src
  })
}

// neck: toạ độ 0..1 theo khung ảnh: cx (giữa cổ), rx (nửa bề ngang phần khoét), top (mép trên cổ bo sau),
// bottom (đáy phần khoét trước), sag (độ võng giữa cổ sau, mặc định 0,9 bề dày cổ), wide / edge (mép cắt phía trên cổ sau
// kéo tới wide × rx, ở độ cao edge), rib (độ đậm gân cổ), fabric: điểm lấy mẫu màu vải [x, y]
async function buildBack(src, neck) {
  const im = await loadImage(src)
  const W = im.naturalWidth
  const H = im.naturalHeight
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.drawImage(im, 0, 0)
  const [fx, fy] = neck.fabric ?? [0.5, 0.32]
  const px = g.getImageData(Math.round(fx * W), Math.round(fy * H), 1, 1).data
  const fabric = `rgb(${px[0]}, ${px[1]}, ${px[2]})`
  const cx = neck.cx * W
  const rx = neck.rx * W
  const top = neck.top * H
  const bottom = neck.bottom * H
  const band = neck.band * H // bề dày cổ bo

  // phủ phần khoét cổ phía trước bằng màu vải, mép mờ để liền với thân áo
  g.save()
  g.filter = `blur(${Math.max(2, Math.round(W * 0.006))}px)`
  g.fillStyle = fabric
  g.beginPath()
  g.ellipse(
    cx,
    (top + band + bottom) / 2,
    rx * 1.02,
    (bottom - top - band) / 2 + band * 0.6,
    0,
    0,
    Math.PI * 2
  )
  g.fill()
  g.restore()

  // cổ bo phía sau: dải hơi cong, cao hơn cổ trước, có gân mờ
  const y0 = top
  const sag = neck.sag != null ? neck.sag * H : band * 0.9 // độ võng xuống ở giữa
  // bỏ phần ảnh phía trên mép cổ sau (cổ trước nhìn từ trước cao hơn) để mép trên áo cong theo cổ sau
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  // mép cắt kéo rộng ra hai bên tới vai (wide × rx, ở độ cao edge) để cổ sau liền với đường vai
  const wide = neck.wide ?? 1.04
  const edge = neck.edge != null ? neck.edge * H : y0 + band * 0.2
  g.moveTo(cx - rx * wide, 0)
  g.lineTo(cx - rx * wide, edge)
  // giữa mép cắt trùng giữa mép trên cổ bo (đường cong cổ bo đi qua y0 + band × 0,1 + sag / 2 ở giữa)
  g.quadraticCurveTo(cx, 2 * (y0 + band * 0.1 + sag / 2) - edge, cx + rx * wide, edge)
  g.lineTo(cx + rx * wide, 0)
  g.closePath()
  g.fill()
  g.restore()
  const path = new Path2D()
  path.moveTo(cx - rx, y0 + band * 0.2)
  path.quadraticCurveTo(cx, y0 + sag, cx + rx, y0 + band * 0.2)
  path.lineTo(cx + rx * 0.98, y0 + band * 1.2)
  path.quadraticCurveTo(cx, y0 + sag + band, cx - rx * 0.98, y0 + band * 1.2)
  path.closePath()
  g.fillStyle = fabric
  g.fill(path)
  g.save()
  g.clip(path)
  g.strokeStyle = `rgba(40, 45, 60, ${neck.rib ?? 0.07})`
  g.lineWidth = Math.max(1, W * 0.0018)
  for (let x = cx - rx; x < cx + rx; x += W * 0.006) {
    g.beginPath()
    g.moveTo(x, y0)
    g.lineTo(x, y0 + sag + band * 1.4)
    g.stroke()
  }
  g.restore()
  // đường may dưới cổ bo và bóng nhẹ
  g.strokeStyle = 'rgba(40, 45, 60, 0.16)'
  g.lineWidth = Math.max(1, W * 0.0022)
  g.beginPath()
  g.moveTo(cx - rx * 0.98, y0 + band * 1.2)
  g.quadraticCurveTo(cx, y0 + sag + band, cx + rx * 0.98, y0 + band * 1.2)
  g.stroke()

  const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
  return URL.createObjectURL(blob)
}
