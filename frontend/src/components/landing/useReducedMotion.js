import { useEffect, useState } from 'react'

// Người dùng bật "giảm chuyển động" trong hệ điều hành: tắt hiệu ứng chạy liên tục
export function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const m = window.matchMedia?.(query)
    if (!m) return
    const on = () => setReduced(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return reduced
}
