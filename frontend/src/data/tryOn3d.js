// Áo 3D cho live mặc thử: lưới áo thun dựng bằng code (thân, vai rơi, cổ bo, tay ngắn), không dùng file mô hình.
// Mỗi khung hình, lưới được "gắn xương" (skinning trên CPU) theo 5 khớp: thân trên, thân dưới (hông), hai vai,
// hai bắp tay, lấy từ điểm mốc MediaPipe. Vẽ bằng Three.js (MIT) với camera trực giao trùng khung hình camera:
// x, y theo pixel, z là độ sâu (pixel, dương = gần camera) suy từ worldLandmarks.
// Bản phối in lên ngực theo đúng toạ độ ảnh áo phẳng (ao-trang.png), nếp vải bằng normal map vẽ bằng code,
// cẳng tay / bàn tay / cổ thật được vẽ đè lên áo nhờ các khối chỉ ghi độ sâu (không ghi màu).
import {
  CanvasTexture,
  Color,
  CylinderGeometry,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  OrthographicCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'

// Đơn vị mô hình: x, z tính theo nửa khoảng cách hai khớp vai (S); y tính theo chiều dài thân,
// từ giữa hai vai xuống giữa hai hông (T). Khớp vai trái người mặc ở (+1, 0, 0), giữa hông ở (0, -1, 0).
// z dương = phía trước ngực. Kích thước thật trung bình để dựng dáng lúc nghỉ:
const S_M = 0.18 // mét / S
const T_M = 0.5 // mét / T

const COLS = 56 // số điểm mỗi vòng thân
const SLEEVE_SEG = 24 // số điểm mỗi vòng tay áo
const SLEEVE_RINGS = 12

// Hình dáng thân áo (oversize, vai rơi, form suông)
const SHAPE = {
  neckA: 0.44, // nửa bề ngang cổ
  neckB: 0.34, // nửa bề sâu cổ
  neckZ: 0.12, // tâm vòng cổ nhích ra trước (cổ nằm trước khớp vai, cổ áo trước sát ngực)
  neckBack: 0.13, // độ cao vòng cổ phía sau (T)
  neckFront: -0.06, // phía trước khoét thấp hơn (dưới tầm khớp vai)
  shoulderY: 0.02, // nơi vai rơi gặp sườn áo
  bodyA: 1.22, // nửa bề ngang thân
  hemY: -1.24, // gấu áo, dưới khớp hông 24% thân
}

// Tay áo lúc nghỉ: chếch xuống, ra ngoài 35° (như ảnh áo phẳng), quay quanh khớp vai.
// Ống tay rộng hơn bắp tay nên vải rủ xuống: trục ống lệch xuống dưới bắp tay (theo trọng lực).
const SLEEVE = {
  pivot: [1.0, 0], // (S, T)
  restAngle: (35 * Math.PI) / 180,
  d0: -0.2, // bắt đầu lùi vào trong thân (chỗ nối nằm trong thân áo, thành đường may nách)
  d1: 1.4, // độ dài tay áo tính từ khớp vai (S)
  r0: 0.52,
  r1: 0.45,
  armR: 0.27, // bán kính bắp tay (S): ống tay tựa lên mặt trên bắp tay
}

// Hướng vải tay áo rủ xuống: phần trọng lực g vuông góc với trục a. Tay chếch khỏi phương thẳng đứng
// một chút là vải đã tựa hẳn lên mặt trên bắp tay; tay buông thẳng thì ống tay đều quanh tay.
function dropDir(a, g, out) {
  out.copy(g).addScaledVector(a, -g.dot(a))
  const len = out.length()
  return len < 1e-4 ? out.set(0, 0, 0) : out.multiplyScalar(Math.min(1, len / 0.35) / len)
}

// Ánh xạ toạ độ mô hình (x theo S, y theo T) → toạ độ ảnh áo phẳng (0..1): vai rơi ở (0.25 / 0.75, 0.2), gấu ở 0.92
const photoU = (x) => 0.5 + x * (0.25 / SHAPE.bodyA)
const photoV = (y) => 0.2 + (0.05 - y) * (0.72 / 1.29)

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lerp = (a, b, t) => a + (b - a) * t
// siêu ellipse cho tiết diện thân: vuông vức hơn ellipse thường, giống áo suông
const sp = (c, n) => Math.sign(c) * Math.abs(c) ** (2 / n)

// ---------- Dựng lưới ----------
function buildShirt() {
  const verts = [] // { part, m: [x,y,z] (mô hình), ...thông tin tay áo }
  const index = []

  // Thân: các hàng từ mép cổ bo xuống gấu
  const rows = []
  rows.push({ kind: 'collar', lift: 0.055, k: 0.9 })
  rows.push({ kind: 'collar', lift: 0.04, k: 0.93 })
  rows.push({ kind: 'collar', lift: 0.0, k: 1 })
  const ND = 9
  for (let i = 1; i <= ND; i++) rows.push({ kind: 'dome', t: i / ND })
  const NB = 30
  for (let i = 1; i <= NB; i++) rows.push({ kind: 'body', t: i / NB })

  const bodyB = (y) => {
    // bề sâu: mỏng ở vai, đầy ở ngực, hơi thu ở eo rồi rủ ra ở gấu
    const s = -y
    return lerp(0.56, 0.78, smooth(0, 0.35, s)) - 0.05 * smooth(0.45, 0.9, s) + 0.04 * smooth(0.9, 1.24, s)
  }
  const bodyAy = (y) => SHAPE.bodyA + 0.03 * smooth(0.85, 1.24, -y) - 0.03 * smooth(0.05, 0.3, -y)

  const torsoStart = verts.length
  rows.forEach((row) => {
    for (let j = 0; j < COLS; j++) {
      const th = (j / COLS) * Math.PI * 2 // 0: sườn trái người mặc, π/2: giữa ngực
      const c = Math.cos(th)
      const s = Math.sin(th)
      const neckY = lerp(SHAPE.neckBack, SHAPE.neckFront, smooth(-0.2, 0.9, s))
      // vai kết thúc (gặp sườn áo) thấp hơn cổ ít nhất 0.1T: phía trước là ngực dốc xuống từ cổ áo
      const endY = Math.min(SHAPE.shoulderY, neckY - 0.1)
      let x, y, z, part
      if (row.kind === 'collar') {
        // cổ bo đứng quanh cổ, hơi ôm vào
        x = SHAPE.neckA * row.k * c
        z = SHAPE.neckZ + SHAPE.neckB * row.k * s
        y = neckY + row.lift
        part = 'collar'
      } else if (row.kind === 'dome') {
        // vai: từ cổ toả ra, bo tròn xuống mỏm vai rơi
        const a = (row.t * Math.PI) / 2
        const A = lerp(SHAPE.neckA, bodyAy(endY), Math.sin(a))
        const B = lerp(SHAPE.neckB, bodyB(endY), Math.sin(a))
        const n = lerp(2, 2.6, row.t)
        x = A * sp(c, n)
        z = SHAPE.neckZ * (1 - Math.sin(a)) + B * sp(s, n)
        y = neckY - (neckY - endY) * (1 - Math.cos(a))
        part = 'body'
      } else {
        y = lerp(endY, SHAPE.hemY, row.t)
        x = bodyAy(y) * sp(c, 2.6)
        z = bodyB(y) * sp(s, 2.6)
        // gấu hơi gợn
        if (row.t === 1) y += 0.012 * Math.sin(th * 5 + 0.7)
        part = 'body'
      }
      verts.push({ part, m: [x, y, z], th })
    }
  })
  const R = rows.length
  for (let r = 0; r < R - 1; r++)
    for (let j = 0; j < COLS; j++) {
      const a = torsoStart + r * COLS + j
      const b = torsoStart + r * COLS + ((j + 1) % COLS)
      const c2 = a + COLS
      const d = b + COLS
      index.push(a, c2, b, b, c2, d)
    }

  // Tay áo: ống từ khớp xoay (trong thân) ra cổ tay áo
  for (const side of [1, -1]) {
    const start = verts.length
    for (let k = 0; k < SLEEVE_RINGS; k++) {
      const t = k / (SLEEVE_RINGS - 1)
      const d = lerp(SLEEVE.d0, SLEEVE.d1, t)
      // phần nằm trong thân thu nhỏ lại để không lộ lên trên vai
      const r = lerp(SLEEVE.r0, SLEEVE.r1, smooth(0, 1, t)) * (d < 0 ? 1 + d * 0.8 : 1)
      for (let j = 0; j < SLEEVE_SEG; j++) {
        const ph = (j / SLEEVE_SEG) * Math.PI * 2 * side
        verts.push({ part: 'sleeve', side, d, r, cph: Math.cos(ph), sph: Math.sin(ph), t })
      }
    }
    for (let k = 0; k < SLEEVE_RINGS - 1; k++)
      for (let j = 0; j < SLEEVE_SEG; j++) {
        const a = start + k * SLEEVE_SEG + j
        const b = start + k * SLEEVE_SEG + ((j + 1) % SLEEVE_SEG)
        index.push(a, a + SLEEVE_SEG, b, b, a + SLEEVE_SEG, b + SLEEVE_SEG)
      }
  }
  return { verts, index, torsoRows: R }
}

// Khung toạ độ tay áo: trục a (hướng bắp tay), hai trục vuông góc p1, p2 dựng từ hướng trước ngực f
function sleeveAxes(a, f, out1, out2) {
  out1.crossVectors(a, f)
  if (out1.lengthSq() < 1e-6) out1.set(0, 1, 0).cross(a)
  out1.normalize()
  out2.crossVectors(a, out1).normalize()
}

// Hướng tay áo lúc nghỉ trong hệ mô hình (đơn vị mét để góc đúng), rồi đổi ra toạ độ mô hình (S, T)
function restSleeveModel(v) {
  const side = v.side
  const ang = SLEEVE.restAngle
  const dir = new Vector3(side * Math.sin(ang), -Math.cos(ang), 0)
  const p1 = new Vector3()
  const p2 = new Vector3()
  sleeveAxes(dir, new Vector3(0, 0, 1), p1, p2)
  const pv = new Vector3(side * SLEEVE.pivot[0] * S_M, SLEEVE.pivot[1] * T_M, 0)
  const pos = pv
    .clone()
    .addScaledVector(dir, v.d * S_M)
    .addScaledVector(p1, v.r * S_M * v.cph)
    .addScaledVector(p2, v.r * S_M * v.sph)
    .addScaledVector(dropDir(dir, new Vector3(0, -1, 0), new Vector3()), (v.r - SLEEVE.armR) * S_M)
  return [pos.x / S_M, pos.y / T_M, pos.z / S_M]
}

// Lật thứ tự đỉnh tam giác cho mặt trước hướng ra ngoài (ánh sáng, mặt trong áo tối hơn).
// Mỗi phần (thân, hai tay áo) là một lưới đều nên cùng chiều: bỏ phiếu theo hướng "ra ngoài"
// (từ trục thân hoặc trục tay áo tới tâm tam giác) rồi lật cả phần nếu cần.
function orientFaces(verts, index, rest) {
  const p = (i) => new Vector3(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2])
  const ang = SLEEVE.restAngle
  const votes = {}
  const partOf = (v) => (v.part === 'sleeve' ? `sleeve${v.side}` : 'torso')
  for (let f = 0; f < index.length; f += 3) {
    const [a, b, c] = [index[f], index[f + 1], index[f + 2]].map(p)
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a))
    const mid = a.clone().add(b).add(c).divideScalar(3)
    const v = verts[index[f]]
    let out
    if (v.part === 'sleeve') {
      const dir = new Vector3(v.side * Math.sin(ang), -Math.cos(ang), 0)
      const pv = new Vector3(v.side * SLEEVE.pivot[0] * S_M, SLEEVE.pivot[1] * T_M, 0)
      const along = mid.clone().sub(pv).dot(dir)
      out = mid.clone().sub(pv).addScaledVector(dir, -along)
    } else out = new Vector3(mid.x, 0, mid.z)
    const key = partOf(v)
    votes[key] = (votes[key] ?? 0) + Math.sign(n.dot(out))
  }
  for (let f = 0; f < index.length; f += 3) {
    if (votes[partOf(verts[index[f]])] >= 0) continue
    const t = index[f + 1]
    index[f + 1] = index[f + 2]
    index[f + 2] = t
  }
}

