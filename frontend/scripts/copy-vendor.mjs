// Chép file chạy của thư viện vào public để trình duyệt tải từ chính trang web (không phụ thuộc CDN khác):
//   public/ort        onnxruntime-web (tách nền sticker bằng AI)
//   public/mediapipe  MediaPipe Tasks Vision (nhận dạng dáng người khi live mặc thử áo)
// Chạy tự động trước "dev" và "build" (xem package.json). Hai thư mục này không đưa vào git.
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

function copy(fromDir, files, to) {
  const out = join(pub, to)
  mkdirSync(out, { recursive: true })
  for (const f of files) copyFileSync(join(fromDir, f), join(out, f))
}

// gói không cho resolve package.json; file chính nằm sẵn trong dist/
copy(
  dirname(require.resolve('onnxruntime-web')),
  ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'],
  'ort'
)
copy(
  join(dirname(require.resolve('@mediapipe/tasks-vision')), 'wasm'),
  [
    'vision_wasm_internal.js',
    'vision_wasm_internal.wasm',
    'vision_wasm_nosimd_internal.js',
    'vision_wasm_nosimd_internal.wasm',
  ],
  'mediapipe'
)
console.log('Đã chép onnxruntime-web và MediaPipe vào public/')
