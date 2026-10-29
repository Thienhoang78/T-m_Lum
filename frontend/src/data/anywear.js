import { useEffect, useState } from 'react'
import { uploadTryOnImage } from '../api.js'

// Live mặc thử áo bằng Anywear (Decart): widget nhúng ngoài, AI của Decart dựng lại hình khách đang mặc đúng chiếc áo
// theo thời gian thực. Hình camera của khách được gửi lên máy chủ Decart (khác áo 3D tự làm, chỉ xử lý trên máy).
// Trang chỉ làm: nạp widget, mở widget ngay trong cú bấm của khách, lưu tạm ảnh áo qua /api/tryon để có link công khai,
// rồi gửi link đó vào iframe của widget bằng postMessage, đúng giao thức nút "Try-On" của chính widget:
//   gửi  DECART_IMAGE_BTN_CLICK { url, camera, imgNaturalW, imgNaturalH }
//   nhận DECART_IMAGE_BTN_ACK { action }: sent = áo đã vào phiên thử, reload = widget giữ áo cho phiên sau,
//        ignored = khách chưa bật camera (gửi lại), blocked = widget từ chối.
// Giao thức này không có tài liệu chính thức: Decart đổi widget thì có thể phải sửa ở đây.
// VITE_ANYWEAR_DOMAIN: tên miền đã đăng ký với Anywear (trống = tên miền đang chạy); "off" = tắt, nút Live dùng áo 3D.
const SCRIPT = 'https://anywear.decart.ai/widget/latest/anywear.js'
const ORIGIN = new URL(SCRIPT).origin
const ROOT_ID = '__decart-tryon-widget'
const SETTING = (import.meta.env.VITE_ANYWEAR_DOMAIN ?? '').trim()
const anywearEnabled = SETTING !== 'off'

const IMAGE_SIZE = 1000 // cạnh ảnh áo gửi widget (px)
const LOAD_MS = 15000
const DELIVER_MS = 120000 // chờ khách cho phép camera
const CLOSED_MS = 1500 // iframe biến mất lâu hơn mức này = khách đã đóng widget (lúc cho phép camera iframe có thể bị thay)
const NO_DESIGN = 'Hãy thêm hình hoặc chữ lên mặt trước áo trước khi thử trực tiếp.'
const OPEN_FAILED = 'Chưa mở được phòng thử trực tiếp, bạn thử lại nhé.'

let script = null
let loading = null
let ready = null // window.DecartWidget sau khi đã init

// Nạp widget một lần. anywear.js nạp tiếp vài file; widget-core.js tạo window.DecartWidget rồi mới init
// (init tạo khung #__decart-tryon-widget), nên chờ thấy khung hoặc thêm nửa giây.
export function loadAnywear() {
  if (ready) return Promise.resolve(ready)
  if (!anywearEnabled) return Promise.reject(new Error('Anywear đang tắt'))
  loading ??= new Promise((resolve, reject) => {
    let done = false
    const fail = (message) => {
      if (done) return
      done = true
      loading = null
      reject(new Error(message))
    }
    if (!script) {
      script = document.createElement('script')
      script.src = `${SCRIPT}?domain=${encodeURIComponent(SETTING || location.hostname)}`
      script.async = true
      script.onerror = () => {
        script.remove()
        script = null
        fail('Không tải được widget Anywear')
      }
      document.body.appendChild(script)
    }
    const started = Date.now()
    let seenAt = 0
    const check = () => {
      if (done) return
      const widget = window.DecartWidget
      if (widget) {
        seenAt ||= Date.now()
        if (document.getElementById(ROOT_ID) || Date.now() - seenAt > 500) {
          done = true
          ready = widget
          return resolve(widget)
        }
      } else if (Date.now() - started > LOAD_MS) return fail('Widget Anywear chưa sẵn sàng')
      setTimeout(check, 100)
    }
    check()
  })
  return loading
}

