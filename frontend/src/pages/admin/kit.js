import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api.js'
import { vnd } from '../../data/pricing.js'

// Tải dữ liệu trang quản lý. Tải lại thì giữ dữ liệu cũ (làm mờ) cho tới khi có dữ liệu mới, không nháy trang.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true, error: null }))
    adminApi
      .get(path)
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState((s) => ({ data: s.data, error, loading: false })))
    return () => {
      live = false
    }
  }, [path, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  const setData = useCallback((data) => setState((s) => ({ ...s, data })), [])
  return { ...state, reload, setData }
}

// Gửi thay đổi: trả về [chạy, đang gửi, lỗi]
export function useAction(fn) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const run = useCallback(
    async (...args) => {
      setBusy(true)
      setError(null)
      try {
        return await fn(...args)
      } catch (err) {
        setError(err.message)
        return undefined
      } finally {
        setBusy(false)
      }
    },
    [fn]
  )
  return [run, busy, error]
}

const num1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
// Số tiền gọn cho trục biểu đồ / ô số liệu: 500k, 1,2 tr, 3,4 tỷ
export function vndShort(n) {
  const a = Math.abs(n)
  if (a >= 1e9) return `${num1.format(n / 1e9)} tỷ`
  if (a >= 1e6) return `${num1.format(n / 1e6)} tr`
  if (a >= 1e3) return `${num1.format(n / 1e3)}k`
  return String(n)
}
// Ô số liệu: dưới 10 triệu ghi đủ, từ 10 triệu ghi gọn
export const vndTile = (n) => (Math.abs(n) < 1e7 ? vnd(n) : `${vndShort(n)}₫`)

// Bước chia trục "đẹp": 1, 2, 2,5, 5 × 10^n
export function niceTicks(max, count = 4) {
  if (!(max > 0)) return [0, 1]
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
}

export const zaloUrl = (phone) => `https://zalo.me/${phone}`
