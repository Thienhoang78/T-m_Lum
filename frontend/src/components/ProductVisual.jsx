import { useEffect, useState } from 'react'
import { PRODUCTS } from '../data/products.js'
import { backPhoto, onSide } from '../data/design.js'
import { TeeArt, ToteArt } from './GarmentArt.jsx'
import Sticker from './Sticker.jsx'

// Ảnh món nền trong khung vuông: dùng ảnh thật (thiếu file ảnh thì dùng hình vẽ trắng).
// side: 'front' | 'back' (mặt sau của áo dựng từ ảnh mặt trước, túi dùng lại ảnh mặt trước).
// design: sticker đặt theo toạ độ % của khung; chỉ hiện các lớp thuộc mặt đang xem.
export default function ProductVisual({
  productKey = 'ao',
  color,
  pattern = false,
  side = 'front',
  design = [],
  alt = '',
  className = '',
  children,
}) {
  const [photoOk, setPhotoOk] = useState(true)
  const [back, setBack] = useState(null)
  const front = PRODUCTS[productKey]?.photo
  useEffect(() => {
    if (side !== 'back') return
    let alive = true
    backPhoto(productKey).then((url) => alive && setBack(url))
    return () => {
      alive = false
    }
  }, [productKey, side])
  const photo = side === 'back' ? (back ?? front) : front
  let art
  if (photo && photoOk) {
    art = (
      <img src={photo} alt={alt} className="tee-photo" draggable={false} onError={() => setPhotoOk(false)} />
    )
  } else {
    const Art = productKey === 'tui' ? ToteArt : TeeArt
    art = (
      <span role={alt ? 'img' : undefined} aria-label={alt || undefined} className="tee-photo">
        <Art
          fill={color?.fill}
          seam={color?.seam}
          pattern={pattern}
          side={side}
          outline
          className="tee-photo"
        />
      </span>
    )
  }
  return (
    <div className={`tee-visual ${className}`}>
      {art}
      {onSide(design, side)
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
              color={it.color}
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
