import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCombos } from '../data/useCombos.js'
import { PRODUCTS } from '../data/products.js'
import ComboMissing from './ComboMissing.jsx'
import OrderPage from './OrderPage.jsx'

// Đường dẫn trang đặt hàng:
//   /basic/ao, /basic/tui   gói Basic, chọn Combo 1 / Combo 2 trên trang (?combo=combo-2)
//   /premium                gói Premium, chỉ có áo
const inTier = (combos, tier, product) =>
  combos.filter((c) => (c.tier ?? 'basic') === tier && (!c.products || c.products.includes(product)))

function TierOrder({ tier, productKey, user }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const all = useCombos()
  const combos = inTier(all, tier, productKey)
  if (!combos.length) return <ComboMissing />
  const combo = combos.find((c) => c.slug === params.get('combo')) ?? combos[0]
  // Các món trong gói (Basic: áo, túi); đổi món ngay trên trang / trong trình phối, giữ combo đang chọn
  const products = [
    ...new Set(all.filter((c) => (c.tier ?? 'basic') === tier).flatMap((c) => c.products ?? ['ao'])),
  ]
  const onProduct = (k) =>
    navigate(`/${tier}/${k}${params.get('combo') ? `?combo=${params.get('combo')}` : ''}`, {
      replace: true,
      state: { keepScroll: true },
    })
  // key theo gói: đổi combo hay đổi áo ↔ túi vẫn giữ lựa chọn, hình tải lên và trình phối đang mở
  return (
    <OrderPage
      key={tier}
      combos={combos}
      combo={combo}
      productKey={productKey}
      products={products}
      onProduct={onProduct}
      user={user}
    />
  )
}

export function BasicOrder({ user }) {
  const { product } = useParams()
  if (!PRODUCTS[product]) return <Navigate to="/#combo" replace />
  return <TierOrder tier="basic" productKey={product} user={user} />
}

export function PremiumOrder({ user }) {
  return <TierOrder tier="premium" productKey="ao" user={user} />
}

// Link cũ /combo/combo-1/ao, /combo/combo-3/ao... chuyển sang đường dẫn mới
export function LegacyComboRedirect() {
  const { slug, product } = useParams()
  if (slug === 'combo-3' || slug === 'premium') return <Navigate to="/premium" replace />
  const to = PRODUCTS[product] ? `/basic/${product}` : '/#combo'
  return <Navigate to={slug === 'combo-2' ? `${to}?combo=combo-2` : to} replace />
}
