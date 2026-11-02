import { useEffect, useState } from 'react'
import { useReducedMotion } from './useReducedMotion.js'

// Cụm chữ đổi luân phiên: chữ cũ mờ dần bay lên, chữ mới trồi lên từ dưới. Trình đọc màn hình đọc cả danh sách
// một lần (không đọc lại mỗi lần đổi). Giảm chuyển động thì đứng yên ở chữ đầu tiên.
export default function RotatingWords({ words, interval = 2600 }) {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)

  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % words.length)
    }, interval)
    return () => clearInterval(t)
  }, [reduced, words.length, interval])

  const prev = (i - 1 + words.length) % words.length
  return (
    <span className="rotate-words">
      <span className="sr-only">{words.join(', ')}</span>
      {words.map((w, k) => (
        <span key={w} aria-hidden="true" className={k === i ? 'on' : k === prev ? 'out' : undefined}>
          {w}
        </span>
      ))}
    </span>
  )
}
