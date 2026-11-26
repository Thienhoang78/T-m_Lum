import { Suspense, lazy, useState } from 'react'
import { PRICING, fmtKm, vnd } from '../data/pricing.js'

// Bản đồ (Leaflet) chỉ tải khi khách bấm ghim vị trí
const LocationPicker = lazy(() => import('./LocationPicker.jsx'))

// Ô "miễn phí giao trong bán kính 3 km quanh studio" ở trang đặt hàng (khi nhận ở tỉnh của studio).
// geo: vị trí đã ghim { lat, lng } hoặc null; q: bảng giá hiện tại (q.nearby, q.distanceKm); fee: phí giao của tỉnh
export default function NearbyShip({ geo, onChange, q, fee }) {
  const [open, setOpen] = useState(false)
  const r = PRICING.freeShipRadiusKm
  const km = q.distanceKm

  return (
    <div className={`near-ship${geo ? (q.nearby ? ' is-in' : ' is-out') : ''}`}>
      <p className="near-title">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 21s-6.5-6.1-6.5-11.2A6.5 6.5 0 0118.5 9.8C18.5 14.9 12 21 12 21z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="9.8" r="2.3" fill="currentColor" />
        </svg>
        Miễn phí giao trong bán kính {r} km quanh studio
      </p>
      <p className="near-text" role="status">
        {!geo || km == null ? (
          'Ghim nơi nhận trên bản đồ để kiểm tra (tính theo đường chim bay).'
        ) : q.nearby ? (
          <>
            <strong>Nơi nhận cách studio {fmtKm(km)} km:</strong> được miễn phí giao hàng.
          </>
        ) : (
          <>
            Nơi nhận cách studio {fmtKm(km)} km, ngoài {r} km
            {q.shipping > 0 ? `: phí giao ${vnd(fee)}.` : '.'}
          </>
        )}
      </p>
      <p className="near-actions">
        <button type="button" className="btn btn-glass btn-sm" onClick={() => setOpen(true)}>
          {geo ? 'Đổi vị trí' : 'Ghim vị trí trên bản đồ'}
        </button>
        {geo && (
          <button type="button" className="link" onClick={() => onChange(null)}>
            Bỏ vị trí
          </button>
        )}
      </p>
      {geo && <p className="near-note">Studio sẽ đối chiếu vị trí ghim với địa chỉ khi gọi xác nhận đơn.</p>}
      {open && (
        <Suspense fallback={<p className="near-note">Đang tải bản đồ…</p>}>
          <LocationPicker initial={geo} onPick={onChange} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
