import { useEffect, useRef } from 'react'

// Hiệu ứng dùng chung mọi trang:
// - thanh tiến độ cuộn mảnh trên cùng (xanh → hồng → vàng)
// - <html data-scrolled> khi đã cuộn xuống, để nav đậm hơn
// - thẻ .fx-spot sáng theo chuột: ghi vị trí con trỏ vào --mx / --my (một bộ lắng nghe cho cả trang)
export default function ScrollFx() {
  const barRef = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    let raf = 0
    const update = () => {
      raf = 0
      const max = root.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`
      root.toggleAttribute('data-scrolled', window.scrollY > 8)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const spot = (e) => {
      if (e.pointerType !== 'mouse') return
      const el = e.target.closest?.('.fx-spot')
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    // chiều cao trang đổi khi chuyển trang / tải ảnh: tính lại tiến độ
    const ro = new ResizeObserver(schedule)

    update()
    ro.observe(document.body)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    document.addEventListener('pointermove', spot, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('pointermove', spot)
    }
  }, [])

  return <div className="scroll-progress" ref={barRef} aria-hidden="true" />
}
