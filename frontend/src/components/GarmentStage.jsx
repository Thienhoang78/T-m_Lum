import Sticker from './Sticker.jsx'

// Sân khấu hero: áo thun + túi tote, sticker bay vào và "dán" lên theo vòng lặp.
const TEE_STICKERS = [
  { shape: 'star', color: 'var(--sun)', x: 30, y: 38, r: -12, s: 64, d: 0 },
  { shape: 'smile', color: 'var(--pink)', x: 58, y: 52, r: 8, s: 70, d: 1.4 },
  { shape: 'blob', color: 'var(--mint)', x: 40, y: 66, r: 4, s: 78, d: 2.8, label: 'tùm lum' },
]
const TOTE_STICKERS = [
  { shape: 'heart', color: 'var(--pink)', x: 36, y: 50, r: 10, s: 58, d: 0.7 },
  { shape: 'bolt', color: 'var(--sky)', x: 64, y: 62, r: -8, s: 52, d: 2.1 },
  { shape: 'flower', color: 'var(--sun)', x: 46, y: 78, r: 14, s: 54, d: 3.5 },
]
const CYCLE = 7

function place(list) {
  return list.map((k, i) => (
    <Sticker
      key={i}
      shape={k.shape}
      color={k.color}
      label={k.label}
      className="slap"
      style={{
        left: `${k.x}%`,
        top: `${k.y}%`,
        width: k.s,
        '--r': `${k.r}deg`,
        // delay âm để khung hình đầu tiên đã có sticker nằm sẵn trên áo
        animationDelay: `${k.d - CYCLE}s`,
        animationDuration: `${CYCLE}s`,
      }}
    />
  ))
}

export default function GarmentStage() {
  return (
    <div className="stage" role="img" aria-label="Minh hoạ áo thun và túi tote được dán sticker">
      <div className="garment tee">
        <svg viewBox="0 0 300 320" className="garment-svg">
          <path
            d="M100 18c10 18 28 26 50 26s40-8 50-26l70 34-28 64-34-14v200H92V102l-34 14-28-64z"
            fill="var(--cotton)"
          />
          <path d="M100 18c10 18 28 26 50 26s40-8 50-26" fill="none" stroke="var(--seam)" strokeWidth="5" />
          <path d="M92 102v200M208 102v200" stroke="var(--seam)" strokeWidth="1.5" opacity=".5" />
        </svg>
        {place(TEE_STICKERS)}
        <span className="tag">ÁO THUN · COTTON</span>
      </div>
      <div className="garment tote">
        <svg viewBox="0 0 240 320" className="garment-svg">
          <path
            d="M70 110V70a50 50 0 01100 0v40"
            fill="none"
            stroke="var(--canvas-dark)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <rect x="22" y="100" width="196" height="210" rx="6" fill="var(--canvas)" />
          <path d="M22 122h196" stroke="var(--canvas-dark)" strokeWidth="2" strokeDasharray="5 5" />
        </svg>
        {place(TOTE_STICKERS)}
        <span className="tag">TÚI TOTE · CANVAS</span>
      </div>
      <Sticker shape="star" color="var(--sky)" className="float f1" style={{ width: 40 }} />
      <Sticker shape="heart" color="var(--sun)" className="float f2" style={{ width: 34 }} />
      <Sticker shape="smile" color="var(--mint)" className="float f3" style={{ width: 44 }} />
    </div>
  )
}
