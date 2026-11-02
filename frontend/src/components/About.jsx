import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

// "Về Tùm Lum Studio": đoạn giới thiệu trên trang chủ và trang /ve-chung-toi.
// Chỉ nói về bộ kit và tinh thần của studio; địa chỉ, giờ mở cửa, mạng xã hội sẽ thêm khi studio cung cấp.
// Bố cục: tiêu đề bên trái, đoạn giới thiệu bên phải; ba giá trị là thẻ có icon nét mảnh và số thứ tự.
const VALUES = [
  {
    icon: 'sparkles',
    title: 'Tự tay làm, vui từ đầu',
    body: 'Mỗi bộ kit là một buổi chơi nho nhỏ: chọn sticker, xếp thử, rồi tự tay ủi lên áo hay túi của mình.',
  },
  {
    icon: 'fingerprint',
    title: 'Không ai giống ai',
    body: 'Cùng một chiếc áo trắng, mỗi người dán một kiểu. Hình bạn tự vẽ, tự chọn làm nên món đồ của riêng bạn.',
  },
  {
    icon: 'zap',
    title: 'Dễ bắt đầu',
    body: 'Không cần máy móc hay kinh nghiệm in ấn: sticker in chuyển nhiệt, áo và túi trắng có sẵn trong bộ kit.',
  },
]

export function AboutSection({ full = false }) {
  return (
    <section className={`section about${full ? ' about-full' : ''}`} id="ve-chung-toi">
      <div className="about-head" data-reveal>
        <div className="section-head">
          <p className="eyebrow">Về Tùm Lum Studio</p>
          <h2 className="display-sm">
            Good ideas, <em>brighter days</em>.
          </h2>
        </div>
        <div className="about-side">
          <p className="about-lede">
            Tùm Lum Studio làm những bộ kit DIY in chuyển nhiệt cho áo thun và túi tote trắng. Chúng mình tin
            một ý tưởng nhỏ, vài chiếc sticker và một chút tự tay làm là đủ cho một ngày tươi hơn, và một món
            đồ mặc vào thấy vui.
          </p>
          {!full && (
            <Link to="/ve-chung-toi" className="arrow-link">
              Đọc thêm về chúng mình <Icon name="arrow" size={18} />
            </Link>
          )}
        </div>
      </div>
      <ul className="about-values">
        {VALUES.map((v, i) => (
          <li key={v.title} className="fx-spot" data-reveal style={{ '--d': `${i * 0.1}s` }}>
            <span className="line-ic">
              <Icon name={v.icon} />
            </span>
            <span className="about-no" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3>{v.title}</h3>
            <p>{v.body}</p>
          </li>
        ))}
      </ul>
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
