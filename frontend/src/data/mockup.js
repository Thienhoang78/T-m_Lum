// Xuất ảnh mockup PNG (áo / túi + sticker) từ khối ProductVisual đang hiển thị.
// Dùng cho nút "Tải xuống" trong trình phối và ảnh xem trước gửi kèm đơn để studio biết vị trí ép.
// Sticker là SVG dùng biến màu CSS (var(--sun)...), nên khi xuất phải thay bằng màu thật.
const rootStyle = () => getComputedStyle(document.documentElement)
const resolveVars = (text) =>
  text.replace(/var\((--[\w-]+)\)/g, (_, name) => rootStyle().getPropertyValue(name).trim() || '#000')

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = () => reject(new Error('Không tải được hình để xuất mockup'))
    im.src = src
  })

// SVG trong trang → ảnh: chép kiểu chữ đang áp dụng (CSS) vào thẻ text, thay biến màu bằng màu thật
async function svgToImage(svg) {
  const clone = svg.cloneNode(true)
  const texts = svg.querySelectorAll('text')
  clone.querySelectorAll('text').forEach((t, i) => {
    const cs = getComputedStyle(texts[i])
    t.setAttribute('fill', cs.fill)
    t.setAttribute('font-family', cs.fontFamily)
    t.setAttribute('font-size', cs.fontSize)
    t.setAttribute('font-weight', cs.fontWeight)
    t.setAttribute('font-style', cs.fontStyle)
  })
  const r = svg.getBoundingClientRect()
  clone.setAttribute('width', Math.max(1, Math.round(r.width)) * 4)
  clone.setAttribute('height', Math.max(1, Math.round(r.height)) * 4)
  const markup = resolveVars(new XMLSerializer().serializeToString(clone))
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
  try {
    return await loadImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

const elementImage = (el) => {
  if (el.tagName === 'IMG') return loadImage(el.currentSrc || el.src)
  const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg')
  return svg ? svgToImage(svg) : Promise.resolve(null)
}

// visualEl: phần tử .tee-visual; design: danh sách sticker đang hiện (cùng thứ tự với DOM)
// transparent: bỏ nền trắng; baseSrc: dùng ảnh nền khác (vd. áo đã cắt nền cho live mặc thử);
// base: false: chỉ xuất lớp sticker (áo 3D tự vẽ thân áo, chỉ cần bản phối để in lên ngực)
// type / quality: định dạng ảnh xuất (vd. 'image/jpeg', 0.9 cho ảnh gửi live mặc thử Anywear)
export async function renderMockup(
  visualEl,
  design,
  size = 1000,
  { transparent = false, baseSrc, base: withBase = true, type = 'image/png', quality } = {}
) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')
  if (!transparent) {
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, size, size)
  }

  // Món nền: vừa khít khung vuông, giữ tỉ lệ
  const base = visualEl.querySelector(':scope > .tee-photo')
  const baseImg = !withBase ? null : baseSrc ? await loadImage(baseSrc) : base && (await elementImage(base))
  if (baseImg) {
    const k = Math.min(size / baseImg.width, size / baseImg.height)
    const w = baseImg.width * k
    const h = baseImg.height * k
    g.drawImage(baseImg, (size - w) / 2, (size - h) / 2, w, h)
  }

  const nodes = visualEl.querySelectorAll(':scope > .tee-placed-sticker')
  for (let i = 0; i < design.length; i++) {
    const it = design[i]
    const im = nodes[i] && (await elementImage(nodes[i]))
    if (!im) continue
    const w = (it.s / 100) * size
    const h = w * (im.height / im.width)
    g.save()
    g.translate((it.x / 100) * size, (it.y / 100) * size)
    g.rotate(((it.r || 0) * Math.PI) / 180)
    g.drawImage(im, -w / 2, -h / 2, w, h)
    g.restore()
  }
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
