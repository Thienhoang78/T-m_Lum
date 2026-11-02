// Khu trưng bày 3D ở đầu trang (Three.js, dựng hoàn toàn bằng code, không dùng file mô hình):
// các mẫu áo thun và túi tote xếp thành băng chuyền, mẫu đang xem đứng giữa trên bệ phát sáng, hai mẫu bên cạnh
// lùi ra sau và nghiêng vào trong. go(i) / next() / prev() chuyển mẫu (onChange báo mẫu mới); kéo để xoay mẫu
// đang xem 360° (có quán tính, tự xoay chậm khi để yên); bấm vào mẫu bên cạnh thì chuyển tới mẫu đó.
// Áo dựng kiểu "ghost mannequin" (phồng như có người mặc vô hình): thân tròn xoay dẹt, tay áo nối khít vào thân,
// bo cổ, bo tay, bo gấu; vải có thớ và nếp rủ bằng normal map vẽ bằng code.
// Hình in mỗi mẫu: 'logo' (hình của bạn, Combo 1), 'stickers' (bộ sticker của shop, Combo 1),
// 'pattern' (hoạ tiết đen trắng có sẵn, Combo 2). Chỉ vẽ khi khung đang hiện; giảm chuyển động thì đứng yên.
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  RepeatWrapping,
  Scene,
  Sprite,
  SplineCurve,
  SpriteMaterial,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { SMILE_FACE, STICKER_PATHS } from './stickerShapes.js'

const LOGO = '/brand/logo-640.webp'
const SPIN_SPEED = 0.45 // rad/giây khi mẫu đang xem tự xoay
const SPACING = 2.25 // khoảng cách ngang giữa các mẫu trên băng chuyền
const FLOAT_Y = 0.12

// ---------- Hoạ tiết vẽ bằng canvas ----------
function canvasTexture(size, draw, colorSpace = SRGBColorSpace) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  const tex = new CanvasTexture(c)
  tex.colorSpace = colorSpace
  return tex
}

// Normal map vải: thớ li ti + (tuỳ chọn) nếp rủ dọc ở nửa dưới. Lặp lại được.
function fabricNormal({ size = 256, folds = 0, grain = 0.02, weave = false } = {}) {
  const H = new Float32Array(size * size)
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      let h = rnd() * grain
      if (weave) h += (Math.sin(u * Math.PI * 2 * 48) + Math.sin(v * Math.PI * 2 * 48)) * 0.012
      // nếp rủ: mạnh ở gấu (v gần 1 trên canvas = dưới thân), nhạt dần lên ngực
      if (folds) h += Math.sin(u * Math.PI * 2 * folds + Math.sin(v * 9) * 0.6) * 0.09 * Math.max(0, v - 0.35)
      H[y * size + x] = h
    }
  return canvasTexture(
    size,
    (g) => {
      const img = g.createImageData(size, size)
      const at = (xx, yy) => H[((yy + size) % size) * size + ((xx + size) % size)]
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const gx = (at(x + 1, y) - at(x - 1, y)) * 3
          const gy = (at(x, y + 1) - at(x, y - 1)) * 3
          const len = Math.hypot(gx, gy, 1)
          const o = (y * size + x) * 4
          img.data[o] = (-gx / len) * 127.5 + 127.5
          img.data[o + 1] = (gy / len) * 127.5 + 127.5
          img.data[o + 2] = (1 / len) * 127.5 + 127.5
          img.data[o + 3] = 255
        }
      g.putImageData(img, 0, 0)
    },
    NoColorSpace
  )
}

