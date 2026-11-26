# Tùm Lum Studio

Web bán bộ kit DIY "Tùm Lum Studio DIY Kits": áo thun / túi tote trắng kèm sticker in chuyển nhiệt.

```
frontend/   React + Vite: trang chủ (bảng giá bộ kit, tự tạo hình, 3 bước, đăng ký/đăng nhập, footer), trang đặt hàng
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

## Ảnh sản phẩm và logo

Ảnh áo và túi thật của studio (gốc 736 px, đã cắt nền bằng Python + Pillow / NumPy / SciPy, lưu WebP có nền trong suốt) nằm ở
`frontend/public/images/`: `ao-trang.webp` (ảnh sản phẩm, đã lấp phần cổ), `ao-trang-cat.webp` (khoét vùng cổ, dùng cho
live mặc thử), `tui-trang.webp`, `tui-trang-treo.webp` (cắt sát, dùng ở thanh treo trang chủ). Điểm neo áo
(`TEE_ANCHORS`), tỉ lệ thân / khung (`bodyFrac`), tâm, vùng cổ mặt sau (`backNeck`) theo ảnh mới, xem `products.js`.
Logo ở `frontend/public/brand/`: `logo-128/320/640.webp`, `favicon-32/48.png` (đám mây trong logo), `apple-touch-icon.png`,
`og-image.jpg` (ảnh chia sẻ 1200×630). File logo gốc 4725 px không đưa vào repo.

## Trang chủ sinh động

Trang chủ (`frontend/src/pages/Landing.jsx`, kiểu ở `frontend/src/landing.css`) chỉ dùng CSS, Pointer Events và
IntersectionObserver, không thêm thư viện: cảnh áo + túi tote đung đưa trên thanh treo, mỗi vài giây một bộ sticker bay tới
"ép nhiệt" lên (nảy, loé sáng, hơi nước) rồi bóc ra đổi bộ khác, rê chuột thì cảnh nghiêng theo (áo và túi đều trắng);
sticker quanh đầu trang kéo thả được; ruy băng khẩu hiệu; thẻ giá nghiêng theo chuột, viên giá có vệt sáng; thẻ tấm sticker
mua thêm; mục tự tạo hình, ba bước có cảnh động và mục "Về Tùm Lum Studio" (trang riêng `/ve-chung-toi`). Bật "giảm chuyển động" trong hệ điều hành thì trang đứng yên.

## Bộ kit và trang đặt hàng

Theo bảng giá của studio (`docs/screenshots/trang-chu-bang-gia.png`):

| Bộ kit                      | Món      | Combo                                                                                        | Giá     | Trang                          |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------- | ------- | ------------------------------ |
| 1. Cơ bản – in chuyển nhiệt | Áo thun  | Combo 1: áo trơn + 1 bộ sticker (tự chọn); Combo 2: áo nền/hoạ tiết đen trắng + 1 bộ sticker | 299.000 | `/basic/ao` (`?combo=combo-2`) |
| 1. Cơ bản – in chuyển nhiệt | Túi tote | như áo                                                                                       | 219.000 | `/basic/tui`                   |

Áo và túi đều màu trắng. Bộ kit cao cấp in lụa đã ngừng bán: `/premium` chuyển về trang chủ, API không trả về và từ chối
đơn mới (đơn cũ giữ nguyên). **Combo 1: khách chọn đúng 1 trong 3 cách làm sticker**: tự vẽ, tải hình của mình (ký cam kết bản quyền) hoặc 1 bộ
sticker có sẵn của shop (`PRICING.choices`); trình phối chỉ hiện công cụ của cách đã chọn, server kiểm tra đúng 1 cách.
Combo 2 kèm 1 bộ sticker của shop, khách chọn bộ (mặc định bộ đầu tiên). **Sticker không tính tiền riêng** (bộ đi kèm, hình tự tải lên, hình vẽ
tay đã gồm trong giá combo). Mua thêm **tấm sticker A5 20.000₫ / A4 30.000₫** ở mọi combo: Combo 1 in lại đúng nội dung đã chọn theo khổ;
Combo 2 mặc định in bộ đi kèm, đổi sang bộ khác của shop cho từng khổ được (đơn lưu `choice`, `sheets`, `sheetSets`). **Phí giao** theo tỉnh
(34 tỉnh, thành sau sắp xếp 2025, bảng `PROVINCES`): Đà Nẵng 15.000₫, miền Trung 20.000₫, tỉnh khác 25.000₫, miễn phí
cho đơn từ 500.000₫ hoặc **trong bán kính 3 km quanh studio** (xem dưới); nhận tại studio không tính phí. Sticker thư viện có **cỡ in cố định** (chỉ đổi vị trí, góc xoay);
hình tự tải lên / hình vẽ đổi cỡ được, tối đa **khổ A4** (thang cỡ: ngang ngực áo tính 44 cm cho khung A4 cân đối, `widthCm` trong
`frontend/src/data/products.js`; mặt túi 35 cm).

**Bộ sticker của shop**: Bộ Ăn vặt (25 sticker) và Bộ Giáng sinh (21 sticker), cắt từ tấm A4 gốc
`print/sticker-sets/<bộ>/sheet.png` (giữ nguyên để in; từng sticker đủ độ phân giải nền trong suốt nằm cạnh tấm). Chạy
`python scripts/stickers/build_sets.py` (Pillow, numpy, scipy) để cắt lại và tạo ảnh WebP cho web
(`frontend/public/stickers/`), `frontend/src/data/stickerCatalog.json` và `backend/lib/stickerCatalog.json`. Cỡ in của
mỗi sticker lấy theo cỡ thật trên tấm A4 (21 × 29,7 cm). Thêm bộ mới: đặt tấm vào `print/sticker-sets/<khoá>/sheet.png`,
thêm tên bộ và tên từng sticker vào `SETS` trong script rồi chạy lại; không cần nạp lại database.
Trình phối luôn hiện **khung in khổ A4 nét đứt** (theo thang cỡ `widthCm`) trên từng mặt (dọc 21 × 29,7 cm hoặc ngang): sticker, hình
tải lên, hình vẽ chỉ nằm trong khung; vị trí khung ở `printArea` (`frontend/src/data/products.js`), khung từng mặt gửi
kèm đơn (`printFrame`). Khung không có trong ảnh mockup.
**Phối thử có mặt trước / mặt sau** (mặt sau áo dựng từ ảnh mặt trước, túi dùng lại ảnh); đơn hàng gửi kèm mockup cả hai mặt. Nội dung combo nằm
ở `COMBO_COPY` (`frontend/src/data/combos.js`), quy tắc ở `PRICING.chooseIncluded` / `PRICING.uploads` (hai file
pricing). Hình minh hoạ bộ kit cắt từ bảng giá: `frontend/public/images/kits/`. Link cũ `/combo/...` tự chuyển sang trang mới.

Tính năng **tự tạo hình** (tải hình của bạn lên in thành sticker, hoặc vẽ tay) **chỉ có ở Combo 1** của áo và túi; Combo 2
ẩn phần tải hình / vẽ (cả trong trình phối), server cũng từ chối đơn có hình tự tải lên ở các combo khác.

**Vẽ tay lên áo / túi** (tab **Vẽ** trong trình phối, chỉ Combo 1): bút mực, bút kim, bút dạ (trong mờ, chỉnh độ đậm),
bút chì (có hạt), tẩy; mỗi bút một cỡ, bảng màu + chọn màu khác, hoàn tác / làm lại từng nét, xoá hết. Nét mượt và theo
lực nhấn của bút cảm ứng nhờ `perfect-freehand` (MIT); chỉ vẽ được trong thân áo (theo ảnh áo đã cắt nền) hoặc thân túi;
trên điện thoại không cuộn / phóng trang khi vẽ, chạm hai ngón không để lại nét. Bấm Xong thì hình vẽ thành một lớp (kéo,
đổi cỡ, xoay, sắp lớp như sticker; "Sửa hình vẽ" để vẽ tiếp). Mỗi hình vẽ được xuất PNG nền trong suốt (khung 1600 px), tải
lên và tính như một hình tự tải lên (cùng giá, cùng cam kết bản quyền). Mã: `frontend/src/data/drawing.js`,
`frontend/src/components/DrawingTools.jsx`.

![Vẽ tay lên áo trong trình phối](docs/screenshots/ve-tay-tren-ao.png)

Ở Combo 1, khách có thể tự tải tối đa 5 sticker của mình (tính tiền theo hình). Có hình tự tải lên thì phải tick
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

**Live mặc thử áo** (nút trên trang đặt áo và trong trình phối, chỉ với áo) dùng widget **Anywear** của Decart
(`frontend/src/data/anywear.js`): AI của Decart dựng lại hình khách đang mặc đúng chiếc áo theo thời gian thực. Bấm nút
thì widget mở camera ngay tại chỗ (trong trình phối thì widget nằm trong hộp thoại trình phối, trình phối vẫn mở; đóng
trình phối thì widget được trả về trang); ảnh mặt trước áo kèm bản phối (JPEG 1000 px, nền trắng) được lưu tạm qua
`POST /api/tryon` (tự xoá sau 1 giờ, link công khai khó đoán) rồi gửi link vào widget. Mặt trước chưa có hình / chữ thì
nhắc thêm trước. **Hình camera của khách được gửi lên máy chủ Decart** (xem chính sách riêng tư của Decart). Nút nổi
mặc định của widget bị ẩn (`products.css`), chỉ mở bằng nút của trang. Cần đăng ký tên miền tại
https://anywear.decart.ai/business (gói miễn phí chỉ để dùng thử; mở cho mọi khách thì liên hệ Decart). Cách gửi ảnh vào
widget theo giao thức nội bộ của widget (không có tài liệu), Decart đổi widget thì có thể phải sửa `anywear.js`. Ở
localhost máy chủ Decart có thể không tải được ảnh áo, nên thử trên tên miền thật. Biến `VITE_ANYWEAR_DOMAIN` (frontend): tên
miền đã đăng ký (trống = tên miền đang chạy), `off` = tắt Anywear.

Không tải được widget (bị chặn, mất mạng) hoặc `VITE_ANYWEAR_DOMAIN=off` thì nút Live dùng **áo 3D tự làm** (`LiveTryOn.jsx`,
chạy hẳn trên máy khách): mở camera, nhận dạng dáng người bằng MediaPipe Pose Landmarker lite (`frontend/public/models/pose_landmarker_lite.task`, Apache-2.0, ~5,5 MB) chạy bằng
`@mediapipe/tasks-vision` (Apache-2.0) ngay trên trình duyệt; hình camera không gửi đi đâu. Khung người hướng dẫn nhắc lùi
xa / lại gần / đứng giữa; đứng đủ đầu, vai, hông trong khung khoảng nửa giây thì áo (ảnh `ao-trang-cat.webp` đã cắt nền +
bản phối) được bẻ lưới theo vai và hông (`frontend/src/data/garmentFit.js`) để ướm lên người, có chụp ảnh và đổi camera.
Hiệu ứng "2.5D": áo uốn theo thân hình trụ và xoay theo độ sâu hai vai (bên xa co lại), có nếp vải và bóng hai bên sườn;
tay đưa ra trước người được vẽ lại từ camera lên trên áo, giới hạn bằng mặt nạ tách người của MediaPipe.
Áo 2.5D (ảnh áo thật) là chế độ **mặc định** vì trông giống ảnh chụp nhất; thêm cho thật (`frontend/src/data/tryOnRealism.js`):
đo bề ngang thân từ mặt nạ người để áo vừa người thật, ánh màu và độ sáng lấy từ cảnh hai bên đầu (không lấy màu áo thật
đang mặc), bóng dưới cổ áo và nách, nếp vải nhích theo khi xoay / nghiêng, mép áo mềm, hạt nhiễu giống camera, cổ / cằm /
tóc phía trên cổ áo nằm trên áo. Live mặc thử chỉ ướm mặt trước.
Áo 3D (chọn ở nút 2D / 3D): lưới áo thun dựng bằng code (`frontend/src/data/tryOn3d.js`, không dùng file
mô hình), vẽ bằng Three.js (MIT, chỉ tải khi mở live, ~121 KB gzip). Áo gắn theo vai, thân, hông và bắp tay (tay áo theo
tay, xoay người thì áo xoay theo độ sâu của worldLandmarks), có ánh sáng theo độ sáng khung hình, nếp vải (normal map vẽ
bằng code), bóng mềm; bản phối in lên ngực theo đúng toạ độ ảnh áo phẳng. Cẳng tay, bàn tay và cổ thật được vẽ đè lên áo
nhờ các khối chỉ ghi độ sâu. Không có mô phỏng vải. Máy không có WebGL2 hoặc áo 3D chạy dưới 20 khung hình/giây thì tự
chuyển về áo 2.5D. Khi chạy dev có thể thử bằng dáng người giả lập qua
`window.__tryOnFakePose` (xem `LiveTryOn.jsx`).

![Live mặc thử áo 3D (người mẫu vẽ giả lập)](docs/screenshots/live-ao-3d.png)
File chạy MediaPipe được chép vào `frontend/public/mediapipe` khi dev / build (`frontend/scripts/copy-vendor.mjs`).

## Miễn phí giao trong bán kính 3 km

Chọn giao tận nơi ở tỉnh của studio (Đà Nẵng) thì trang đặt hàng hiện ô **Miễn phí giao trong bán kính 3 km quanh
studio**. Khách bấm _Ghim vị trí trên bản đồ_: ghim nằm giữa bản đồ, khách kéo bản đồ (chuột, chạm, phím mũi tên) hoặc
bấm _Dùng vị trí của tôi_; hộp thoại báo luôn khoảng cách (đường chim bay) và có được miễn phí không. Bản đồ dùng Leaflet
(BSD-2) + bản đồ OpenStreetMap, không cần API key, chỉ tải khi mở (`frontend/src/components/LocationPicker.jsx`).

Server luôn tính lại khoảng cách từ vị trí ghim (`quote` trong hai file pricing), không tin số tiền từ trình duyệt.
Đơn lưu vị trí ghim và số km (`deliveryGeo`); trang quản lý hiện khoảng cách và link mở Google Maps để studio đối chiếu
với địa chỉ khi gọi xác nhận (khách có thể ghim sai vị trí).

**Cần sửa vị trí studio:** hiện đặt tạm ở Cầu Rồng. Mở Google Maps, nhấp chuột phải vào studio, bấm dòng số
`16.06…, 108.22…` để chép, rồi sửa `STUDIO` (`lat`, `lng`, đổi `placeholder` thành `false`) ở **cả**
`frontend/src/data/pricing.js` và `backend/lib/pricing.js`. Bán kính: `PRICING.freeShipRadiusKm` (cả hai file).
Trang quản lý nhắc khi vị trí còn là vị trí tạm.

## Thanh toán

Khách chọn 1 trong 3 cách ở trang đặt hàng (`PAYMENTS` trong `frontend/src/data/pricing.js`):

| Cách                           | Sau khi đặt                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| Thanh toán khi nhận hàng (COD) | Studio chuyển đơn sang **Hoàn tất** thì trang quản lý tự ghi nhận đã thu đủ tiền            |
| Chuyển khoản ngân hàng         | Hiện **mã VietQR** có sẵn số tiền và nội dung (mã đơn bỏ gạch ngang, vd. `TL251114AB12`)    |
| Ví MoMo / ZaloPay              | Cùng mã VietQR đó: app MoMo / ZaloPay quét được mã VietQR để chuyển vào tài khoản ngân hàng |

Mã VietQR được tạo ngay trên server theo chuẩn EMVCo của NAPAS (`backend/lib/vietqr.js`, thư viện `qrcode`), không gọi
dịch vụ ngoài. Khách thấy mã ở màn hình đặt hàng thành công và ở **trang theo dõi đơn** `/don-hang/<mã đơn>?k=<mã bí mật>`
(link riêng của từng đơn); có nút chép số tài khoản / số tiền / nội dung và nút lưu ảnh QR (PNG) để quét từ thư viện ảnh.
Không có link thì tra cứu ở `/don-hang` bằng mã đơn + số điện thoại đặt hàng; khách đăng nhập thấy luôn các đơn của mình.

**Cài tài khoản nhận tiền** (biến môi trường của backend, thiếu thì không hiện mã QR):

| Biến                | Ví dụ                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `BANK_BIN`          | Mã BIN 6 số của ngân hàng: Vietcombank `970436`, MB `970422`, Techcombank `970407`, ACB `970416` (thêm trong `backend/.env.example`) |
| `BANK_NAME`         | `Vietcombank` (chỉ để hiện cho khách)                                                                                                |
| `BANK_ACCOUNT`      | Số tài khoản                                                                                                                         |
| `BANK_ACCOUNT_NAME` | Tên chủ tài khoản (hiện cho khách đối chiếu)                                                                                         |

**Tự xác nhận khi tiền về (tuỳ chọn, SePay):** không bật thì studio mở đơn trong trang quản lý và bấm _Ghi nhận đã thu_.
Muốn tự động:

1. Đăng ký https://sepay.vn, liên kết tài khoản ngân hàng nhận tiền ở trên.
2. SePay → Webhooks → Thêm webhook: URL `https://<domain-backend>/api/payments/sepay`, sự kiện **Có tiền vào**, kiểu
   chứng thực **API Key**, tự đặt một chuỗi bí mật dài.
