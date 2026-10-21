import KitHero from '../components/KitHero.jsx'
import KitBoard from '../components/KitBoard.jsx'
import Marquee from '../components/Marquee.jsx'
import UploadFeature from '../components/UploadFeature.jsx'
import Steps from '../components/Steps.jsx'

// Trang chủ theo bảng giá của studio: tên + khẩu hiệu → bảng giá bộ kit → tự tạo hình (Combo 1) → cách làm
export default function Landing() {
  return (
    <>
      <KitHero />
      <KitBoard />
      <Marquee />
      <UploadFeature />
      <Steps />
    </>
  )
}
