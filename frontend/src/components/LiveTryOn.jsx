import { useEffect, useRef, useState } from 'react'
import { LM, bodyAnchors, drawGarment } from '../data/garmentFit.js'

// Live mặc thử áo: mở camera, nhận dạng dáng người bằng MediaPipe Pose (Apache-2.0) ngay trên trình duyệt,
// đứng đủ người trong khung thì áo (kèm bản phối) tự ướm lên người theo vai và hông.
// Hình camera không gửi đi đâu và không được lưu lại.
const MODEL = '/models/pose_landmarker_lite.task'
const WASM = '/mediapipe'
const NEED = [LM.nose, LM.shoulderL, LM.shoulderR, LM.hipL, LM.hipR]
const SMOOTH = 0.45 // hệ số làm mượt điểm mốc (0..1, nhỏ hơn = mượt hơn nhưng trễ hơn)
const HOLD_MS = 500 // đứng đúng khung bao lâu thì hiện áo
const LOST_MS = 800 // mất dấu bao lâu thì ẩn áo

let landmarkerPromise
function loadLandmarker() {
  landmarkerPromise ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const files = await FilesetResolver.forVisionTasks(WASM)
    const make = (delegate) =>
      PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    try {
      return await make('GPU')
    } catch {
      return make('CPU')
    }
  })().catch((err) => {
    landmarkerPromise = undefined
    throw err
  })
  return landmarkerPromise
}

const CAMERA_ERRORS = {
  NotAllowedError:
    'Bạn chưa cho phép dùng camera. Bấm vào biểu tượng ổ khoá / camera trên thanh địa chỉ để cho phép, rồi thử lại.',
  NotFoundError: 'Không tìm thấy camera trên thiết bị này.',
  NotReadableError: 'Camera đang được ứng dụng khác dùng. Tắt ứng dụng đó rồi thử lại.',
  OverconstrainedError: 'Camera không hỗ trợ chế độ này. Thử đổi camera.',
  SecurityError: 'Trình duyệt chỉ cho dùng camera trên trang https.',
}

// Khung hình người hướng dẫn (đầu + vai + thân), vẽ theo chiều cao khung hình
function silhouette(ctx, W, H) {
  const u = H / 100
  const cx = W / 2
  const p = new Path2D()
  p.arc(cx, 22 * u, 9.5 * u, 0, Math.PI * 2)
  p.moveTo(cx - 5 * u, 31 * u)
  p.lineTo(cx - 5 * u, 35 * u)
  p.bezierCurveTo(cx - 9 * u, 37 * u, cx - 22 * u, 37 * u, cx - 25 * u, 44 * u)
  p.bezierCurveTo(cx - 27 * u, 52 * u, cx - 27 * u, 70 * u, cx - 25 * u, 100 * u)
  p.lineTo(cx + 25 * u, 100 * u)
  p.bezierCurveTo(cx + 27 * u, 70 * u, cx + 27 * u, 52 * u, cx + 25 * u, 44 * u)
  p.bezierCurveTo(cx + 22 * u, 37 * u, cx + 9 * u, 37 * u, cx + 5 * u, 35 * u)
  p.lineTo(cx + 5 * u, 31 * u)
  p.closePath()
  return p
}

