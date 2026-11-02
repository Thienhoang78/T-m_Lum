import { useId } from 'react'

// Hình in mẫu tối giản kiểu poster để minh hoạ "hình của bạn": mặt trời lặn vàng → hồng có sọc cắt ngang,
// hai lớp sóng xanh và chữ GOOD IDEAS. Dùng trong trình phối mô phỏng và các bước "Cách làm".
export default function PrintArt({ className = '' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={`print-art ${className}`} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc93c" />
          <stop offset="1" stopColor="#f0609f" />
        </linearGradient>
        <mask id={`${id}m`}>
          <rect width="100" height="100" fill="#fff" />
          <rect y="42" width="100" height="2.4" fill="#000" />
          <rect y="47.5" width="100" height="3" fill="#000" />
          <rect y="53" width="100" height="3.6" fill="#000" />
        </mask>
      </defs>
      <path d="M22 58a28 28 0 0156 0z" fill={`url(#${id}g)`} mask={`url(#${id}m)`} />
      <g fill="none" strokeLinecap="round">
        <path
          d="M16 65c5.7-4 11.3-4 17 0s11.3 4 17 0 11.3-4 17 0 11.3 4 17 0"
          stroke="#1e88e5"
          strokeWidth="3.6"
        />
        <path
          d="M22 74c4.7-3.3 9.3-3.3 14 0s9.3 3.3 14 0 9.3-3.3 14 0 9.3 3.3 14 0"
          stroke="#64b5f6"
          strokeWidth="3.2"
        />
      </g>
      <text
        x="50"
        y="90"
        textAnchor="middle"
        fontSize="7.6"
        fontWeight="800"
        letterSpacing="1.8"
        fill="#0d2b45"
        fontFamily="'Be Vietnam Pro', system-ui, sans-serif"
      >
        GOOD IDEAS
      </text>
    </svg>
  )
}
