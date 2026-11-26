import { printArea } from './products.js'

// Hoạ tiết in sẵn trên áo / túi Combo 2, đổi theo bộ sticker đi kèm khách chọn (mã bộ trong stickerCatalog.json).
// Mỗi hoạ tiết là một tấm A4 dọc: tấm gốc nền trắng để in ở print/patterns/<bộ>.png, bản web nền trong suốt
// ở public/patterns/<bộ>.webp (tạo bằng scripts/patterns/build_patterns.py). Trên món nền, hoạ tiết nằm khít
// khung in A4 dọc của mặt trước, theo cùng thang cỡ với sticker. Áo và túi dùng chung hoạ tiết.
export const PATTERNS = {
  'an-vat': { src: '/patterns/an-vat.webp', name: 'xe đẩy mua sắm' },
  'giang-sinh': { src: '/patterns/giang-sinh.webp', name: 'cây thông Noel' },
}

// Hoạ tiết hiện trên món nền: { src, name, box } (box: % khung ảnh vuông), hoặc null khi combo không in sẵn
// hoạ tiết hay bộ chưa có hoạ tiết
export function patternFor(combo, productKey, setKey) {
  if (!combo?.patterned) return null
  const art = PATTERNS[setKey]
  return art ? { ...art, box: printArea(productKey, 'front', 'doc') } : null
}
