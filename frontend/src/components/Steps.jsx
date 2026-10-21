import { TeeArt } from './GarmentArt.jsx'
import Sticker from './Sticker.jsx'

// Ba bước, mỗi bước một cảnh nhỏ chạy lặp khi cuộn tới:
// 1. hộp kit mở ra, áo và tờ sticker bật lên; 2. sticker bay vào đúng chỗ trên áo; 3. bàn ủi lướt qua, hơi nước bốc lên.
function SceneChoose() {
  return (
    <div className="step-scene scene-choose" aria-hidden="true">
      <span className="kitbox">
        <span className="kitbox-lid" />
        <span className="kitbox-label">DIY KIT</span>
      </span>
      <span className="pop pop-tee">
        <TeeArt className="step-tee" />
      </span>
      <span className="pop pop-sheet">
        <Sticker shape="smile" color="var(--sun)" style={{ width: 22 }} />
        <Sticker shape="heart" color="var(--pink)" style={{ width: 18 }} />
        <Sticker shape="flower" color="var(--mint)" style={{ width: 20 }} />
      </span>
    </div>
  )
}

function ScenePlace() {
  return (
    <div className="step-scene scene-place" aria-hidden="true">
      <TeeArt className="step-tee big" />
      <span className="place-target" />
      <span className="place-sticker">
        <Sticker shape="flower" color="var(--pink)" />
      </span>
      <span className="place-cursor" />
    </div>
  )
}

function SceneIron() {
  return (
    <div className="step-scene scene-iron" aria-hidden="true">
      <TeeArt className="step-tee big" />
      <span className="iron-sticker">
        <Sticker shape="star" color="var(--sun)" />
      </span>
      <svg className="iron" viewBox="0 0 120 70">
        <path d="M14 58h96c0-26-20-42-50-42H38C26 16 14 30 14 58z" fill="var(--brand-strong)" />
        <path d="M10 58h104v8H10z" fill="#cfd8e3" />
        <path
          d="M44 16c0-8 6-12 14-12h26c6 0 9 4 9 9"
          fill="none"
          stroke="var(--navy)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="86" cy="40" r="5" fill="var(--sun)" />
      </svg>
      <span className="puff p1" />
      <span className="puff p2" />
      <span className="puff p3" />
    </div>
  )
}

const STEPS = [
  {
    title: 'Chọn bộ kit',
    body: 'Bộ kit cơ bản in chuyển nhiệt (áo thun hoặc túi tote, Combo 1 hoặc Combo 2) hoặc bộ kit cao cấp in lụa.',
    Scene: SceneChoose,
  },
  {
    title: 'Chọn sticker hoặc tự tạo hình',
    body: 'Chọn bộ sticker đi kèm, xếp thử lên áo trong trình phối; Combo 1 còn cho tải hình hoặc vẽ tay của bạn.',
    Scene: ScenePlace,
  },
  {
    title: 'In chuyển nhiệt hoặc in lụa',
    body: 'Sticker in chuyển nhiệt bám chắc lên vải; bộ kit cao cấp có khuôn in, dao gạt và lọ mực để bạn tự in lụa.',
    Scene: SceneIron,
  },
]

export default function Steps() {
  return (
    <section className="section" id="cach-lam">
      <div className="section-head" data-reveal>
        <p className="eyebrow">Cách làm</p>
        <h2 className="display-sm">
          Ba bước, một món đồ <em>của riêng bạn</em>.
        </h2>
      </div>
      <ol className="steps steps-live">
        {STEPS.map(({ title, body, Scene }, i) => (
          <li key={title} className="step" data-reveal style={{ '--d': `${i * 0.12}s` }}>
            <Scene />
            <span className="step-no">{i + 1}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
