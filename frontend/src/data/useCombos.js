import { useEffect, useState } from 'react'
import { fetchCombos } from '../api.js'
import { PLACEHOLDER_COMBOS, withCopy } from './combos.js'

// Gọi API một lần cho cả phiên, các trang dùng chung kết quả.
let request

export function useCombos() {
  const [combos, setCombos] = useState(PLACEHOLDER_COMBOS)
  useEffect(() => {
    let alive = true
    request ??= fetchCombos().then((list) => list.map(withCopy))
    request.then((c) => alive && setCombos(c))
    return () => {
      alive = false
    }
  }, [])
  return combos
}
