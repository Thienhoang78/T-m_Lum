import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    // Gọi /api/* sẽ được chuyển sang backend Next.js khi chạy dev
    proxy: { '/api': 'http://localhost:3001' },
  },
})
