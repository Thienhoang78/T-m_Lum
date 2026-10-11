# Tùm Lum Studio

Web bán áo / túi tote in sticker theo mô hình "mua áo trơn → chọn sticker → in ép nhiệt".

```
frontend/   React + Vite: landing page (hero động, 3 bước, 3 combo, đăng ký/đăng nhập, footer)
backend/    Next.js (App Router) API + MongoDB (mongoose)
```

## Cài đặt lần đầu

Cần: Node.js 22 (xem `.nvmrc`), và MongoDB (cài local, dùng Docker, hoặc MongoDB Atlas miễn phí).

```bash
npm install                                  # cài cho cả frontend + backend (npm workspaces)
cp backend/.env.example backend/.env.local   # rồi sửa MONGODB_URI và JWT_SECRET
npm run db:up                                # (tuỳ chọn) chạy MongoDB bằng Docker
npm run seed                                 # nạp 3 combo mẫu
npm run dev                                  # chạy cả 2: web :5173, API :3001
```

Mở http://localhost:5173. Frontend tự chuyển `/api/*` sang backend nên cookie đăng nhập hoạt động khi dev.
Nếu backend chưa chạy, trang vẫn hiện combo mẫu trong `frontend/src/data/combos.js`.

## Lệnh hay dùng

| Lệnh                                  | Việc                             |
| ------------------------------------- | -------------------------------- |
| `npm run dev`                         | Chạy frontend + backend cùng lúc |
| `npm run dev:web` / `npm run dev:api` | Chạy riêng từng phần             |
| `npm run build`                       | Build cả hai                     |
| `npm run lint` / `npm run lint:fix`   | Kiểm tra / tự sửa lỗi ESLint     |
| `npm run format`                      | Định dạng code bằng Prettier     |
| `npm run seed`                        | Nạp combo mẫu vào MongoDB        |
| `npm run db:up` / `npm run db:down`   | Bật / tắt MongoDB bằng Docker    |

VS Code: mở thư mục gốc, cài các extension được gợi ý (ESLint, Prettier, MongoDB). Code tự format khi lưu.

## API

| Method      | Đường dẫn          | Mô tả                                             |
| ----------- | ------------------ | ------------------------------------------------- |
| GET         | /api/health        | Kiểm tra kết nối MongoDB                          |
| GET         | /api/combos        | Danh sách combo đang bán                          |
| POST        | /api/combos        | Tạo combo (chưa có xác thực admin)                |
| GET / PATCH | /api/combos/:slug  | Xem / sửa 1 combo                                 |
| POST        | /api/auth/register | Đăng ký (họ tên, email, SĐT, mật khẩu ≥ 8 ký tự)  |
| POST        | /api/auth/login    | Đăng nhập, đặt cookie phiên `tl_session` (7 ngày) |
| POST        | /api/auth/logout   | Đăng xuất                                         |
| GET         | /api/auth/me       | Người dùng đang đăng nhập (hoặc `null`)           |

Mật khẩu được băm bằng bcrypt; phiên đăng nhập là JWT trong cookie httpOnly. Cần đặt `JWT_SECRET` trong `backend/.env.local`.

## Còn thiếu

- Tên, giá, thành phần thật của 3 combo (đang là nội dung mẫu).
- Địa chỉ, giờ mở cửa, kênh liên hệ.
- Trang chọn sticker, giỏ hàng, đặt hàng, phân quyền admin cho API combo.
- Quên mật khẩu / xác minh email.