// Gửi link ảnh áo vào iframe của widget, gửi lại tới khi widget báo đã nhận
function deliver(url) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    let timer = 0
    let seenFrame = false
    let missingSince = 0
    const finish = (err) => {
      clearTimeout(timer)
      window.removeEventListener('message', onAck)
      if (err) reject(err)
      else resolve()
    }
    function send() {
      const frame = document.querySelector(`#${ROOT_ID} iframe`)
      if (frame) {
        seenFrame = true
        missingSince = 0
      } else if (seenFrame) {
        missingSince ||= Date.now()
        if (Date.now() - missingSince > CLOSED_MS) return finish() // khách đã đóng widget
      }
      if (Date.now() - started > DELIVER_MS) return finish(new Error('Widget không nhận ảnh áo'))
      // iframe chưa tải xong trang của widget thì tin nhắn bị bỏ qua (khác origin), lần gửi sau sẽ tới
      frame?.contentWindow?.postMessage(
        {
          type: 'DECART_IMAGE_BTN_CLICK',
          url,
          camera: 'user',
          imgNaturalW: IMAGE_SIZE,
          imgNaturalH: IMAGE_SIZE,
        },
        ORIGIN
      )
      timer = setTimeout(send, frame ? 1500 : 200)
    }
    function onAck(e) {
      if (e.origin !== ORIGIN || e.data?.type !== 'DECART_IMAGE_BTN_ACK') return
      const { action } = e.data
      if (action === 'sent' || action === 'reload') return finish()
      if (action === 'blocked') return finish(new Error('Widget từ chối ảnh áo'))
      // ignored: widget đang chờ khách bật camera, gửi lại sau
      clearTimeout(timer)
      timer = setTimeout(send, 700)
    }
    window.addEventListener('message', onAck)
    send()
  })
}

// Đặt khung widget vào host. Mở từ trình phối thì host là hộp thoại của trình phối: hộp thoại modal che và khoá
// mọi thứ nằm ngoài nó, nên widget phải nằm bên trong. Chuyển iframe đi chỗ khác thì iframe tải lại (widget tự nối lại).
function placeWidget(host) {
  const root = document.getElementById(ROOT_ID)
  if (root && root.parentElement !== host) host.appendChild(root)
}

// Trả widget về body trước khi host bị gỡ khỏi trang (đóng trình phối). Widget không có hàm đóng:
// để nó bị gỡ theo thì widget kẹt ở trạng thái đang mở, không mở lại được tới khi tải lại trang.
export function releaseAnywear(host) {
  const root = document.getElementById(ROOT_ID)
  if (root && host?.contains(root)) document.body.appendChild(root)
}

// Nút "Live mặc thử áo": dùng Anywear nếu nạp được widget, không thì mở áo 3D tự làm (onFallback).
// enabled: món đang xem có live (áo). hasDesign: mặt trước đã có hình / chữ. makeImage(): Blob ảnh mặt trước áo.
// start(host): host = phần tử chứa widget (mặc định body; trình phối truyền hộp thoại của nó).
export function useAnywearTryOn({ enabled, hasDesign, makeImage, onFallback }) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  // Nạp sẵn để cú bấm mở được widget ngay: trình duyệt điện thoại chỉ cho xin camera trong cú bấm của khách
  useEffect(() => {
    if (enabled) loadAnywear().catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(t)
  }, [notice])

  async function start(host = document.body) {
    if (busy) return
    setNotice(null)
    const widget = ready ?? (await loadAnywear().catch(() => null))
    if (!widget) return onFallback()
    if (!hasDesign) return setNotice(NO_DESIGN)
    setBusy(true)
    // CSS ẩn khung widget khi chưa có iframe (nút nổi mặc định của widget); lúc đang mở thì cho hiện
    const html = document.documentElement
    html.classList.add('anywear-opening')
    try {
      placeWidget(host) // khung có sẵn từ lúc widget init
      widget.open({ mobileCamera: 'user' })
      // chưa có khung thì open() tự tạo trong body; iframe được tạo sau vài bước chờ (await) nên chuyển lúc này vẫn kịp
      placeWidget(host)
      const blob = await makeImage()
      if (!blob) throw new Error('Không xuất được ảnh áo')
      await deliver(await uploadTryOnImage(blob))
    } catch {
      setNotice(OPEN_FAILED)
    } finally {
      html.classList.remove('anywear-opening')
      setBusy(false)
    }
  }

  return { start, busy, notice }
}
