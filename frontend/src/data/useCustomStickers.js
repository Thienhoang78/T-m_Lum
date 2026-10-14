import { useEffect, useRef, useState } from 'react'
import { uploadSticker } from '../api.js'
import { MAX_CUSTOM_STICKERS, MAX_UPLOAD_BYTES, UPLOAD_TYPES } from './consent.js'
import { cutOut } from './removeBackground.js'

let seq = 1
export const DEFAULT_TOLERANCE = 42

// Sticker khách tự tải lên: kiểm tra loại / dung lượng, tự tách nền trên trình duyệt, rồi tải lên server
// (POST /api/uploads) đúng bản khách chọn: bản đã tách nền (mặc định) hoặc ảnh gốc.
// Mỗi hình: { key, name, size, file, origUrl, cut, cutReason, useCut, tolerance, url, status, id, error }
//   cut: { blob, url, method: 'flood' | 'ai', reduced } | null
//   status: 'processing' | 'uploading' | 'done' | 'error'; url: ảnh đang dùng (để xem trước / phối thử)
export function useCustomStickers() {
  const store = useRef(new Map())
  const timers = useRef(new Map())
  const [items, setItems] = useState([])
  const [notice, setNotice] = useState(null)

  const sync = () => setItems([...store.current.values()])
  const get = (key) => store.current.get(key)
  const patch = (key, p) => {
    const it = get(key)
    if (!it) return null // hình đã bị bỏ trong lúc xử lý
    const next = { ...it, ...p }
    next.url = next.useCut && next.cut ? next.cut.url : next.origUrl
    store.current.set(key, next)
    sync()
    return next
  }
  const revoke = (it) => {
    URL.revokeObjectURL(it.origUrl)
    if (it.cut) URL.revokeObjectURL(it.cut.url)
  }

  // Rời trang thì giải phóng ảnh xem trước
  useEffect(() => {
    const map = store.current
    const t = timers.current
    return () => {
      map.forEach(revoke)
      t.forEach(clearTimeout)
    }
  }, [])

  async function upload(key) {
    const it = patch(key, { status: 'uploading', error: null })
    if (!it) return
    const file =
      it.useCut && it.cut
        ? new File([it.cut.blob], it.name.replace(/\.\w+$/, '') + '.png', { type: it.cut.blob.type })
        : it.file
    try {
      const r = await uploadSticker(file)
      // Khách đổi bản trong lúc đang tải thì bỏ kết quả cũ (lượt tải mới sẽ cập nhật)
      if (get(key)?.uploadFor === (it.useCut && it.cut ? it.cut.url : it.origUrl))
        patch(key, { status: 'done', id: r.id })
    } catch (err) {
      if (get(key)) patch(key, { status: 'error', error: err.message })
    }
  }

  async function process(key) {
    const it = patch(key, { status: 'processing' })
    if (!it) return
    const r = await cutOut(it.file, { tolerance: it.tolerance })
    const cur = get(key)
    if (!cur) return
    if (cur.cut) URL.revokeObjectURL(cur.cut.url)
    const cut = r.blob
      ? { blob: r.blob, url: URL.createObjectURL(r.blob), method: r.method, reduced: r.reduced }
      : null
    const next = patch(key, { cut, cutReason: r.reason, useCut: !!cut })
    await uploadChosen(next)
  }

  function uploadChosen(it) {
    patch(it.key, { uploadFor: it.useCut && it.cut ? it.cut.url : it.origUrl })
    return upload(it.key)
  }

  function add(fileList) {
    const room = MAX_CUSTOM_STICKERS - items.filter((it) => it.status !== 'error').length
    const msgs = []
    const files = []
    for (const f of fileList) {
      if (!UPLOAD_TYPES.includes(f.type)) msgs.push(`“${f.name}” không phải ảnh PNG, JPG hoặc WebP.`)
      else if (f.size > MAX_UPLOAD_BYTES) msgs.push(`“${f.name}” lớn hơn 4 MB.`)
      else if (files.length >= room) {
        msgs.push(`Mỗi đơn tối đa ${MAX_CUSTOM_STICKERS} hình.`)
        break
      } else files.push(f)
    }
    setNotice(msgs.length ? msgs.join(' ') : null)
    for (const f of files) {
      const key = seq++
      const origUrl = URL.createObjectURL(f)
      store.current.set(key, {
        key,
        name: f.name,
        size: f.size,
        file: f,
        origUrl,
        url: origUrl,
        cut: null,
        cutReason: null,
        useCut: false,
        tolerance: DEFAULT_TOLERANCE,
        status: 'processing',
      })
      process(key)
    }
    sync()
  }

  // Đổi giữa bản đã tách nền và ảnh gốc
  function setUseCut(key, useCut) {
    const it = patch(key, { useCut })
    if (it) uploadChosen(it)
  }

  // Độ nhạy tách nền (chỉ với nền trơn): đợi khách dừng kéo rồi mới tách lại và tải lên
  function setTolerance(key, tolerance) {
    if (!patch(key, { tolerance })) return
    clearTimeout(timers.current.get(key))
    timers.current.set(
      key,
      setTimeout(() => process(key), 450)
    )
  }

  function remove(key) {
    const it = get(key)
    if (it) revoke(it)
    clearTimeout(timers.current.get(key))
    store.current.delete(key)
    sync()
    setNotice(null)
  }

  function reset() {
    store.current.forEach(revoke)
    store.current.clear()
    sync()
    setNotice(null)
  }

  const active = items.filter((it) => it.status !== 'error')
  return {
    items,
    notice,
    add,
    remove,
    reset,
    setUseCut,
    setTolerance,
    active, // đang xử lý / đã tải (được tính tiền, cần ký cam kết)
    done: items.filter((it) => it.status === 'done'),
    uploading: items.some((it) => it.status === 'uploading' || it.status === 'processing'),
  }
}
