// Hai gói: Basic (áo hoặc túi tote, chọn Combo 1 / Combo 2) và Premium (chỉ áo, bộ tự in lụa).
// method: 'heat-transfer' = ép nhiệt sticker tại studio, 'screen-print' = bộ dụng cụ tự in lụa.
// patterned: món nền in sẵn nền/hoạ tiết đen trắng. products: món nền có trong combo.
export const TIERS = {
  basic: { key: 'basic', name: 'Basic', tagline: 'Áo thun hoặc túi tote · 2 combo', accent: 'sun' },
  premium: {
    key: 'premium',
    name: 'Premium',
    tagline: 'Áo thun + bộ tự in lụa',
    accent: 'sky',
    featured: true,
  },
}

export const tierOf = (combo) => TIERS[combo.tier] ?? TIERS.basic

export const PLACEHOLDER_COMBOS = [
  {
    slug: 'combo-1',
    tier: 'basic',
    name: 'Combo 1',
    tagline: 'Trơn + ép nhiệt sticker',
    method: 'heat-transfer',
    patterned: false,
    products: ['ao', 'tui'],
    items: {
      ao: ['1 áo thun trơn', 'Dịch vụ ép nhiệt sticker'],
      tui: ['1 túi tote trơn', 'Dịch vụ ép nhiệt sticker'],
    },
  },
  {
    slug: 'combo-2',
    tier: 'basic',
    name: 'Combo 2',
    tagline: 'Hoạ tiết đen trắng + ép nhiệt sticker',
    method: 'heat-transfer',
    patterned: true,
    products: ['ao', 'tui'],
    items: {
      ao: ['1 áo thun in sẵn nền/hoạ tiết đen trắng', 'Dịch vụ ép nhiệt sticker'],
      tui: ['1 túi tote in sẵn nền/hoạ tiết đen trắng', 'Dịch vụ ép nhiệt sticker'],
    },
  },
  {
    slug: 'premium',
    tier: 'premium',
    name: 'Premium',
    tagline: 'Bộ tự in lụa',
    method: 'screen-print',
    patterned: false,
    products: ['ao'],
    items: {
      ao: ['1 áo thun trơn', '1 bộ in lụa: 1 khuôn in (stencil), 1 dao gạt mực, 1 chai mực in'],
    },
  },
]
