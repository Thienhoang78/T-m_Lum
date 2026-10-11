const STEPS = [
  {
    title: 'Chọn món nền',
    body: 'Áo thun trơn hoặc túi tote canvas. Chọn màu và size ngay tại quầy.',
  },
  {
    title: 'Chọn sticker',
    body: 'Lục kho sticker, xếp thử vị trí trên áo cho tới khi ưng ý.',
  },
  {
    title: 'In ép nhiệt & mang về',
    body: 'Studio ép sticker lên vải bằng máy ép nhiệt. Bạn nhận món đồ của riêng mình.',
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
