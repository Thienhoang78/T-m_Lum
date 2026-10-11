// Thành phần 3 combo theo từng món nền (áo / túi). Tên và giá vẫn là NỘI DUNG MẪU, thay khi có thông tin thật.
// method: 'heat-transfer' = sticker ép nhiệt tại studio, 'screen-print' = bộ dụng cụ tự in lụa.
// patterned: món nền in sẵn nền/hoạ tiết đen trắng.
export const PLACEHOLDER_COMBOS = [
  {
    slug: 'combo-1',
    name: 'Combo 1',
    tagline: 'Trơn + sticker ép nhiệt',
    price: null,
    method: 'heat-transfer',
    patterned: false,
    summary: ['1 áo thun hoặc túi tote trơn', '1 bộ sticker ép nhiệt'],
    items: {
      ao: ['1 áo thun trơn', '1 bộ sticker ép nhiệt'],
      tui: ['1 túi tote trơn', '1 bộ sticker ép nhiệt'],
    },
    accent: 'sun',
    placeholder: true,
  },
  {
    slug: 'combo-2',
    name: 'Combo 2',
    tagline: 'Hoạ tiết đen trắng + sticker ép nhiệt',
    price: null,
    method: 'heat-transfer',
    patterned: true,
    summary: ['1 áo thun hoặc túi tote in sẵn hoạ tiết đen trắng', '1 bộ sticker ép nhiệt'],
    items: {
      ao: ['1 áo thun in sẵn nền/hoạ tiết đen trắng', '1 bộ sticker ép nhiệt'],
      tui: ['1 túi tote in sẵn nền/hoạ tiết đen trắng', '1 bộ sticker ép nhiệt'],
    },
    accent: 'pink',
    featured: true,
    placeholder: true,
  },
  {
    slug: 'combo-3',
    name: 'Combo 3',
    tagline: 'Bộ tự in lụa',
    price: null,
    method: 'screen-print',
    patterned: false,
    summary: ['1 áo thun hoặc túi tote trơn', '1 bộ in lụa: khuôn in, dao gạt mực, chai mực in'],
    items: {
      ao: ['1 áo thun trơn', '1 bộ in lụa: 1 khuôn in (stencil), 1 dao gạt mực, 1 chai mực in'],
      tui: ['1 túi tote trơn', '1 bộ in lụa: 1 khuôn in (stencil), 1 dao gạt mực, 1 chai mực in'],
    },
    accent: 'sky',
    placeholder: true,
  },
]
