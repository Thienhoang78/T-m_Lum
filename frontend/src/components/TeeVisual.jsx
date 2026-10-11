import { useState } from 'react'
import { PRODUCTS } from '../data/products.js'
import { TeeArt } from './GarmentArt.jsx'
import Sticker from './Sticker.jsx'

// Ảnh áo trắng thật; thiếu file ảnh thì dùng hình vẽ SVG.
// design: sticker đặt theo toạ độ % trên khung vuông (cùng hệ toạ độ với bảng phối thử).
// flat + ink: combo in lụa, hình in phẳng một màu mực thay cho sticker.
export default function TeeVisual({ design = [], flat = false, ink, alt = '', className = '', children }) {
  const [photoOk, setPhotoOk] = useState(true)
  return (
    <div className={`tee-visual ${className}`}>
      {photoOk ? (
        <img
          src={PRODUCTS.ao.photo}
          alt={alt}
          className="tee-photo"
          draggable={false}
          onError={() => setPhotoOk(false)}
        />
      ) : (
        <TeeArt className="tee-photo" />
      )}
      {design.map((it, i) => (
        <Sticker
          key={i}
          shape={it.shape}
          color={flat ? ink : it.color}
          flat={flat}
          label={it.label}
          className="tee-placed-sticker"
          style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.s}%`, rotate: `${it.r}deg` }}
        />
      ))}
      {children}
    </div>
  )
}
