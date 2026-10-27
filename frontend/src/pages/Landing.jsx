import { useEffect, useRef } from 'react'
import KitHero from '../components/KitHero.jsx'
import KitBoard from '../components/KitBoard.jsx'
import Marquee from '../components/Marquee.jsx'
import UploadFeature from '../components/UploadFeature.jsx'
import Steps from '../components/Steps.jsx'
import { AboutSection } from '../components/About.jsx'

// Trang chủ theo bảng giá của studio, có chuyển động: cảnh áo + túi được ép sticker → bảng giá bộ kit
// → ruy băng khẩu hiệu → tự tạo hình (Combo 1) → cách làm → về Tùm Lum Studio. Phần tử [data-reveal] hiện dần khi cuộn tới.
export default function Landing() {
  const rootRef = useRef(null)
  useEffect(() => {
    const root = rootRef.current
    const els = root.querySelectorAll('[data-reveal]')
    if (!('IntersectionObserver' in window)) return
    root.classList.add('js-reveal')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="landing" ref={rootRef}>
      <KitHero />
      <KitBoard />
      <Marquee />
      <UploadFeature />
      <Steps />
      <AboutSection />
    </div>
  )
}
