// Chép file chạy của onnxruntime-web (wasm + loader) vào public/ort để trình duyệt tải từ chính trang web.
// Chạy tự động trước "build" (xem package.json); khi dev, vite.config.js phục vụ thẳng từ node_modules.
// Thư mục public/ort không đưa vào git.
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
// gói không cho resolve package.json; file chính nằm sẵn trong dist/
const dist = dirname(require.resolve('onnxruntime-web'))
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ort')
mkdirSync(out, { recursive: true })
for (const f of ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'])
  copyFileSync(join(dist, f), join(out, f))
console.log('Đã chép onnxruntime-web vào public/ort')
