// Bộ sticker của shop: chọn kèm Combo 1 (cách "bộ sticker có sẵn") và Combo 2 (bộ đi kèm), in cả tấm mua thêm.
// Hình cắt từ tấm A4 gốc print/sticker-sets/<bộ>/sheet.png bằng scripts/stickers/build_sets.py;
// danh mục (tên, ảnh, cỡ in thật) nằm ở stickerCatalog.json do script tạo ra, không sửa tay.
// Mỗi bộ: { key, name, sheet: { src, w, h }, stickers: [{ id, name, src, w, h, x, y }] }
// (w, h: cỡ in thật, cm; x, y: góc trên trái trên tấm, % bề ngang / cao tấm)
import CATALOG from './stickerCatalog.json'

export const STICKER_SETS = CATALOG

const BY_ID = new Map(CATALOG.flatMap((set) => set.stickers.map((st) => [st.id, { ...st, set: set.key }])))
// Sticker thư viện theo mã (vd. 'an-vat-03'); mã không còn trong danh mục thì null
export const stickerArt = (id) => BY_ID.get(id) ?? null
export const setOf = (key) => CATALOG.find((set) => set.key === key) ?? null
