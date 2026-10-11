import { useEffect, useRef, useState } from 'react'
import { useCart } from '../cart.jsx'
import { PRODUCTS } from '../data/products.js'

// Nút giỏ hàng trên nav: số món + bảng xem nhanh. Trang giỏ hàng đầy đủ sẽ làm sau.
export default function CartButton() {
  const { items, count, remove } = useCart()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="cart" ref={ref}>
      <button
        type="button"
        className="cart-btn"
        aria-expanded={open}
        aria-label={`Giỏ hàng, ${count} món`}
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M6 8h12l-1 12H7L6 8zm3 0V6a3 3 0 016 0v2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        {count > 0 && <span className="cart-count">{count}</span>}
      </button>
      {open && (
        <div className="cart-panel">
          <p className="eyebrow">Giỏ hàng</p>
          {items.length === 0 ? (
            <p className="cart-empty">Chưa có món nào. Chọn một combo để bắt đầu nhé.</p>
          ) : (
            <ul className="cart-list">
              {items.map((it) => {
                const p = PRODUCTS[it.product]
                return (
                  <li key={it.id}>
                    <div>
                      <strong>
                        {p?.name} · {it.comboName}
                      </strong>
                      <span>
                        {it.total} {p?.unit} · {it.options.printSide}
                      </span>
                    </div>
                    <button type="button" className="link" onClick={() => remove(it.id)}>
                      Bỏ
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {items.length > 0 && <p className="cart-note">Trang thanh toán sẽ có ở bước tiếp theo.</p>}
        </div>
      )}
    </div>
  )
}
