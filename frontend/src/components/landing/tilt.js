// Thẻ nghiêng theo chuột và có vệt sáng chạy theo (chỉ với chuột; CSS tắt khi giảm chuyển động)
export const tilt = {
  onPointerMove(e) {
    if (e.pointerType !== 'mouse') return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--tx', ((0.5 - y) * 7).toFixed(2) + 'deg')
    el.style.setProperty('--ty', ((x - 0.5) * 9).toFixed(2) + 'deg')
    el.style.setProperty('--gx', (x * 100).toFixed(1) + '%')
    el.style.setProperty('--gy', (y * 100).toFixed(1) + '%')
    el.classList.add('is-tilting')
  },
  onPointerLeave(e) {
    const el = e.currentTarget
    el.style.setProperty('--tx', '0deg')
    el.style.setProperty('--ty', '0deg')
    el.classList.remove('is-tilting')
  },
}