// Bộ sticker của shop: cụm sticker die-cut viền trắng
function stickerPrint() {
  const items = [
    ['smile', '#ffc93c', 360, 330, 4.4, -8],
    ['heart', '#ff7ab6', 700, 300, 3.6, 12],
    ['flower', '#7be0ad', 600, 650, 3.8, -6],
    ['star', '#ffc93c', 250, 700, 3.2, 14],
    ['bolt', '#1e88e5', 860, 640, 2.8, 10],
  ]
  return canvasTexture(1024, (g) => {
    for (const [shape, color, x, y, s, r] of items) {
      const p = new Path2D(STICKER_PATHS[shape])
      g.save()
      g.translate(x, y)
      g.rotate((r * Math.PI) / 180)
      g.scale(s, s)
      g.translate(-50, -50)
      g.lineJoin = 'round'
      g.strokeStyle = g.fillStyle = '#ffffff'
      g.lineWidth = 14
      g.shadowColor = 'rgba(13,43,69,0.18)'
      g.shadowBlur = 6
      g.stroke(p)
      g.fill(p)
      g.shadowColor = 'transparent'
      g.fillStyle = color
      g.fill(p)
      if (shape === 'smile') {
        g.strokeStyle = '#0d2b45'
        g.lineWidth = 5
        g.lineCap = 'round'
        for (const d of SMILE_FACE) g.stroke(new Path2D(d))
      }
      g.restore()
    }
  })
}

