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

## Gói và trang đặt hàng

| Gói     | Món         | Combo                                                 | Trang                          |
| ------- | ----------- | ----------------------------------------------------- | ------------------------------ |
| Basic   | Áo thun     | Combo 1 (trơn), Combo 2 (in sẵn hoạ tiết đen trắng)   | `/basic/ao` (`?combo=combo-2`) |
| Basic   | Túi tote    | Combo 1, Combo 2                                      | `/basic/tui`                   |
| Premium | Chỉ áo thun | Áo trơn + bộ tự in lụa (khuôn, dao gạt mực, chai mực) | `/premium`                     |

Basic ép nhiệt sticker (sticker chọn và tính tiền riêng), Premium in lụa. Link cũ `/combo/...` tự chuyển sang trang mới.

Ở gói Basic, khách có thể tự tải tối đa 5 sticker của mình (tính tiền theo hình). Có hình tự tải lên thì phải tick
đồng ý và ký tên vào cam kết miễn trừ trách nhiệm bản quyền; đơn hàng lưu phiên bản, toàn văn cam kết, tên người ký,
thời điểm, IP và trình duyệt. Nội dung cam kết nằm ở `frontend/src/data/consent.js` và `backend/lib/consent.js`
(phải sửa cả hai và đổi phiên bản). Đây là bản nháp, nên nhờ người có chuyên môn pháp lý xem lại. Hình chưa gắn vào đơn
tự xoá sau 24 giờ.

Hình tải lên được tự tách nền ngay trên trình duyệt (`frontend/src/data/removeBackground.js`): ảnh đã trong suốt giữ
nguyên; nền trơn tách bằng cách loang màu từ mép (có thanh độ nhạy); ảnh chụp / nền nhiều màu dùng mô hình AI
U²-Netp (`frontend/public/models/u2netp.onnx`, giấy phép Apache-2.0) chạy bằng onnxruntime-web (MIT) trong Web Worker.
Khách có thể chọn lại "Ảnh gốc" nếu tách chưa ưng. File chạy onnxruntime được chép vào `frontend/public/ort` khi build.

**Phối thử** (gói Basic) mở trình phối toàn màn hình kiểu Canva (`frontend/src/components/DesignStudio.jsx`): thanh
công cụ trái gồm Sản phẩm (đổi áo / túi, Combo 1 / 2, màu túi), Thư viện (các bộ sticker; dùng sticker của bộ nào thì bộ
đó được thêm vào đơn), Tải lên (ảnh của khách, chọn Tách nền / Giữ ảnh gốc) và Lớp (sắp xếp kéo thả, ẩn, khoá, nhân bản,
xoá). Trên áo đặt sticker ở đâu cũng được, có đường căn giữa, kéo / đổi cỡ / xoay bằng tay nắm, hai ngón trên điện thoại, hoàn tác /
làm lại (Ctrl+Z / Ctrl+Y), tải mockup PNG. Bản phối lưu trong sessionStorage; khi đặt hàng, đơn lưu bản phối (thứ tự lớp,
vị trí, cỡ, góc xoay, nguồn sticker) và ảnh mockup PNG để studio biết vị trí ép.

**Live mặc thử áo** (nút trên trang đặt áo và trong trình phối, chỉ với áo): mở camera, nhận dạng dáng người bằng
MediaPipe Pose Landmarker lite (`frontend/public/models/pose_landmarker_lite.task`, Apache-2.0, ~5,5 MB) chạy bằng
`@mediapipe/tasks-vision` (Apache-2.0) ngay trên trình duyệt; hình camera không gửi đi đâu. Khung người hướng dẫn nhắc lùi
xa / lại gần / đứng giữa; đứng đủ đầu, vai, hông trong khung khoảng nửa giây thì áo (ảnh `ao-trang-cat.png` đã cắt nền +
bản phối) được bẻ lưới theo vai và hông (`frontend/src/data/garmentFit.js`) để ướm lên người, có chụp ảnh và đổi camera.
Hiệu ứng "2.5D": áo uốn theo thân hình trụ và xoay theo độ sâu hai vai (bên xa co lại), có nếp vải và bóng hai bên sườn;
tay đưa ra trước người được vẽ lại từ camera lên trên áo, giới hạn bằng mặt nạ tách người của MediaPipe.
Áo 3D (mặc định khi trình duyệt có WebGL2): lưới áo thun dựng bằng code (`frontend/src/data/tryOn3d.js`, không dùng file
mô hình), vẽ bằng Three.js (MIT, chỉ tải khi mở live, ~121 KB gzip). Áo gắn theo vai, thân, hông và bắp tay (tay áo theo
tay, xoay người thì áo xoay theo độ sâu của worldLandmarks), có ánh sáng theo độ sáng khung hình, nếp vải (normal map vẽ
bằng code), bóng mềm; bản phối in lên ngực theo đúng toạ độ ảnh áo phẳng. Cẳng tay, bàn tay và cổ thật được vẽ đè lên áo
nhờ các khối chỉ ghi độ sâu. Không có mô phỏng vải. Nút 2D / 3D trong live; máy không có WebGL2 hoặc áo 3D chạy dưới
20 khung hình/giây thì tự chuyển sang áo 2.5D ở trên. Khi chạy dev có thể thử bằng dáng người giả lập qua
`window.__tryOnFakePose` (xem `LiveTryOn.jsx`).

