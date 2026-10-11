import mongoose from 'mongoose'

// Dùng chung 1 kết nối giữa các lần hot-reload / các request.
let cached = globalThis._mongoose ?? (globalThis._mongoose = { conn: null, promise: null })

export async function connectDB() {
  if (cached.conn) return cached.conn
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env.local')
  cached.promise ??= mongoose.connect(uri, { bufferCommands: false })
  cached.conn = await cached.promise
  return cached.conn
}