// Normal map nếp vải, vẽ trên toạ độ ảnh áo phẳng
function wrinkleNormalMap(size = 512) {
  const H = new Float32Array(size * size)
  const folds = [
    // nếp chéo từ nách xuống ngực
    [0.27, 0.33, 0.41, 0.48, 0.012, 1],
    [0.27, 0.39, 0.38, 0.56, 0.014, 0.8],
    [0.28, 0.29, 0.36, 0.35, 0.01, 0.55],
    // nếp rủ dọc thân dưới
    [0.31, 0.5, 0.3, 0.94, 0.02, 0.85],
    [0.42, 0.62, 0.43, 0.94, 0.017, 0.55],
    [0.36, 0.72, 0.35, 0.94, 0.014, 0.5],
    // gợn ngang gần gấu
    [0.26, 0.86, 0.5, 0.875, 0.012, 0.3],
    // nếp tay áo
    [0.22, 0.3, 0.12, 0.41, 0.012, 0.6],
    [0.24, 0.37, 0.15, 0.46, 0.012, 0.5],
    // nếp quanh cổ
    [0.4, 0.2, 0.44, 0.27, 0.008, 0.35],
  ]
  const all = []
  for (const f of folds) {
    all.push(f)
    // bên kia hơi lệch cho tự nhiên
    all.push([1 - f[0] + 0.01, f[1] + 0.012, 1 - f[2] - 0.01, f[3] + 0.01, f[4], f[5] * 0.9])
  }
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  for (let y = 0; y < size; y++) {
    const v = y / size
    for (let x = 0; x < size; x++) {
      const u = x / size
      let h = 0
      for (const [ax, ay, bx, by, w, amp] of all) {
        const dx = bx - ax
        const dy = by - ay
        const t = ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)
        if (t < 0 || t > 1) continue
        const px = ax + dx * t - u
        const py = ay + dy * t - v
        const q = (px * px + py * py) / (w * w)
        if (q < 9) h += amp * Math.sin(Math.PI * t) * Math.exp(-q)
      }
      // thớ vải thun li ti
      H[y * size + x] = h + rnd() * 0.012
    }
  }
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const img = g.createImageData(size, size)
  const K = 2.2
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const at = (xx, yy) =>
        H[Math.min(size - 1, Math.max(0, yy)) * size + Math.min(size - 1, Math.max(0, xx))]
      const gx = (at(x + 1, y) - at(x - 1, y)) * K
      const gy = (at(x, y + 1) - at(x, y - 1)) * K
      const len = Math.hypot(gx, gy, 1)
      const o = (y * size + x) * 4
      img.data[o] = ((-gx / len) * 0.5 + 0.5) * 255
      img.data[o + 1] = ((gy / len) * 0.5 + 0.5) * 255
      img.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255
      img.data[o + 3] = 255
    }
  g.putImageData(img, 0, 0)
  const tex = new CanvasTexture(c)
  tex.colorSpace = NoColorSpace
  return tex
}