3. Đặt cùng chuỗi đó vào biến `SEPAY_API_KEY` của backend rồi Redeploy.

Tiền vào có mã đơn trong nội dung thì đơn tự chuyển sang **Đã thanh toán** (trả thiếu thì **Đã trả một phần**, mã QR hiện
số còn lại) và trang theo dõi đơn của khách tự cập nhật sau vài giây. Tiền vào không có mã đơn nằm ở tab **Giao dịch**
của trang quản lý để gán tay. Webhook chỉ nhận tiền vào đúng `BANK_ACCOUNT`; SePay gửi lại cùng giao dịch thì bỏ qua.
Mỗi giao dịch lưu ở collection `payments`; trạng thái thanh toán của đơn luôn tính lại từ các giao dịch
(`backend/lib/payments.js`).

Cổng thanh toán thẻ / ví trực tiếp (VNPay, MoMo, ZaloPay) cần studio đăng ký tài khoản doanh nghiệp với từng bên, chưa làm.

## Trang quản lý bán hàng (CRM)

`/quan-ly`, chỉ tài khoản có quyền quản lý (role `admin`) vào được; API `/api/admin/*` cũng kiểm tra lại ở server.
Cấp quyền cho một tài khoản **đã đăng ký trên web** rồi đăng xuất, đăng nhập lại:

```bash
npm run make-admin -w backend -- email@cua-ban.com            # database trong backend/.env.local
npm run make-admin -w backend -- email@cua-ban.com --thu-hoi  # thu hồi quyền
MONGODB_URI="mongodb+srv://..." npm run make-admin:remote -w backend -- email@cua-ban.com   # database Atlas
```

Đăng nhập xong, menu tài khoản trên nav có **Trang quản lý (CRM)**. Trang này chỉ tải khi mở (khách mua hàng không phải
tải).

- **Tổng quan**: doanh thu (tiền đã thu), số đơn, giá trị đơn, số khách trong 30 ngày; biểu đồ cột theo ngày (doanh thu /
  số đơn, rê chuột hoặc phím ← → để xem từng ngày, có bảng số liệu); việc cần làm (đơn chờ xác nhận, đơn chuyển khoản
  chưa trả đủ, giao dịch chưa khớp) và khách tới hạn hẹn chăm sóc.
- **Đơn hàng**: tìm theo mã đơn / SĐT / tên, lọc theo trạng thái, thanh toán, phương thức. Chi tiết đơn: sản phẩm, ảnh
  mockup và hình khách tải lên / vẽ, cam kết bản quyền, đổi trạng thái kèm ghi chú nội bộ, ghi nhận thu tiền / hoàn
  tiền, nút gọi / Zalo, link theo dõi đơn để gửi cho khách, nhật ký xử lý.