// Hoạ tiết đen trắng có sẵn: huy hiệu caro + mặt cười, chữ chạy vòng quanh
function patternPrint() {
  return canvasTexture(1024, (g, S) => {
    const c = S / 2
    g.save()
    g.beginPath()
    g.arc(c, c, 330, 0, Math.PI * 2)
    g.clip()
    const q = 66
    for (let y = 0; y < S; y += q)
      for (let x = 0; x < S; x += q) {
        g.fillStyle = (x / q + y / q) % 2 ? '#111111' : '#ffffff'
        g.fillRect(x, y, q, q)
      }
    g.restore()
    g.lineWidth = 14
    g.strokeStyle = '#111111'
    g.beginPath()
    g.arc(c, c, 336, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(c, c, 170, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.lineCap = 'round'
    g.lineWidth = 18
    g.beginPath()
    g.arc(c, c + 10, 90, 0.15 * Math.PI, 0.85 * Math.PI)
    g.moveTo(c - 55, c - 50)
    g.lineTo(c - 55, c - 20)
    g.moveTo(c + 55, c - 50)
    g.lineTo(c + 55, c - 20)
    g.stroke()
    // chữ vòng ngoài
    const text = 'GOOD IDEAS • BRIGHTER DAYS • '.repeat(2)
    g.fillStyle = '#111111'
    g.font = '800 54px "Be Vietnam Pro", system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const step = (Math.PI * 2) / text.length
    for (let i = 0; i < text.length; i++) {
      g.save()
      g.translate(c, c)
      g.rotate(i * step)
      g.fillText(text[i], 0, -410)
      g.restore()
    }
  })
}

// ---------- Mô hình ----------
// dáng thân áo (bán kính, độ cao) làm mượt bằng spline để vai không gãy khúc; mặt cắt ngang dẹt theo DEPTH
const TORSO = new SplineCurve(
  [
    [0.63, -0.95],
    [0.635, -0.7],
    [0.62, -0.4],
    [0.61, -0.1],
    [0.615, 0.2],
    [0.605, 0.45],
    [0.57, 0.62],
    [0.48, 0.74],
    [0.34, 0.82],
    [0.2, 0.87],
  ].map(([r, y]) => new Vector2(r, y))
).getPoints(64)
const DEPTH = 0.6
function torsoRadius(y) {
  for (let i = 1; i < TORSO.length; i++) {
    const a = TORSO[i - 1]
    const b = TORSO[i]
    if (y <= b.y) return a.x + (b.x - a.x) * ((y - a.y) / (b.y - a.y))
  }
  return TORSO.at(-1).x
}
const insideTorso = (p) =>
  p.y >= TORSO[0].y && p.y <= TORSO.at(-1).y && p.x ** 2 + (p.z / DEPTH) ** 2 < torsoRadius(p.y) ** 2

// Tay áo: ống loe nhẹ chếch xuống 38°, cổ tay dẹt như vải rủ. Mỗi đường dọc ống đi từ cổ tay vào tới đúng chỗ nó
// chạm thân áo (lấn vào trong một chút), nên gốc tay áo ôm khít vai và nách, không có khe hở nào nhìn xuyên vào.
const SLEEVE = {
  angle: (38 * Math.PI) / 180,
  root: [0.4, 0.48],
  len: 0.66,
  r0: 0.24,
  r1: 0.215,
  kz0: 0.95,
  kz1: 0.7,
}
function sleeveFrame(s) {
  const { angle, root } = SLEEVE
  return {
    dir: new Vector3(s * Math.cos(angle), -Math.sin(angle), 0),
    up: new Vector3(s * Math.sin(angle), Math.cos(angle), 0),
    c0: new Vector3(s * root[0], root[1], 0),
  }
}
function sleeveGeometry(s) {
  const { len, r0, r1, kz0, kz1 } = SLEEVE
  const { dir, up, c0 } = sleeveFrame(s)
  const at = (t, psi, out = new Vector3()) => {
    const u = t / len
    const r = r0 + (r1 - r0) * u
    return out
      .copy(c0)
      .addScaledVector(dir, t)
      .addScaledVector(up, Math.cos(psi) * r)
      .setZ(Math.sin(psi) * r * (kz0 + (kz1 - kz0) * u))
  }
  const seg = 48
  const rows = 14
  const p = new Vector3()
  const pos = []
  const uv = []
  for (let j = 0; j <= seg; j++) {
    const psi = (j / seg) * Math.PI * 2
    // dò từ cổ tay vào trong tới khi chạm thân áo
    let t = len
    while (t > -0.6 && !insideTorso(at(t, psi, p))) t -= 0.01
    let lo = t
    let hi = t + 0.01
    for (let k = 0; k < 12; k++) {
      const mid = (lo + hi) / 2
      if (insideTorso(at(mid, psi, p))) lo = mid
      else hi = mid
    }
    const start = lo - 0.03
    for (let k = 0; k <= rows; k++) {
      at(start + ((len - start) * k) / rows, psi, p)
      pos.push(p.x, p.y, p.z)
      uv.push(j / seg, k / rows)
    }
  }
  const index = []
  for (let j = 0; j < seg; j++)
    for (let k = 0; k < rows; k++) {
      const a = j * (rows + 1) + k
      const b = a + 1
      const c = a + rows + 1
      const d = c + 1
      // bên phải (s = 1) là ảnh gương của bên trái nên đảo chiều tam giác để mặt ngoài vẫn hướng ra ngoài
      if (s > 0) index.push(a, c, b, b, c, d)
      else index.push(a, b, c, b, d, c)
    }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  // đường nối vòng quanh ống (cột đầu và cột cuối trùng nhau): lấy pháp tuyến trung bình cho liền mạch
  const n = geo.attributes.normal
  const last = seg * (rows + 1)
  for (let k = 0; k <= rows; k++) {
    const v = new Vector3()
      .fromBufferAttribute(n, k)
      .add(new Vector3().fromBufferAttribute(n, last + k))
      .normalize()
    n.setXYZ(k, v.x, v.y, v.z)
    n.setXYZ(last + k, v.x, v.y, v.z)
  }
  return geo
}
// mảnh in bám theo thân áo: dải độ cao [y0, y1], góc quanh trục [phi0 ± half]
function printPatch(y0, y1, phi0, half) {
  const rows = 14
  const pts = Array.from({ length: rows + 1 }, (_, k) => {
    const y = y0 + ((y1 - y0) * k) / rows
    return new Vector2(torsoRadius(y) + 0.006, y)
  })
  return new LatheGeometry(pts, 28, phi0 - half, half * 2)
}

function makeKit(logoTex) {
  const teeNormal = fabricNormal({ folds: 9, grain: 0.03 })
  const canvasNormal = fabricNormal({ grain: 0.025, weave: true })
  canvasNormal.wrapS = canvasNormal.wrapT = RepeatWrapping
  canvasNormal.repeat.set(3, 3)
  const physical = (color, o = {}) => new MeshPhysicalMaterial({ color, roughness: 0.6, ...o })
  const tee = physical('#f7f6f2', {
    roughness: 0.88,
    sheen: 0.7,
    sheenRoughness: 0.6,
    sheenColor: '#ffffff',
    normalMap: teeNormal,
    normalScale: new Vector2(0.45, 0.45),
  })
  const print = (map) =>
    new MeshPhysicalMaterial({
      map,
      transparent: true,
      roughness: 0.8,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    })
  return {
    tee,
    teeInside: physical('#dcd8cf', { roughness: 0.95, side: BackSide }),
    rib: physical('#ecebe5', { roughness: 0.9, sheen: 0.5, sheenColor: '#ffffff' }),
    canvas: physical('#efe7d6', {
      roughness: 0.95,
      sheen: 0.4,
      sheenColor: '#fff6e6',
      normalMap: canvasNormal,
      normalScale: new Vector2(0.5, 0.5),
    }),
    prints: { logo: print(logoTex), stickers: print(stickerPrint()), pattern: print(patternPrint()) },
    tagPrint: print(logoTex),
    torsoGeo: new LatheGeometry(TORSO, 72),
    sleeveGeos: [sleeveGeometry(-1), sleeveGeometry(1)],
    sleeveRib: new TorusGeometry(SLEEVE.r1, 0.022, 10, 48),
    collarGeo: new TorusGeometry(0.205, 0.035, 12, 64),
    hemGeo: new TorusGeometry(torsoRadius(-0.95) + 0.004, 0.02, 10, 96),
    frontPatch: printPatch(-0.22, 0.55, 0, 0.62),
    tagPatch: printPatch(0.6, 0.74, Math.PI, 0.17),
    toteGeo: new RoundedBoxGeometry(0.9, 1.0, 0.14, 4, 0.04),
    toteHemGeo: new RoundedBoxGeometry(0.91, 0.08, 0.15, 2, 0.02),
    handleGeos: [0.055, -0.055].map(
      (z) =>
        new TubeGeometry(
          new CatmullRomCurve3([
            new Vector3(-0.24, 0.48, z),
            new Vector3(-0.21, 0.78, z),
            new Vector3(0, 0.92, z),
            new Vector3(0.21, 0.78, z),
            new Vector3(0.24, 0.48, z),
          ]),
          40,
          0.026,
          10
        )
    ),
    plane: new PlaneGeometry(1, 1),
  }
}

function makeTee(kit, print) {
  const g = new Group()
  const add = (geo, mat, cfg = {}) => {
    const m = new Mesh(geo, mat)
    if (cfg.pos) m.position.set(...cfg.pos)
    if (cfg.rot) m.rotation.set(...cfg.rot)
    if (cfg.scale) m.scale.set(...cfg.scale)
    g.add(m)
    return m
  }
  for (const mat of [kit.tee, kit.teeInside]) add(kit.torsoGeo, mat, { scale: [1, 1, DEPTH] })
  // tay áo nối khít vào thân, bo tay ở cổ tay
  kit.sleeveGeos.forEach((geo, i) => {
    for (const mat of [kit.tee, kit.teeInside]) add(geo, mat)
    const { dir, c0 } = sleeveFrame(i ? 1 : -1)
    const end = c0.clone().addScaledVector(dir, SLEEVE.len)
    const rib = add(kit.sleeveRib, kit.rib, { pos: end.toArray() })
    rib.lookAt(end.clone().add(dir))
    // sau lookAt, trục x cục bộ của vòng bo trùng trục z thế giới: dẹt theo chiều trước–sau như cổ tay áo
    rib.scale.set(SLEEVE.kz1, 1, 1)
  })
  add(kit.collarGeo, kit.rib, { pos: [0, 0.865, 0], rot: [Math.PI / 2, 0, 0], scale: [1, DEPTH, 1] })
  add(kit.hemGeo, kit.rib, { pos: [0, -0.94, 0], rot: [Math.PI / 2, 0, 0], scale: [1, DEPTH, 1] })
  add(kit.frontPatch, kit.prints[print], { scale: [1, 1, DEPTH] })
  add(kit.tagPatch, kit.tagPrint, { scale: [1, 1, DEPTH] })
  g.scale.setScalar(0.95)
  return g
}

function makeTote(kit, print) {
  const g = new Group()
  g.add(new Mesh(kit.toteGeo, kit.canvas))
  const hem = new Mesh(kit.toteHemGeo, kit.canvas)
  hem.position.y = 0.46
  g.add(hem)
  for (const geo of kit.handleGeos) g.add(new Mesh(geo, kit.canvas))
  const front = new Mesh(kit.plane, kit.prints[print])
  front.scale.setScalar(0.66)
  front.position.set(0, -0.04, 0.0705)
  g.add(front)
  g.position.y = -0.18
  const wrap = new Group()
  wrap.add(g)
  wrap.scale.setScalar(1.12)
  return wrap
}

function radialSprite(stops, scale) {
  const tex = canvasTexture(256, (g, S) => {
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    for (const [at, col] of stops) grd.addColorStop(at, col)
    g.fillStyle = grd
    g.fillRect(0, 0, S, S)
  })
  const s = new Sprite(
    new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: AdditiveBlending })
  )
  s.scale.setScalar(scale)
  return s
}