export function createShirt3D() {
  const canvas = document.createElement('canvas')
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(1)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = SRGBColorSpace

  const scene = new Scene()
  const camera = new OrthographicCamera(0, 1, 0, -1, -6000, 6000)
  camera.position.set(0, 0, 0)

  const hemi = new HemisphereLight(0xffffff, 0x8d8a85, 1.5)
  const key = new DirectionalLight(0xffffff, 1.9)
  key.position.set(-0.45, 0.8, 1)
  const fill = new DirectionalLight(0xffffff, 0.5)
  fill.position.set(0.7, -0.1, 0.8)
  scene.add(hemi, key, fill)

  // ---- Áo ----
  const { verts, index } = buildShirt()
  const N = verts.length
  const geom = new BufferGeometry()
  const pos = new Float32Array(N * 3)
  geom.setAttribute('position', new BufferAttribute(pos, 3))

  // dáng nghỉ (mét) để tính normal gốc → vùng in mặt trước, nếp vải, bóng đổ sẵn ở nách
  const rest = new Float32Array(N * 3)
  verts.forEach((v, i) => {
    if (v.part === 'sleeve') v.m = restSleeveModel(v)
    rest[i * 3] = v.m[0] * S_M
    rest[i * 3 + 1] = v.m[1] * T_M
    rest[i * 3 + 2] = v.m[2] * S_M
  })
  orientFaces(verts, index, rest)
  geom.setIndex(index)
  const restGeom = new BufferGeometry()
  restGeom.setAttribute('position', new BufferAttribute(rest, 3))
  restGeom.setIndex(index)
  restGeom.computeVertexNormals()
  const rn = restGeom.getAttribute('normal')

  const uvD = new Float32Array(N * 2)
  const front = new Float32Array(N)
  const fold = new Float32Array(N)
  const ao = new Float32Array(N * 3)
  verts.forEach((v, i) => {
    const [x, y] = v.m
    uvD[i * 2] = photoU(x)
    uvD[i * 2 + 1] = 1 - photoV(y)
    const nz = rn.getZ(i)
    front[i] = v.part === 'collar' ? 0 : smooth(0.12, 0.45, nz)
    fold[i] = v.part === 'collar' ? 0 : smooth(0.15, 0.6, Math.abs(nz))
    // tối nhẹ ở nách, dưới tay áo và trong cổ
    let o = 1
    if (v.part === 'body') {
      const ax = smooth(0.75, 1.15, Math.abs(x)) * smooth(0.05, -0.12, y) * smooth(-0.62, -0.3, y)
      o -= 0.22 * ax
    } else if (v.part === 'sleeve') {
      o -= 0.2 * (1 - smooth(-0.1, 0.5, v.d)) * smooth(-0.2, 0.6, -v.sph * v.side)
      o -= 0.06 * smooth(0.85, 1, v.t)
    } else o = 0.92
    ao[i * 3] = ao[i * 3 + 1] = ao[i * 3 + 2] = o
  })
  restGeom.dispose()
  geom.setAttribute('aUvD', new BufferAttribute(uvD, 2))
  geom.setAttribute('uv', new BufferAttribute(uvD, 2))
  geom.setAttribute('aFront', new BufferAttribute(front, 1))
  geom.setAttribute('aFold', new BufferAttribute(fold, 1))
  geom.setAttribute('color', new BufferAttribute(ao, 3))

  const designCanvas = document.createElement('canvas')
  designCanvas.width = designCanvas.height = 1024
  const designTex = new CanvasTexture(designCanvas)
  designTex.colorSpace = SRGBColorSpace
  designTex.anisotropy = 4
  const normalMap = wrinkleNormalMap()

  const mat = new MeshStandardMaterial({
    color: new Color('#f7f4ee'),
    roughness: 0.93,
    metalness: 0,
    normalMap,
    normalScale: new Vector2(0.7, 0.7),
    vertexColors: true,
    side: DoubleSide,
  })
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDesign = { value: designTex }
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec2 aUvD;\nattribute float aFront;\nattribute float aFold;\nvarying vec2 vUvD;\nvarying float vFront;\nvarying float vFold;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvUvD = aUvD;\nvFront = aFront;\nvFold = aFold;'
      )
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D uDesign;\nvarying vec2 vUvD;\nvarying float vFront;\nvarying float vFold;'
      )
      .replace(
        '#include <color_fragment>',
        // bản phối in lên mặt ngoài phía trước; mặt trong áo tối hơn
        `vec4 dz = texture2D(uDesign, vUvD);
        if (gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, dz.rgb, dz.a * vFront);
        #include <color_fragment>
        if (!gl_FrontFacing) diffuseColor.rgb *= 0.55;`
      )
      .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * vFold;')
  }
  const shirt = new Mesh(geom, mat)
  shirt.frustumCulled = false
  shirt.renderOrder = 1
  scene.add(shirt)

  // ---- Khối che (chỉ ghi độ sâu): cổ, cẳng tay, bàn tay ----
  const occMat = new MeshBasicMaterial({ colorWrite: false })
  const cylGeo = new CylinderGeometry(1, 1, 1, 14, 1, true)
  const sphGeo = new SphereGeometry(1, 14, 10)
  const occluders = new Group()
  occluders.renderOrder = 0
  scene.add(occluders)
  const capsule = () => {
    const g = new Group()
    const cyl = new Mesh(cylGeo, occMat)
    const a = new Mesh(sphGeo, occMat)
    const b = new Mesh(sphGeo, occMat)
    for (const m of [cyl, a, b]) {
      m.renderOrder = 0
      m.frustumCulled = false
      g.add(m)
    }
    occluders.add(g)
    const up = new Vector3(0, 1, 0)
    const dir = new Vector3()
    return (p, q, r) => {
      if (!p || !q) {
        g.visible = false
        return
      }
      g.visible = true
      dir.subVectors(q, p)
      const len = dir.length() || 1e-3
      cyl.position.addVectors(p, q).multiplyScalar(0.5)
      cyl.quaternion.setFromUnitVectors(up, dir.divideScalar(len))
      cyl.scale.set(r, len, r)
      a.position.copy(p)
      b.position.copy(q)
      a.scale.setScalar(r)
      b.scale.setScalar(r)
    }
  }
  const occNeck = capsule()
  const occArm = [capsule(), capsule()]
  const occHand = [capsule(), capsule()]

  // ---- Cập nhật theo dáng người ----
  const P = Array.from({ length: 33 }, () => new Vector3())
  const vis = new Float32Array(33)
  const sMid = new Vector3()
  const hMid = new Vector3()
  const Rv = new Vector3()
  const Rh = new Vector3()
  const U = new Vector3()
  const Rrow = new Vector3()
  const Frow = new Vector3()
  const F0 = new Vector3()
  const tmp = new Vector3()
  const arm = [new Vector3(), new Vector3()]
  const armP1 = [new Vector3(), new Vector3()]
  const armP2 = [new Vector3(), new Vector3()]
  const pivot = [new Vector3(), new Vector3()]
  const restDir = new Vector3()
  const restA = [new Vector3(), new Vector3()]
  const restP1 = [new Vector3(), new Vector3()]
  const restP2 = [new Vector3(), new Vector3()]
  const gRest = [new Vector3(), new Vector3()]
  const gArm = [new Vector3(), new Vector3()]
  const DOWN = new Vector3(0, -1, 0)
  const vA = new Vector3()
  const vB = new Vector3()

  // điểm mô hình (x theo S, y theo T, z theo S) → khung hình
  let L = 1
  const frameAt = (y) => {
    const s = Math.min(1, Math.max(0, -y)) * 0.75
    Rrow.copy(Rv).normalize().lerp(tmp.copy(Rh).normalize(), s).normalize().multiplyScalar(L)
    Frow.crossVectors(Rrow, U).normalize().multiplyScalar(L)
  }
  const mapTorso = (x, y, z, out) => {
    frameAt(y)
    return out.copy(sMid).addScaledVector(Rrow, x).addScaledVector(U, y).addScaledVector(Frow, z)
  }

  let W = 1
  let H = 1
  function setSize(w, h) {
    if (w === W && h === H) return
    W = w
    H = h
    renderer.setSize(w, h, false)
    camera.right = w
    camera.bottom = -h
    camera.updateProjectionMatrix()
  }

  // points: 33 điểm { x, y (pixel, y xuống), z (pixel, dương = gần camera), vis }, đã lật gương và đổi trái/phải
  // nếu cần, để điểm 11 (vai trái người mặc) nằm bên phải khung hình khi đứng quay mặt vào camera.
  function update(points) {
    for (let i = 0; i < 33; i++) {
      const p = points[i]
      P[i].set(p.x, -p.y, p.z)
      vis[i] = p.vis ?? 1
    }
    sMid.addVectors(P[11], P[12]).multiplyScalar(0.5)
    hMid.addVectors(P[23], P[24]).multiplyScalar(0.5)
    Rv.subVectors(P[11], P[12]).multiplyScalar(0.5)
    Rh.subVectors(P[23], P[24]).multiplyScalar(0.5)
    U.subVectors(sMid, hMid)
    L = Rv.length()
    if (L < 2 || U.length() < 2) return false
    frameAt(0)
    F0.copy(Frow).normalize()

    // tay áo: hướng bắp tay từ vai tới khuỷu; khuỷu khuất thì để tay áo ở dáng nghỉ
    const ang = SLEEVE.restAngle
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1
      const sh = k === 0 ? 11 : 12
      const el = k === 0 ? 13 : 14
      mapTorso(side * SLEEVE.pivot[0], SLEEVE.pivot[1], 0, pivot[k])
      // hướng nghỉ đổi sang khung hình (theo đơn vị thật: S ngang, T dọc)
      frameAt(0)
      restDir
        .copy(Rrow)
        .multiplyScalar((side * Math.sin(ang)) / S_M)
        .addScaledVector(U, -Math.cos(ang) / T_M)
        .normalize()
      if (vis[el] > 0.3 && vis[sh] > 0.3) {
        arm[k].subVectors(P[el], P[sh])
        if (arm[k].lengthSq() < 1) arm[k].copy(restDir)
        arm[k].normalize()
      } else arm[k].copy(restDir)
      sleeveAxes(arm[k], F0, armP1[k], armP2[k])
    }
    // trục tay áo lúc nghỉ, gắn theo thân
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1
      frameAt(0)
      restA[k]
        .copy(Rrow)
        .multiplyScalar((side * Math.sin(ang)) / S_M)
        .addScaledVector(U, -Math.cos(ang) / T_M)
        .normalize()
      sleeveAxes(restA[k], F0, restP1[k], restP2[k])
      // vải rủ: dáng nghỉ theo chiều thân, theo bắp tay thì theo chiều dọc khung hình
      dropDir(restA[k], tmp.copy(U).normalize().negate(), gRest[k])
      dropDir(arm[k], DOWN, gArm[k])
    }

    const unit = L / S_M // pixel / mét (theo bề ngang vai)
    for (let i = 0; i < N; i++) {
      const v = verts[i]
      if (v.part !== 'sleeve') {
        mapTorso(v.m[0], v.m[1], v.m[2], vA)
      } else {
        const k = v.side === 1 ? 0 : 1
        const w = smooth(0.0, 0.85, v.d)
        // gắn theo thân (dáng nghỉ) và gắn theo bắp tay, trộn dần từ nách ra cổ tay áo
        vA.copy(pivot[k])
          .addScaledVector(restA[k], v.d * S_M * unit)
          .addScaledVector(restP1[k], v.r * S_M * unit * v.cph)
          .addScaledVector(restP2[k], v.r * S_M * unit * v.sph)
          .addScaledVector(gRest[k], (v.r - SLEEVE.armR) * S_M * unit)
        vB.copy(pivot[k])
          .addScaledVector(arm[k], v.d * S_M * unit)
          .addScaledVector(armP1[k], v.r * S_M * unit * v.cph)
          .addScaledVector(armP2[k], v.r * S_M * unit * v.sph)
          .addScaledVector(gArm[k], (v.r - SLEEVE.armR) * S_M * unit)
        vA.lerp(vB, w)
      }
      pos[i * 3] = vA.x
      pos[i * 3 + 1] = vA.y
      pos[i * 3 + 2] = vA.z
    }
    geom.getAttribute('position').needsUpdate = true
    geom.computeVertexNormals()

    // khối che: cổ (đẩy ra sau một chút để không che cổ bo phía trước), cẳng tay, bàn tay (nhích lên trước)
    const neckTop = new Vector3().addVectors(P[7], P[8]).multiplyScalar(0.5)
    const neckOk = vis[7] > 0.3 && vis[8] > 0.3
    const nb = mapTorso(0, 0.1, 0.02, new Vector3())
    const nt = neckOk ? neckTop.clone() : mapTorso(0, 0.5, 0.02, new Vector3())
    nt.z = nb.z
    occNeck(nb, nt, 0.33 * L)
    const fwd = F0.clone().multiplyScalar(0.15 * L)
    for (let k = 0; k < 2; k++) {
      const el = k === 0 ? 13 : 14
      const wr = k === 0 ? 15 : 16
      const pk = k === 0 ? 17 : 18
      const ix = k === 0 ? 19 : 20
      const armOk = vis[el] > 0.5 && vis[wr] > 0.5
      occArm[k](armOk && P[el].clone().add(fwd), armOk && P[wr].clone().add(fwd), 0.2 * L)
      const handOk = vis[wr] > 0.5 && vis[pk] > 0.3 && vis[ix] > 0.3
      const tip = handOk && P[pk].clone().add(P[ix]).multiplyScalar(0.5)
      if (tip) tip.sub(P[wr]).multiplyScalar(1.25).add(P[wr]).add(fwd)
      occHand[k](handOk && P[wr].clone().add(fwd), tip, 0.24 * L)
    }
    shirt.visible = true
    return true
  }

  return {
    canvas,
    setSize,
    update,
    hide() {
      shirt.visible = false
    },
    // ánh sáng theo độ sáng khung hình camera (≈0.72..1.08)
    setLight(l) {
      hemi.intensity = 1.5 * l
      key.intensity = 1.9 * l
      fill.intensity = 0.5 * l
    },
    setColor(hex) {
      mat.color.set(hex)
    },
    // ảnh bản phối (nền trong suốt) theo khung ảnh áo phẳng
    setDesign(image) {
      if (!image) return
      const g = designCanvas.getContext('2d')
      g.clearRect(0, 0, 1024, 1024)
      g.drawImage(image, 0, 0, 1024, 1024)
      designTex.needsUpdate = true
    },
    render() {
      renderer.render(scene, camera)
    },
    dispose() {
      geom.dispose()
      mat.dispose()
      occMat.dispose()
      cylGeo.dispose()
      sphGeo.dispose()
      designTex.dispose()
      normalMap.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
