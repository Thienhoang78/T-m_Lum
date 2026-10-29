/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // trừ ảnh live mặc thử /api/tryon/<mã>: widget Anywear ở tên miền khác cần đọc được (route tự đặt CORS "*")
        source: '/api/:path((?!tryon/).*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ]
  },
}
export default nextConfig