- **Khách hàng**: mỗi số điện thoại là một khách (khách đặt hàng không cần tài khoản). Hồ sơ tự tạo khi có đơn mới hoặc
  đăng ký tài khoản có số điện thoại; lần đầu mở tab tự dựng từ các đơn cũ (hoặc bấm _Đồng bộ từ đơn hàng_). Lọc nhóm:
  cần chăm sóc, VIP (tổng giá trị đơn từ 1.000.000₫, `VIP_FROM` trong `backend/lib/customers.js`), mua từ 2 lần, mới 30
  ngày, lâu chưa mua, chưa mua; lọc theo nhãn, sắp xếp theo chi tiêu / số đơn. Hồ sơ khách: số đơn, chi tiêu, lịch sử
  đơn, nhãn tự đặt, hẹn chăm sóc lại, ghi chú chăm sóc (ghi chú / gọi điện / nhắn tin / gặp trực tiếp).
- **Giao dịch**: tiền vào chưa khớp đơn (gán vào đơn), hoặc 100 giao dịch gần nhất.

## Lệnh hay dùng

| Lệnh                                       | Việc                             |
| ------------------------------------------ | -------------------------------- |
| `npm run dev`                              | Chạy frontend + backend cùng lúc |
| `npm run dev:web` / `npm run dev:api`      | Chạy riêng từng phần             |
| `npm run build`                            | Build cả hai                     |
| `npm run lint` / `npm run lint:fix`        | Kiểm tra / tự sửa lỗi ESLint     |
| `npm run format`                           | Định dạng code bằng Prettier     |
| `npm run seed`                             | Nạp combo mẫu vào MongoDB        |
| `npm run db:up` / `npm run db:down`        | Bật / tắt MongoDB bằng Docker    |
| `npm run make-admin -w backend -- <email>` | Cấp quyền vào trang quản lý      |

