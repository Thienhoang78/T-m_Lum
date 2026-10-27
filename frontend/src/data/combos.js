// Bộ kit cơ bản – in chuyển nhiệt: áo thun hoặc túi tote, chọn Combo 1 / Combo 2.
// (Bộ kit cao cấp in lụa đã ngừng bán: lọc bỏ cả khi dữ liệu cũ còn gửi về.)
// method: 'heat-transfer' = sticker in chuyển nhiệt.
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
}
export const withCopy = (combo) => ({ ...combo, ...COMBO_COPY[combo.slug] })
// Combo còn bán (bỏ bộ kit cao cấp in lụa)
export const onSale = (list) => list.filter((c) => c.tier !== 'premium' && c.slug !== 'premium')

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
].map(withCopy)
