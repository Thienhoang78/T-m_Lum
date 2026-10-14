import { createReadStream, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// File chạy của onnxruntime-web (dùng cho tách nền sticker bằng AI).
// Bản build: scripts/copy-ort.mjs chép vào public/ort. Khi dev: phục vụ thẳng từ node_modules, vì Vite
// không cho import động file .mjs nằm trong /public (thêm ?import rồi báo lỗi).
const ortDist = dirname(createRequire(import.meta.url).resolve('onnxruntime-web'))
function serveOrt() {
  return {
    name: 'serve-onnxruntime',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = req.url?.match(/^\/ort\/(ort-wasm-simd-threaded\.(?:wasm|mjs))(?:\?.*)?$/)
        const file = m && join(ortDist, m[1])
        if (!file || !existsSync(file)) return next()
        res.setHeader('Content-Type', m[1].endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        createReadStream(file).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveOrt()],
  base: '/',
  server: {
    port: 5173,
    // Gọi /api/* sẽ được chuyển sang backend Next.js khi chạy dev
    proxy: { '/api': 'http://localhost:3001' },
  },
})