VS Code: mở thư mục gốc, cài các extension được gợi ý (ESLint, Prettier, MongoDB). Code tự format khi lưu.

## API

| Method      | Đường dẫn                        | Mô tả                                                                                    |
| ----------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| GET         | /api/health                      | Kiểm tra kết nối MongoDB                                                                 |
| GET         | /api/combos                      | Danh sách combo đang bán                                                                 |
| POST        | /api/combos                      | Tạo combo (cần header `x-admin-token`)                                                   |
| GET / PATCH | /api/combos/:slug                | Xem / sửa 1 combo (sửa cần `x-admin-token`)                                              |
| POST        | /api/orders                      | Đặt áo / túi: kiểm tra, tính lại giá, lưu đơn; trả mã đơn, mã bí mật theo dõi, mã VietQR |
| GET         | /api/orders/:code                | Khách xem đơn (`?k=<mã bí mật>`, `?phone=<SĐT>` hoặc đăng nhập đúng tài khoản)           |
| GET         | /api/orders/mine                 | Đơn của tài khoản đang đăng nhập                                                         |
| POST        | /api/payments/sepay              | Webhook SePay báo tiền về (header `Authorization: Apikey <SEPAY_API_KEY>`)               |
| GET         | /api/admin/summary               | Tổng quan trang quản lý                                                                  |
| GET         | /api/admin/orders                | Danh sách đơn (`status`, `pay`, `method`, `q`, `page`)                                   |
| GET / PATCH | /api/admin/orders/:code          | Chi tiết đơn / đổi trạng thái, ghi chú nội bộ                                            |
| POST        | /api/admin/orders/:code/payments | Ghi nhận thu tiền / hoàn tiền tay                                                        |
| GET / POST  | /api/admin/customers             | Danh sách khách (`q`, `tag`, `seg`, `sort`, `page`) / đồng bộ từ đơn hàng                |
| GET / PATCH | /api/admin/customers/:phone      | Hồ sơ khách / sửa thông tin, nhãn, hẹn, ghi chú                                          |
| GET         | /api/admin/payments              | Giao dịch (`filter=chua-khop`: chưa khớp đơn)                                            |
| PATCH       | /api/admin/payments/:id          | Gán giao dịch chưa khớp vào đơn                                                          |
| POST        | /api/uploads                     | Tải 1 sticker khách tự làm (PNG/JPG/WebP ≤ 4 MB)                                         |
| GET         | /api/uploads/:id                 | Xem sticker khách gửi (tài khoản quản lý hoặc `x-admin-token`)                           |
| POST        | /api/tryon                       | Lưu tạm ảnh áo cho live mặc thử Anywear (1 giờ)                                          |
| GET         | /api/tryon/:token                | Ảnh áo đó, công khai cho widget (CORS `*`)                                               |
| POST        | /api/auth/register               | Đăng ký (họ tên, email, SĐT, mật khẩu ≥ 8 ký tự)                                         |
| POST        | /api/auth/login                  | Đăng nhập, đặt cookie phiên `tl_session` (7 ngày)                                        |
| POST        | /api/auth/logout                 | Đăng xuất                                                                                |
| GET         | /api/auth/me                     | Người dùng đang đăng nhập (hoặc `null`)                                                  |

