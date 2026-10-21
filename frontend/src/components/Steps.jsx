const STEPS = [
  {
    title: 'Chọn bộ kit',
    body: 'Bộ kit cơ bản in chuyển nhiệt (áo thun hoặc túi tote, Combo 1 hoặc Combo 2) hoặc bộ kit cao cấp in lụa.',
  },
  {
    title: 'Chọn sticker hoặc tự tạo hình',
    body: 'Chọn bộ sticker đi kèm, xếp thử lên áo trong trình phối; Combo 1 còn cho tải hình của bạn lên.',
  },
  {
    title: 'In chuyển nhiệt hoặc in lụa',
    body: 'Sticker in chuyển nhiệt bám chắc lên vải; bộ kit cao cấp có khuôn in, dao gạt và lọ mực để bạn tự in lụa.',
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
