import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

// Giỏ hàng lưu ở trình duyệt. Mỗi dòng: combo, món nền, tuỳ chọn in và số lượng theo size × màu.
const KEY = 'tumlum-cart'
const CartContext = createContext(null)

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load)
  const [toast, setToast] = useState(null)
  const timer = useRef()

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      // trình duyệt chặn lưu trữ: giỏ hàng chỉ sống trong phiên này
    }
  }, [items])

  const notify = useCallback((text) => {
    clearTimeout(timer.current)
    setToast({ text, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, it) => n + it.total, 0),
      add(item) {
        setItems((list) => [...list, { ...item, id: `${Date.now()}-${list.length}` }])
        notify('Đã thêm vào giỏ hàng')
      },
      remove(id) {
        setItems((list) => list.filter((it) => it.id !== id))
      },
    }),
    [items, notify]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <p key={toast.id} className="toast">
            {toast.text}
          </p>
        )}
      </div>
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
