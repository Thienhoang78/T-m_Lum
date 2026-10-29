import { Link } from 'react-router-dom'
import Sticker from './Sticker.jsx'

// "Về Tùm Lum Studio": đoạn giới thiệu trên trang chủ và trang /ve-chung-toi.
// Chỉ nói về bộ kit và tinh thần của studio; địa chỉ, giờ mở cửa, mạng xã hội sẽ thêm khi studio cung cấp.
const VALUES = [
  {
    shape: 'smile',
    color: 'var(--sun)',
    title: 'Tự tay làm, vui từ đầu',
    body: 'Mỗi bộ kit là một buổi chơi nho nhỏ: chọn sticker, xếp thử, rồi tự tay ủi lên áo hay túi của mình.',
  },
  {
    shape: 'heart',
    color: 'var(--pink)',
    title: 'Không ai giống ai',
    body: 'Cùng một chiếc áo trắng, mỗi người dán một kiểu. Hình bạn tự vẽ, tự chọn làm nên món đồ của riêng bạn.',
  },
  {
    shape: 'flower',
    color: 'var(--mint)',
    title: 'Dễ bắt đầu',
    body: 'Không cần máy móc hay kinh nghiệm in ấn: sticker in chuyển nhiệt, áo và túi trắng có sẵn trong bộ kit.',
  },
]

export function AboutSection({ full = false }) {
  return (
    <section className={`section about${full ? ' about-full' : ''}`} id="ve-chung-toi">
      <div className="section-head" data-reveal>
        <p className="eyebrow">Về Tùm Lum Studio</p>
        <h2 className="display-sm">
          Good ideas, <em>brighter days</em>.
        </h2>
        <p className="about-lede">
          Tùm Lum Studio làm những bộ kit DIY in chuyển nhiệt cho áo thun và túi tote trắng. Chúng mình tin
          một ý tưởng nhỏ, vài chiếc sticker và một chút tự tay làm là đủ cho một ngày tươi hơn, và một món đồ
          mặc vào thấy vui.
        </p>
      </div>
      <ul className="about-values">
        {VALUES.map((v, i) => (
          <li key={v.title} data-reveal style={{ '--d': `${i * 0.1}s` }}>
            <Sticker shape={v.shape} color={v.color} style={{ width: 46 }} />
            <h3>{v.title}</h3>
            <p>{v.body}</p>
          </li>
        ))}
      </ul>
      {!full && (
        <p className="about-more" data-reveal>
          <Link to="/ve-chung-toi" className="btn btn-glass">
            Đọc thêm về chúng mình
          </Link>
        </p>
      )}
    </section>
  )
}

export default function AboutPage() {
  return (
    <div className="page about-page landing">
      <AboutSection full />
      <section className="section about-story">
        <div className="section-head">
          <h2 className="display-sm">
            Từ một chiếc áo trắng <em>đến tùm lum thứ</em>.
          </h2>
          <p>
            Một chiếc áo trắng là trang giấy trắng. Bộ kit của Tùm Lum gồm áo hoặc túi tote trắng cùng bộ
            sticker in chuyển nhiệt; bạn chọn bộ sticker mình thích, xếp thử vị trí trong trình phối, thậm chí
            tải hình hay vẽ tay của riêng bạn lên, rồi ủi lên vải theo hướng dẫn trong bộ kit.
          </p>
          <p>
            Chúng mình muốn việc làm đồ của riêng mình trở nên đơn giản và vui: không cần xưởng in, không cần
            đặt số lượng lớn, chỉ cần một ý tưởng.
          </p>
        </div>
        <div className="about-ctas">
          <Link to="/#combo" className="btn btn-dark">
            Xem bảng giá bộ kit
          </Link>
          <Link to="/basic/ao" className="btn btn-glass">
            Bắt đầu với áo thun
          </Link>
        </div>
      </section>
    </div>
  )
}