export default function LiveTryOn({ makeTexture, onClose }) {
  const dialogRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const layerRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const textureRef = useRef(null)
  const state = useRef({
    smooth: {},
    okSince: null,
    lostSince: null,
    fittedAt: null,
    lastTime: -1,
    pose: null,
    light: 1,
    frame: 0,
  })
  const [phase, setPhase] = useState('intro') // intro | starting | live | error
  const [error, setError] = useState(null)
  const [hint, setHint] = useState('Đứng vào khung để bắt đầu')
  const [fitted, setFitted] = useState(false)
  const [facing, setFacing] = useState('user')
  const [canSwitch, setCanSwitch] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const fittedRef = useRef(false)
  const guideRef = useRef(true)
  const hintRef = useRef(hint)
  const makeTextureRef = useRef(makeTexture)

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
    // Ảnh áo kèm bản phối, nền trong suốt
    makeTextureRef
      .current()
      .then((blob) => createImageBitmap(blob))
      .then((bmp) => {
        textureRef.current = bmp
      })
      .catch(() => {
        textureRef.current = null
      })
    return () => stop()
    // chỉ chạy khi mở
  }, [])

  useEffect(() => {
    guideRef.current = showGuide
  }, [showGuide])

  function stop() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function close() {
    stop()
    dialogRef.current?.close()
    onClose()
  }

  async function start(which = facing) {
    stop()
    setPhase('starting')
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'SecurityError' })
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: which, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const v = videoRef.current
      v.srcObject = stream
      await v.play()
      const landmarker = await loadLandmarker()
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
      setCanSwitch(cams.length > 1)
      state.current = {
        ...state.current,
        smooth: {},
        okSince: null,
        lostSince: null,
        fittedAt: null,
        pose: null,
      }
      fittedRef.current = false
      setFitted(false)
      setPhase('live')
      loop(landmarker, which === 'user')
    } catch (err) {
      stop()
      setError(
        CAMERA_ERRORS[err?.name] ??
          (err?.message?.includes('fetch') || err?.message?.includes('wasm')
            ? 'Không tải được bộ nhận dạng dáng người. Kiểm tra mạng rồi thử lại.'
            : 'Không mở được camera. Thử lại hoặc dùng trình duyệt khác.')
      )
      setPhase('error')
    }
  }

  function say(text) {
    if (hintRef.current !== text) {
      hintRef.current = text
      setHint(text)
    }
  }

  function loop(landmarker, mirror) {
    const v = videoRef.current
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    const layer = layerRef.current ?? (layerRef.current = document.createElement('canvas'))
    const lctx = layer.getContext('2d')
    const probe = document.createElement('canvas')
    probe.width = probe.height = 12
    const pctx = probe.getContext('2d', { willReadFrequently: true })

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
      if (v.readyState < 2 || !v.videoWidth) return
      const W = v.videoWidth
      const H = v.videoHeight
      if (c.width !== W || c.height !== H) {
        c.width = layer.width = W
        c.height = layer.height = H
      }
      const st = state.current
      const now = performance.now()
      // nhận dạng mỗi khi camera có khung hình mới
      if (v.currentTime !== st.lastTime) {
        st.lastTime = v.currentTime
        st.pose = landmarker.detectForVideo(v, now).landmarks?.[0] ?? null
      }

      ctx.save()
      if (mirror) {
        ctx.translate(W, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(v, 0, 0, W, H)
      ctx.restore()

      const pose = st.pose
      const raw = (i) => {
        const p = pose[i]
        return { x: (mirror ? 1 - p.x : p.x) * W, y: p.y * H, vis: p.visibility ?? 1 }
      }
      // làm mượt điểm mốc để áo không rung
      const pt = (i) => {
        const r = raw(i)
        const prev = st.smooth[i]
        const s = prev
          ? { x: prev.x + (r.x - prev.x) * SMOOTH, y: prev.y + (r.y - prev.y) * SMOOTH, vis: r.vis }
          : r
        st.smooth[i] = s
        return s
      }

      let ok = false
      let body = null
      if (pose) {
        const pts = Object.fromEntries(NEED.map((i) => [i, pt(i)]))
        const inside = (p) =>
          p.vis > 0.5 && p.x > W * 0.02 && p.x < W * 0.98 && p.y > H * 0.02 && p.y < H * 0.98
        const s1 = pts[LM.shoulderL]
        const s2 = pts[LM.shoulderR]
        const h1 = pts[LM.hipL]
        const h2 = pts[LM.hipR]
        const sw = Math.hypot(s1.x - s2.x, s1.y - s2.y)
        const torso = Math.abs((h1.y + h2.y) / 2 - (s1.y + s2.y) / 2)
        const cx = (s1.x + s2.x) / 2 / W
        if ([s1, s2, h1, h2].every((p) => p.vis > 0.35))
          body = { shoulderA: s1, shoulderB: s2, hipA: h1, hipB: h2 }
        if (!NEED.every((i) => inside(pts[i]))) say('Lùi ra xa một chút để thấy cả đầu, vai và hông')
        else if (torso > H * 0.62 || sw > W * 0.55) say('Lùi ra xa một chút')
        else if (torso < H * 0.18) say('Lại gần hơn')
        else if (Math.abs(cx - 0.5) > 0.2) say('Đứng vào giữa khung')
        else if (sw / torso < 0.45) say('Đứng thẳng, nhìn vào camera')
        else {
          ok = true
          say(fittedRef.current ? 'Đang mặc thử' : 'Giữ yên một chút…')
        }
      } else {
        say('Đứng vào khung để bắt đầu')
      }

      // đứng đúng khung đủ lâu thì hiện áo; mất dấu một lúc thì ẩn
      if (ok) {
        st.okSince ??= now
        st.lostSince = null
        if (!fittedRef.current && now - st.okSince > HOLD_MS) {
          fittedRef.current = true
          st.fittedAt = now
          setFitted(true)
        }
      } else {
        st.okSince = null
        if (fittedRef.current && !body) {
          st.lostSince ??= now
          if (now - st.lostSince > LOST_MS) {
            fittedRef.current = false
            setFitted(false)
          }
        } else st.lostSince = null
      }

      // khung người hướng dẫn: làm tối phần ngoài khung, viền nét đứt
      const guideAlpha = fittedRef.current ? 0 : guideRef.current ? 1 : 0
      if (guideAlpha) {
        const path = silhouette(ctx, W, H)
        ctx.save()
        const outside = new Path2D()
        outside.rect(0, 0, W, H)
        outside.addPath(path)
        ctx.fillStyle = 'rgba(13, 43, 69, 0.38)'
        ctx.fill(outside, 'evenodd')
        ctx.setLineDash([H * 0.018, H * 0.012])
        ctx.lineWidth = Math.max(2, H * 0.005)
        ctx.strokeStyle = ok ? '#7be0ad' : 'rgba(255,255,255,0.9)'
        ctx.stroke(path)
        ctx.restore()
      }

      // áo
      const tex = textureRef.current
      if (fittedRef.current && body && tex) {
        // độ sáng áo theo ánh sáng quanh ngực (đo vài khung hình một lần)
        if (st.frame++ % 10 === 0) {
          const mx = (body.shoulderA.x + body.shoulderB.x) / 2
          const my = (body.shoulderA.y + body.hipA.y) / 2
          const side = Math.abs(body.shoulderA.x - body.shoulderB.x)
          pctx.drawImage(c, mx - side / 2, my - side / 2, side, side, 0, 0, 12, 12)
          const d = pctx.getImageData(0, 0, 12, 12).data
          let sum = 0
          for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
          const lum = sum / (d.length / 4)
          st.light = Math.min(1.08, Math.max(0.72, 0.62 + lum / 420))
        }
        lctx.clearRect(0, 0, W, H)
        drawGarment(lctx, tex, bodyAnchors(body))
        const fade = Math.min(1, (now - st.fittedAt) / 300)
        ctx.save()
        ctx.globalAlpha = fade
        ctx.filter = `brightness(${st.light.toFixed(2)}) drop-shadow(0 ${Math.round(H * 0.008)}px ${Math.round(H * 0.014)}px rgba(0,0,0,0.35))`
        ctx.drawImage(layer, 0, 0)
        ctx.restore()
      }
    }
    tick()
  }

  function snapshot() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tum-lum-mac-thu.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }, 'image/png')
  }

  function switchCamera() {
    const next = facing === 'user' ? 'environment' : 'user'
    setFacing(next)
    start(next)
  }

  return (
    <dialog
      ref={dialogRef}
      className="live"
      aria-label="Live mặc thử áo"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      <header className="live-top">
        <h2 className="live-title">Live mặc thử áo</h2>
        {phase === 'live' && (
          <div className="live-actions">
            <button type="button" aria-pressed={showGuide} onClick={() => setShowGuide(!showGuide)}>
              Khung hướng dẫn
            </button>
            {canSwitch && (
              <button type="button" onClick={switchCamera}>
                Đổi camera
              </button>
            )}
            <button type="button" onClick={snapshot} disabled={!fitted}>
              Chụp ảnh
            </button>
          </div>
        )}
        <button type="button" className="btn btn-dark btn-sm" onClick={close}>
          Đóng
        </button>
      </header>

      <div className="live-stage">
        <video ref={videoRef} playsInline muted className="live-video" />
        <canvas
          ref={canvasRef}
          className="live-canvas"
          hidden={phase !== 'live'}
          aria-label="Hình camera có áo đang mặc thử"
        />

        {phase === 'live' && (
          <p className={`live-hint${fitted ? ' is-fitted' : ''}`} role="status" aria-live="polite">
            {hint}
          </p>
        )}

        {(phase === 'intro' || phase === 'starting') && (
          <div className="live-card">
            <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
              <path
                d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <h3>Mặc thử áo bằng camera</h3>
            <p>
              Đứng cách camera khoảng 1,5–2 m sao cho thấy cả đầu, vai và hông. Khi bạn đứng vừa khung, áo
              cùng bản phối sẽ tự ướm lên người.
            </p>
            <p className="live-privacy">
              Hình camera chỉ xử lý trên máy của bạn, không gửi đi và không lưu lại.
            </p>
            <button
              type="button"
              className="btn btn-brand"
              onClick={() => start()}
              disabled={phase === 'starting'}
            >
              {phase === 'starting' ? 'Đang mở camera…' : 'Bật camera'}
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="live-card" role="alert">
            <h3>Chưa mở được camera</h3>
            <p>{error}</p>
            <button type="button" className="btn btn-brand" onClick={() => start()}>
              Thử lại
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
