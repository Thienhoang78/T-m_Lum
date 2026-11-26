import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PRICING, STUDIO, distanceKm, fmtKm } from '../data/pricing.js'

// Hộp thoại ghim nơi nhận hàng trên bản đồ (Leaflet + bản đồ OpenStreetMap, chỉ tải khi mở).
// Ghim cố định ở giữa, khách kéo bản đồ (chuột, chạm, phím mũi tên) hoặc bấm "Dùng vị trí của tôi".
// Vòng tròn xanh = bán kính miễn phí giao quanh studio. Khoảng cách là đường chim bay.
const studioIcon = L.divIcon({
  className: 'map-studio',
  html: '<span>Studio</span>',
  iconSize: [64, 28],
  iconAnchor: [32, 14],
})

export default function LocationPicker({ initial, onPick, onClose }) {
  const dialogRef = useRef(null)
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  // null cho tới khi khách kéo bản đồ / dùng vị trí: không cho xác nhận ngay vị trí mặc định (studio)
  const [pos, setPos] = useState(initial ?? null)
  const touched = useRef(!!initial) // khách đã tự đặt vị trí chưa
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState(null)

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
    const map = L.map(mapEl.current, {
      center: initial ?? STUDIO,
      zoom: initial ? 16 : 14,
      zoomControl: true,
    })
    mapRef.current = map
    map.attributionControl.setPrefix(
      '<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>'
    )
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map)
    L.circle(STUDIO, {
      radius: PRICING.freeShipRadiusKm * 1000,
      color: '#1e88e5',
      weight: 2,
      fillColor: '#1e88e5',
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(map)
    L.marker(STUDIO, { icon: studioIcon, keyboard: false, interactive: false }).addTo(map)
    // vị trí = tâm bản đồ (chỗ ghim), chỉ tính từ khi khách tự kéo bản đồ / dùng phím mũi tên / lấy vị trí
    map.on('move', () => {
      if (!touched.current) return
      const c = map.getCenter()
      setPos({ lat: c.lat, lng: c.lng })
    })
    map.on('dragstart', () => (touched.current = true))
    const el = mapEl.current
    const onKey = (e) => e.key.startsWith('Arrow') && (touched.current = true)
    el.addEventListener('keydown', onKey)
    // hộp thoại vừa mở: bản đồ cần đo lại khung
    const t = setTimeout(() => map.invalidateSize(), 50)
    return () => {
      clearTimeout(t)
      el.removeEventListener('keydown', onKey)
      map.remove()
    }
    // chỉ dựng bản đồ một lần khi mở hộp thoại
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function locate() {
    if (!navigator.geolocation) return setGeoError('Trình duyệt không hỗ trợ lấy vị trí.')
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        const here = { lat: p.coords.latitude, lng: p.coords.longitude }
        touched.current = true
        mapRef.current?.setView(here, 17)
        setPos(here)
      },
      (err) => {
        setLocating(false)
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Bạn chưa cho phép lấy vị trí. Hãy kéo bản đồ để ghim nơi nhận.'
            : 'Chưa lấy được vị trí, thử lại hoặc kéo bản đồ để ghim.'
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const km = pos ? distanceKm(STUDIO, pos) : null
  const inside = km != null && km <= PRICING.freeShipRadiusKm

  return (
    <dialog
      ref={dialogRef}
      className="auth map-dialog"
      aria-labelledby="map-title"
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
    >
      <div className="auth-card map-card">
        <button
          type="button"
          className="auth-close"
          aria-label="Đóng"
          onClick={() => dialogRef.current.close()}
        >
          ×
        </button>
        <h2 id="map-title" className="map-title">
          Ghim nơi nhận hàng
        </h2>
        <p className="map-sub">
          Kéo bản đồ cho ghim đỏ nằm đúng nơi nhận. Trong vòng tròn xanh (bán kính {PRICING.freeShipRadiusKm}{' '}
          km quanh studio, đường chim bay) được miễn phí giao.
        </p>
        <div className="map-wrap">
          <div ref={mapEl} className="map-canvas" aria-label="Bản đồ, dùng phím mũi tên để di chuyển" />
          <span className="map-pin" aria-hidden="true" />
        </div>
        <p className={`map-readout${pos ? (inside ? ' is-in' : ' is-out') : ''}`} role="status">
          {!pos
            ? 'Kéo bản đồ hoặc bấm “Dùng vị trí của tôi”.'
            : inside
              ? `Cách studio ${fmtKm(km)} km: miễn phí giao hàng`
              : `Cách studio ${fmtKm(km)} km: ngoài ${PRICING.freeShipRadiusKm} km, tính phí giao theo tỉnh`}
        </p>
        {geoError && <p className="field-err">{geoError}</p>}
        <div className="map-actions">
          <button type="button" className="btn btn-glass btn-sm" onClick={locate} disabled={locating}>
            {locating ? 'Đang lấy vị trí…' : 'Dùng vị trí của tôi'}
          </button>
          <button
            type="button"
            className="btn btn-brand btn-sm"
            disabled={!pos}
            onClick={() => {
              onPick(pos)
              dialogRef.current.close()
            }}
          >
            Xác nhận vị trí này
          </button>
        </div>
      </div>
    </dialog>
  )
}