// ---------- Khung cảnh ----------
export async function createShowcase(host, { items, reduced = false, onChange } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const logoTex = await new TextureLoader().loadAsync(LOGO)
  logoTex.colorSpace = SRGBColorSpace
  logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const kit = makeKit(logoTex)

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  scene.environmentIntensity = 0.55
  const key = new DirectionalLight('#fff4e8', 2.2)
  key.position.set(3, 5, 6)
  const rimBlue = new DirectionalLight('#64b5f6', 2.8)
  rimBlue.position.set(-5, 2.5, -4)
  const rimPink = new DirectionalLight('#ff7ab6', 2.4)
  rimPink.position.set(5, 1.5, -4)
  scene.add(key, rimBlue, rimPink, new HemisphereLight('#dfeaff', '#1b2b45', 0.55))

  // bệ trưng bày phát sáng dưới mẫu đang xem
  const pedestal = new Group()
  pedestal.position.y = -1.32
  pedestal.add(
    new Mesh(
      new CylinderGeometry(1.0, 1.06, 0.14, 72),
      new MeshPhysicalMaterial({
        color: '#0c2440',
        roughness: 0.45,
        clearcoat: 0.6,
        clearcoatRoughness: 0.3,
        envMapIntensity: 0.35,
      })
    )
  )
  const ring = new Mesh(
    new TorusGeometry(1.0, 0.012, 8, 128),
    new MeshBasicMaterial({ color: '#7cc4ff', transparent: true, opacity: 0.9, blending: AdditiveBlending })
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.071
  pedestal.add(ring)
  const halo = radialSprite(
    [
      [0, 'rgba(124,196,255,0.32)'],
      [0.45, 'rgba(255,122,182,0.12)'],
      [1, 'rgba(0,0,0,0)'],
    ],
    3.2
  )
  halo.position.set(0, 1.1, -0.6)
  pedestal.add(halo)
  scene.add(pedestal)

  // băng chuyền các mẫu
  const slots = items.map((it, i) => {
    const holder = new Group()
    const model = it.kind === 'tui' ? makeTote(kit, it.print) : makeTee(kit, it.print)
    holder.add(model)
    holder.userData.index = i
    scene.add(holder)
    return { holder, model, spin: 0, spinVel: 0 }
  })
  const n = slots.length
  let current = 0
  let pos = 0 // vị trí băng chuyền (số thực, tiến dần tới current)
  const wrap = (d) => ((((d + n / 2) % n) + n) % n) - n / 2

  const camera = new PerspectiveCamera(30, 1, 0.1, 100)
  camera.position.set(0, 0.55, 6.4)
  camera.lookAt(0, 0.02, 0)
  const canvas = renderer.domElement
  host.appendChild(canvas)

  // ---------- Chuyển mẫu ----------
  function go(i) {
    const next = ((i % n) + n) % n
    // đi đường ngắn nhất trên vòng
    pos = next + wrap(pos - next)
    current = next
    onChange?.(current)
    start()
  }

  // ---------- Kéo xoay mẫu đang xem, bấm chọn mẫu bên cạnh ----------
  let drag = null
  let down = null
  const ray = new Raycaster()
  const ndc = new Vector2()
  const onDown = (e) => {
    drag = { x: e.clientX, t: performance.now() }
    down = { x: e.clientX, y: e.clientY }
    try {
      host.setPointerCapture(e.pointerId)
    } catch {
      // con trỏ không còn hoạt động: vẫn kéo được trong khung
    }
    host.classList.add('is-dragging')
    start()
  }
  const onMove = (e) => {
    if (!drag) return
    const now = performance.now()
    const d = (e.clientX - drag.x) * 0.012
    const s = slots[current]
    s.spin += d
    s.spinVel = d / Math.max(0.016, (now - drag.t) / 1000)
    drag = { x: e.clientX, t: now }
    start()
  }
  const onUp = (e) => {
    const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 99
    drag = null
    down = null
    host.classList.remove('is-dragging')
    if (moved < 6) {
      const r = host.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(
        slots.map((s) => s.holder),
        true
      )[0]
      let o = hit?.object
      while (o && o.userData.index === undefined) o = o.parent
      if (o && o.userData.index !== current) go(o.userData.index)
    }
    start()
  }
  host.addEventListener('pointerdown', onDown)
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerup', onUp)
  host.addEventListener('pointercancel', onUp)

  // ---------- Vòng vẽ ----------
  let raf = 0
  let visible = true
  let last = performance.now()
  let t = 0
  function resize() {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // khung hẹp thì lùi camera để mẫu đang xem vẫn vừa
    camera.position.z = 6.4 * Math.max(1, 1.05 / camera.aspect)
    camera.updateProjectionMatrix()
  }
  function frame(now) {
    raf = 0
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    t += dt
    pos += (current - pos) * (1 - Math.exp(-dt * 6))
    if (Math.abs(current - pos) < 0.0005) pos = current
    let animating = Math.abs(current - pos) > 0
    slots.forEach((s, i) => {
      const d = wrap(i - pos)
      const a = Math.min(Math.abs(d), 1.6)
      s.holder.visible = Math.abs(d) < 1.75
      s.holder.position.set(d * SPACING, FLOAT_Y + (reduced ? 0 : Math.sin(t * 1.3 + i) * 0.05), -a * 1.4)
      s.holder.scale.setScalar(1 - a * 0.28)
      s.holder.rotation.y = -d * 0.55
      if (i === current) {
        if (!drag) {
          s.spinVel += ((reduced ? 0 : SPIN_SPEED) - s.spinVel) * (1 - Math.exp(-dt * 1.5))
          s.spin += s.spinVel * dt
        }
        if (drag || Math.abs(s.spinVel) > 0.002) animating = true
      } else {
        // mẫu bên cạnh quay về mặt trước để thấy hình in
        const front = Math.round(s.spin / (Math.PI * 2)) * Math.PI * 2
        s.spin += (front - s.spin) * (1 - Math.exp(-dt * 4))
        s.spinVel = 0
        if (Math.abs(front - s.spin) > 0.001) animating = true
      }
      s.model.rotation.y = s.spin
    })
    if (!reduced) {
      halo.material.opacity = 0.85 + Math.sin(t * 2) * 0.15
      animating = true
    }
    renderer.render(scene, camera)
    if (visible && !document.hidden && (animating || drag)) raf = requestAnimationFrame(frame)
  }
  function start() {
    if (!raf && visible) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }
  const ro = new ResizeObserver(() => {
    resize()
    start()
  })
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) start()
  })
  const onVis = () => !document.hidden && start()
  resize()
  ro.observe(host)
  io.observe(host)
  document.addEventListener('visibilitychange', onVis)
  start()

  return {
    go,
    next: () => go(current + 1),
    prev: () => go(current - 1),
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerup', onUp)
      host.removeEventListener('pointercancel', onUp)
      const geos = new Set()
      const mats = new Set()
      scene.traverse((o) => {
        if (o.geometry) geos.add(o.geometry)
        for (const m of [o.material].flat()) if (m) mats.add(m)
      })
      geos.forEach((g) => g.dispose())
      mats.forEach((m) => {
        m.map?.dispose()
        m.normalMap?.dispose()
        m.dispose()
      })
      envTex.dispose()
      pmrem.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
