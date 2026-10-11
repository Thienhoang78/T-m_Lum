import { useId } from 'react'

// Khối tuỳ chọn dùng chung cho trang sản phẩm: nhóm tuỳ chọn, nút viên thuốc, bộ tăng giảm số lượng, bảng size.

export function OptionGroup({ label, note, aside, children }) {
  const id = useId()
  return (
    <div className="opt" role="group" aria-labelledby={id}>
      <div className="opt-head">
        <p className="opt-label" id={id}>
          Chọn {label.toLowerCase()}
          {note && <small> ({note})</small>}
        </p>
        {aside}
      </div>
      <div className="pills">{children}</div>
    </div>
  )
}

export function Pills({ label, note, aside, options, value, onChange, multi }) {
  return (
    <OptionGroup label={label} note={note} aside={aside}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="pill"
          aria-pressed={multi ? value.includes(o) : value === o}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </OptionGroup>
  )
}

export function Stepper({ value, label, onChange, min = 0 }) {
  return (
    <div className="stepper">
      <button
        type="button"
        aria-label={`Bớt 1, ${label}`}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max="999"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" aria-label={`Thêm 1, ${label}`} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

export function SizeChart({ chart }) {
  return (
    <div className="size-chart">
      <table>
        <thead>
          <tr>
            {chart.head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((r) => (
            <tr key={r[0]}>
              {r.map((v, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {v}
                  </th>
                ) : (
                  <td key={i}>{v}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="size-note">{chart.note}</p>
    </div>
  )
}
