// Hai bộ kit theo bảng giá của studio:
//   1. Bộ kit cơ bản – in chuyển nhiệt: áo thun hoặc túi tote, chọn Combo 1 / Combo 2
//   2. Bộ kit cao cấp – in lụa: áo thun + bộ dụng cụ in lụa
// method: 'heat-transfer' = sticker in chuyển nhiệt, 'screen-print' = bộ dụng cụ tự in lụa.
// patterned: món nền in sẵn nền/hoạ tiết đen trắng. products: món nền có trong combo.
export const TIERS = {
  basic: {
    key: 'basic',
    no: 1,
    name: 'Bộ kit cơ bản',
    method: 'In chuyển nhiệt',
    tagline: 'Áo thun hoặc túi tote · 2 combo',
    accent: 'sun',
  },
  premium: {
    key: 'premium',
    no: 2,
    name: 'Bộ kit cao cấp',
    method: 'In lụa',
    tagline: 'Áo thun + bộ dụng cụ in lụa',
    accent: 'sky',
    featured: true,
  },
}

export const tierOf = (combo) => TIERS[combo.tier] ?? TIERS.basic

// Nội dung từng combo đúng theo bảng giá (ưu tiên hơn dữ liệu combo trong cơ sở dữ liệu)
export const COMBO_COPY = {
  'combo-1': {
    tagline: 'Trơn + 1 bộ sticker tự chọn',
    items: {
      ao: ['1 áo thun trơn', '1 bộ sticker in chuyển nhiệt (tự chọn)'],
      tui: ['1 túi tote trơn', '1 bộ sticker in chuyển nhiệt (tự chọn)'],
    },
  },
  'combo-2': {
    tagline: 'Nền / hoạ tiết đen trắng + 1 bộ sticker',
    items: {
      ao: ['1 áo thun có nền/hoạ tiết đen trắng thiết kế sẵn', '1 bộ sticker in chuyển nhiệt'],
      tui: ['1 túi tote có nền/hoạ tiết đen trắng thiết kế sẵn', '1 bộ sticker in chuyển nhiệt'],
    },
  },
  premium: {
    tagline: 'Áo thun + bộ dụng cụ in lụa + 1 bộ sticker',
    items: {
      ao: [
        '1 áo thun trơn',
        '1 bộ dụng cụ in lụa gồm 1 khuôn in, 1 dao gạt và 1 lọ mực',
        '1 bộ sticker in chuyển nhiệt',
      ],
    },
  },
}
export const withCopy = (combo) => ({ ...combo, ...COMBO_COPY[combo.slug] })

export const PLACEHOLDER_COMBOS = [
  {
    slug: 'combo-1',
    tier: 'basic',
    name: 'Combo 1',
    method: 'heat-transfer',
    patterned: false,
    products: ['ao', 'tui'],
  },
  {
    slug: 'combo-2',
    tier: 'basic',
    name: 'Combo 2',
    method: 'heat-transfer',
    patterned: true,
    products: ['ao', 'tui'],
  },
  {
    slug: 'premium',
    tier: 'premium',
    name: 'Premium',
    method: 'screen-print',
    patterned: false,
    products: ['ao'],
  },
].map(withCopy)
