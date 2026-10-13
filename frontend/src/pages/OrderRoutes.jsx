import { Navigate, useParams, useSearchParams } from 'react-router-dom'
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
  const combos = inTier(useCombos(), tier, productKey)
  if (!combos.length) return <ComboMissing />
  const combo = combos.find((c) => c.slug === params.get('combo')) ?? combos[0]
  // key theo gói + món: đổi combo trong gói vẫn giữ lựa chọn, đổi món thì làm lại từ đầu
  return (
    <OrderPage
      key={`${tier}/${productKey}`}
      combos={combos}
      combo={combo}
      productKey={productKey}
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
