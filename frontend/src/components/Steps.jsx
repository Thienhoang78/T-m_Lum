const STEPS = [
  {
    title: 'Chọn món nền',
    body: 'Áo thun hoặc túi tote, trơn hoặc in sẵn hoạ tiết đen trắng. Chọn màu và size ngay tại quầy.',
  },
  {
    title: 'Chọn sticker hoặc bộ in lụa',
    body: 'Lục kho sticker, xếp thử vị trí trên áo cho tới khi ưng ý; hoặc lấy bộ in lụa để tự tay in.',
  },
  {
    title: 'In ép nhiệt hoặc tự in lụa',
    body: 'Studio ép sticker lên vải bằng máy ép nhiệt, hoặc bạn tự in với khuôn, dao gạt và mực trong bộ.',
  },
]

export default function Steps() {
  return (
    <section className="section" id="cach-lam">
      <div className="section-head">
        <p className="eyebrow">Cách làm</p>
        <h2 className="display-sm">
          Ba bước, một món đồ <em>của riêng bạn</em>.
        </h2>
      </div>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className="step">
            <span className="step-no">{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
