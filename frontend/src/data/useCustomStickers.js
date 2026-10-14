import { useEffect, useRef, useState } from 'react'
import { uploadSticker } from '../api.js'
import { MAX_CUSTOM_STICKERS, MAX_UPLOAD_BYTES, UPLOAD_TYPES } from './consent.js'

let seq = 1

// Sticker khách tự tải lên: kiểm tra loại / dung lượng ngay trên trình duyệt, tải từng hình lên server
// (POST /api/uploads) và giữ ảnh xem trước. Mỗi hình: { key, name, size, url, status, id, error }
// status: 'uploading' | 'done' | 'error'
export function useCustomStickers() {
  const [items, setItems] = useState([])
  const [notice, setNotice] = useState(null)
  const latest = useRef(items)

  useEffect(() => {
    latest.current = items
  }, [items])
  // Rời trang thì giải phóng ảnh xem trước
  useEffect(() => () => latest.current.forEach((it) => URL.revokeObjectURL(it.url)), [])

  const patch = (key, p) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...p } : it)))

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
    const added = files.map((f) => ({
      key: seq++,
      name: f.name,
      size: f.size,
      url: URL.createObjectURL(f),
      status: 'uploading',
    }))
    setItems((list) => [...list, ...added])
    added.forEach((it, i) =>
      uploadSticker(files[i])
        .then((r) => patch(it.key, { status: 'done', id: r.id }))
        .catch((err) => patch(it.key, { status: 'error', error: err.message }))
    )
  }

  function remove(key) {
    const it = items.find((x) => x.key === key)
    if (it) URL.revokeObjectURL(it.url)
    setItems((list) => list.filter((x) => x.key !== key))
    setNotice(null)
  }

  function reset() {
    items.forEach((it) => URL.revokeObjectURL(it.url))
    setItems([])
    setNotice(null)
  }

  const active = items.filter((it) => it.status !== 'error')
  return {
    items,
    notice,
    add,
    remove,
    reset,
    active, // đang tải hoặc đã tải xong (được tính tiền, cần ký cam kết)
    done: items.filter((it) => it.status === 'done'),
    uploading: items.some((it) => it.status === 'uploading'),
  }
}
