// Icon nét mảnh (24×24, viền 1.8) cho các mục giới thiệu: thay cho sticker hoạt hình ở những chỗ cần trông gọn, hiện đại.
const PATHS = {
  upload: (
    <>
      <path d="M12 15V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </>
  ),
  wand: (
    <>
      <path d="M4 20L15 9" />
      <path d="M13.5 7.5l3 3" />
      <path d="M18 2.5l.7 1.8 1.8.7-1.8.7L18 7.5l-.7-1.8-1.8-.7 1.8-.7z" />
      <path d="M8 3.5l.4 1.1 1.1.4-1.1.4L8 6.5l-.4-1.1-1.1-.4 1.1-.4z" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19l-4 1z" />
      <path d="M14.5 6.5l3 3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z" />
      <path d="M3.5 12l8.5 4.5 8.5-4.5" />
      <path d="M3.5 16l8.5 4.5 8.5-4.5" />
    </>
  ),
  cursor: <path d="M5.5 3.5l12.5 6-5.4 1.9-1.9 5.4z" />,
  flame: (
    <path d="M12 21a6 6 0 006-6c0-3.4-2.4-5.4-3.4-8.4-.5 2-1.6 3-2.6 3.5.5-2.6-.5-5-2.5-6.6 0 3-3.5 5.5-3.5 9.5a6 6 0 006 8z" />
  ),
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  sparkles: (
    <>
      <path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </>
  ),
  fingerprint: (
    <>
      <path d="M7 18.5c1-1.8 1.5-3.8 1.5-6.5a3.5 3.5 0 017 0c0 1.5-.1 3-.4 4.4" />
      <path d="M12 12c0 3.2-.6 6-1.8 8.5" />
      <path d="M4.5 15c.3-1 .5-2 .5-3a7 7 0 0114 0c0 2.4-.3 4.6-1 6.6" />
    </>
  ),
  zap: <path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z" />,
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  rotate: (
    <>
      <path d="M20 12a8 8 0 11-2.34-5.66" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M20.5 16l-5-5-8 8.5" />
    </>
  ),
}

export default function Icon({ name, size = 22, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