Mật khẩu được băm bằng bcrypt; phiên đăng nhập là JWT trong cookie httpOnly. Cần đặt `JWT_SECRET` trong `backend/.env.local`.
API tạo / sửa combo chỉ chạy khi gửi header `x-admin-token` trùng biến `ADMIN_TOKEN`; để trống `ADMIN_TOKEN` thì các API này bị khoá.
API `/api/admin/*` nhận tài khoản quản lý đang đăng nhập hoặc header `x-admin-token`.

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

| Biến                                                         | Giá trị                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `MONGODB_URI`                                                | chuỗi kết nối Atlas ở bước 2                                            |
| `JWT_SECRET`                                                 | chuỗi ngẫu nhiên dài (vd. `openssl rand -base64 32`)                    |
| `FRONTEND_ORIGIN`                                            | domain frontend, vd. `https://tum-lum.vercel.app` (cập nhật sau bước 4) |
| `ADMIN_TOKEN`                                                | (tuỳ chọn) mã bí mật để tạo / sửa combo qua API                         |
| `BANK_BIN`, `BANK_NAME`, `BANK_ACCOUNT`, `BANK_ACCOUNT_NAME` | tài khoản nhận chuyển khoản (mã VietQR), xem mục Thanh toán             |
| `SEPAY_API_KEY`                                              | (tuỳ chọn) bật tự xác nhận chuyển khoản qua webhook SePay               |

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
- Kho sticker thật; cổng thanh toán thẻ / ví trực tiếp (VNPay, MoMo, ZaloPay) cần đăng ký doanh nghiệp.
- Gửi email / Zalo báo trạng thái đơn cho khách (hiện khách xem ở trang theo dõi đơn).
- Quên mật khẩu / xác minh email.
