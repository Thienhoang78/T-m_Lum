import { useState } from 'react'
import { PRODUCTS } from '../data/products.js'
import { TeeArt, ToteArt } from './GarmentArt.jsx'
import Sticker from './Sticker.jsx'

// Ảnh món nền trong khung vuông: áo dùng ảnh thật (thiếu file ảnh thì dùng hình vẽ), túi dùng hình vẽ theo màu.
// design: sticker đặt theo toạ độ % của khung (cùng hệ toạ độ với bảng phối thử).
// flat + ink: gói in lụa, hình in phẳng một màu mực thay cho sticker.
export default function ProductVisual({
  productKey = 'ao',
  color,
  pattern = false,
  design = [],
  flat = false,
  ink,
  alt = '',
  className = '',
  children,
}) {
  const [photoOk, setPhotoOk] = useState(true)
  const photo = PRODUCTS[productKey]?.photo
  let art
  // Áo luôn dùng ảnh áo trắng (combo hoạ tiết có nhãn riêng trên trang); túi vẽ cả hoạ tiết
  if (photo && photoOk) {
    art = (
      <img src={photo} alt={alt} className="tee-photo" draggable={false} onError={() => setPhotoOk(false)} />
    )
  } else {
    const Art = productKey === 'tui' ? ToteArt : TeeArt
    art = (
      <span role={alt ? 'img' : undefined} aria-label={alt || undefined} className="tee-photo">
        <Art fill={color?.fill} seam={color?.seam} pattern={pattern} outline className="tee-photo" />
      </span>
    )
  }
  return (
    <div className={`tee-visual ${className}`}>
      {art}
      {design
        .filter((it) => !it.hidden)
        .map((it, i) =>
          it.src ? (
            <img
              key={i}
              src={it.src}
              alt=""
              draggable={false}
              className="tee-placed-sticker tee-placed-img"
              style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.s}%`, rotate: `${it.r}deg` }}
            />
          ) : (
            <Sticker
              key={i}
              shape={it.shape}
              color={flat ? ink : it.color}
              flat={flat}
              label={it.label}
              className="tee-placed-sticker"
              style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.s}%`, rotate: `${it.r}deg` }}
            />
          )
        )}
      {children}
    </div>
  )
}
