import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion.js'

// Hạt lấp lánh trên nền tối đầu trang: chấm tròn và ngôi sao bốn cánh màu thương hiệu, trôi chầm chậm lên trên,
// nhấp nháy, né nhẹ con trỏ chuột. Chỉ vẽ khi đầu trang đang hiện trên màn hình; giảm chuyển động thì đứng yên.
const COLORS = ['#64b5f6', '#ff7ab6', '#ffc93c', '#7be0ad', '#ffffff']

function spark(ctx, x, y, s) {
  ctx.beginPath()
  ctx.moveTo(x, y - s)
  ctx.quadraticCurveTo(x, y, x + s, y)
  ctx.quadraticCurveTo(x, y, x, y + s)
  ctx.quadraticCurveTo(x, y, x - s, y)
  ctx.quadraticCurveTo(x, y, x, y - s)
  ctx.fill()
}

export default function Sparkles() {
  const ref = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    const host = canvas?.closest('.kit-hero')
    const ctx = canvas?.getContext('2d')
    if (!canvas || !host || !ctx) return
    let w = 0
    let h = 0
    let parts = []
    let raf = 0
    let visible = true
    const mouse = { x: -999, y: -999 }

    const make = (y) => ({
      x: Math.random() * w,
      y: y ?? Math.random() * h,
      r: 0.6 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.14,
      vy: -(0.06 + Math.random() * 0.26),
      c: COLORS[(Math.random() * COLORS.length) | 0],
      tw: Math.random() * Math.PI * 2,
      star: Math.random() < 0.2,
      ox: 0,
      oy: 0,
    })

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      parts = Array.from({ length: Math.min(110, Math.round((w * h) / 13000)) }, () => make())
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        if (!reduced) {
          p.x += p.vx
          p.y += p.vy
          if (p.y < -12) Object.assign(p, make(h + 12))
          // né con trỏ: đẩy ra rồi từ từ trôi về chỗ cũ
          const dx = p.x + p.ox - mouse.x
          const dy = p.y + p.oy - mouse.y
          const d2 = dx * dx + dy * dy
          if (d2 < 14000) {
            const f = (1 - d2 / 14000) * 2.4
            const d = Math.sqrt(d2) || 1
            p.ox += (dx / d) * f
            p.oy += (dy / d) * f
          }
          p.ox *= 0.94
          p.oy *= 0.94
        }
        const x = p.x + p.ox
        const y = p.y + p.oy
        ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.0018 + p.tw))
        ctx.fillStyle = p.c
        if (p.star) {
          ctx.shadowColor = p.c
          ctx.shadowBlur = 10
          spark(ctx, x, y, p.r * 3.4)
          ctx.shadowBlur = 0
        } else {
          ctx.beginPath()
          ctx.arc(x, y, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(draw)
      else raf = 0
    }
    const start = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }

    const move = (e) => {
      if (e.pointerType !== 'mouse') return
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    const leave = () => {
      mouse.x = mouse.y = -999
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) start()
    })
    const ro = new ResizeObserver(() => {
      resize()
      start()
    })
    const onVis = () => !document.hidden && start()

    resize()
    start()
    io.observe(canvas)
    ro.observe(canvas)
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', leave)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced])

  return <canvas className="hero-sparkles" ref={ref} aria-hidden="true" />
}