![Live mặc thử áo 3D (người mẫu vẽ giả lập)](docs/screenshots/live-ao-3d.png)
File chạy MediaPipe được chép vào `frontend/public/mediapipe` khi dev / build (`frontend/scripts/copy-vendor.mjs`).

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
| POST        | /api/combos        | Tạo combo (cần header `x-admin-token`)            |
| GET / PATCH | /api/combos/:slug  | Xem / sửa 1 combo (sửa cần `x-admin-token`)       |
| POST        | /api/orders        | Đặt áo / túi: kiểm tra, tính lại giá, lưu đơn     |
| POST        | /api/uploads       | Tải 1 sticker khách tự làm (PNG/JPG/WebP ≤ 4 MB)  |
| GET         | /api/uploads/:id   | Xem sticker khách gửi (cần `x-admin-token`)       |
| POST        | /api/auth/register | Đăng ký (họ tên, email, SĐT, mật khẩu ≥ 8 ký tự)  |
| POST        | /api/auth/login    | Đăng nhập, đặt cookie phiên `tl_session` (7 ngày) |
| POST        | /api/auth/logout   | Đăng xuất                                         |
| GET         | /api/auth/me       | Người dùng đang đăng nhập (hoặc `null`)           |

Mật khẩu được băm bằng bcrypt; phiên đăng nhập là JWT trong cookie httpOnly. Cần đặt `JWT_SECRET` trong `backend/.env.local`.
API tạo / sửa combo chỉ chạy khi gửi header `x-admin-token` trùng biến `ADMIN_TOKEN`; để trống `ADMIN_TOKEN` thì các API này bị khoá.

## Triển khai (GitHub + Vercel + MongoDB Atlas)

Code đưa lên GitHub, Vercel tự build mỗi lần push. Tạo **2 project Vercel từ cùng một repo**: một cho `backend` (API), một cho `frontend` (web).
Trình duyệt chỉ gọi domain frontend; `frontend/vercel.json` chuyển `/api/*` sang backend nên cookie đăng nhập vẫn hoạt động.

### 1. Đưa code lên GitHub

Tạo repo mới (nên để **Private**) trên github.com, không tick tạo README. Rồi chạy ở thư mục gốc:

```bash
git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
git push -u origin main
```

File `.env.local` đã nằm trong `.gitignore`, không bị đẩy lên.

### 2. Tạo database MongoDB Atlas (miễn phí)

1. Vào https://www.mongodb.com/cloud/atlas, tạo cluster **M0 (Free)**.
2. Database Access: tạo user + mật khẩu.
3. Network Access: thêm `0.0.0.0/0` (Vercel không có IP cố định).
4. Connect → Drivers: chép chuỗi kết nối, thêm tên database `tumlum`, ví dụ
   `mongodb+srv://user:matkhau@cluster0.xxxxx.mongodb.net/tumlum?retryWrites=true&w=majority`.
5. Nạp 3 combo vào Atlas từ máy của bạn:

```bash
MONGODB_URI="mongodb+srv://..." npm run seed:remote -w backend
```

PowerShell:

```powershell
$env:MONGODB_URI="mongodb+srv://..."; npm run seed:remote -w backend; Remove-Item Env:MONGODB_URI
```

### 3. Deploy backend (API) trên Vercel

Vercel → Add New → Project → chọn repo → **Root Directory: `backend`** (Framework: Next.js). Thêm Environment Variables:

| Biến              | Giá trị                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `MONGODB_URI`     | chuỗi kết nối Atlas ở bước 2                                            |
| `JWT_SECRET`      | chuỗi ngẫu nhiên dài (vd. `openssl rand -base64 32`)                    |
| `FRONTEND_ORIGIN` | domain frontend, vd. `https://tum-lum.vercel.app` (cập nhật sau bước 4) |
| `ADMIN_TOKEN`     | (tuỳ chọn) mã bí mật để tạo / sửa combo qua API                         |

Deploy xong, mở `https://<domain-backend>/api/health` để kiểm tra kết nối database.

### 4. Deploy frontend (web) trên Vercel

1. Mở `frontend/vercel.json`, đặt domain backend thật ở bước 3 (hiện là `https://t-m-lum.vercel.app`), commit và push.
2. Vercel → Add New → Project → cùng repo → **Root Directory: `frontend`** (Framework: Vite). Không cần biến môi trường
   (để trống `VITE_API_URL`).
3. Deploy xong, đặt `FRONTEND_ORIGIN` của backend bằng domain frontend rồi Redeploy backend.

Mỗi lần `git push` lên nhánh `main`, Vercel tự build lại cả hai. Nếu bước cài đặt trên Vercel báo lỗi do repo dùng
npm workspaces, vào Settings → Build and Deployment của project đó, đặt Install Command là `cd .. && npm install`.

## Còn thiếu

- Giá bộ sticker, phí vận chuyển và mã giảm giá thật. Bảng giá nằm ở `frontend/src/data/pricing.js` và `backend/lib/pricing.js` (phải sửa cả hai).
- Địa chỉ, giờ mở cửa, kênh liên hệ.
- Kho sticker thật, trang quản lý đơn hàng, cổng thanh toán thật.
- Quên mật khẩu / xác minh email.
