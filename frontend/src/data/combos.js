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
    tagline: 'Trơn + chọn 1 trong 3: tự vẽ, hình của bạn hoặc bộ sticker có sẵn',
    items: {
      ao: [
        '1 áo thun trơn',
        'Sticker in chuyển nhiệt, chọn 1 trong 3: tự vẽ, tải hình của bạn hoặc 1 bộ sticker có sẵn của shop',
      ],
      tui: [
        '1 túi tote trơn',
        'Sticker in chuyển nhiệt, chọn 1 trong 3: tự vẽ, tải hình của bạn hoặc 1 bộ sticker có sẵn của shop',
      ],
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
// Combo 1: 3 cách làm sticker, khách chọn đúng 1 (xem PRICING.choices)
export const CHOICES = {
  ve: {
    name: 'Tự vẽ',
    body: 'Vẽ thẳng lên áo / túi trong Phối thử bằng bút mực, bút dạ, bút chì…, khổ tối đa A4.',
    shape: 'bolt',
    color: 'var(--brand-strong)',
  },
  'tai-len': {
    name: 'Tải hình của bạn',
    body: 'Tải ảnh của bạn lên, hình được tách nền rồi in thành sticker. Cần ký cam kết bản quyền.',
    shape: 'star',
    color: 'var(--sun)',
  },
  'bo-sticker': {
    name: 'Bộ sticker có sẵn',
    body: 'Chọn 1 trong các bộ sticker của shop, xếp thử vị trí trong Phối thử.',
    shape: 'heart',
    color: 'var(--pink)',
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
