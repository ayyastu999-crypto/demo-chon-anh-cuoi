# Demo app chọn ảnh cưới — chạy và dùng thử

App demo cho khách chọn ảnh cưới, ảnh lấy thẳng từ thư mục Google Drive. Dựng 26/10/2026 từ nội dung
slide "App chọn ảnh cho studio cưới" (giai đoạn 1 của lộ trình).

## Chạy

```bash
npm install
npm start
```

Mở http://localhost:5193 (đổi cổng bằng biến `PORT`). Trong Claude Code: preview `demo-chon-anh-cuoi`.

## Dùng thử

1. Trên Drive, chia sẻ thư mục ảnh ở chế độ **"Bất kỳ ai có đường liên kết đều xem được"**.
   Thư mục con (vd "Phim trường", "Tiệc") thành nhóm ảnh riêng — chỉ đọc một tầng.
2. Trang studio: dán link thư mục, tên cô dâu & chú rể (có "&" ở giữa), ngày cưới, lời nhắn, hạn mức từng khổ → **Tạo album**.
3. **Chép link khách** → mở trên điện thoại: thiệp chào → lưới ảnh → bấm ảnh để xem lớn, gắn khổ in → **✓ Chọn xong**.
4. Studio bấm **Xem kết quả**: danh sách tên file tất cả ảnh đã chọn và theo từng khổ, có nút chép.

## Cách hoạt động

- Đọc thư mục qua trang `drive.google.com/embeddedfolderview?id=…` — **không cần API key**, nhưng chỉ đọc được thư mục công khai.
  Google đổi giao diện trang này thì phải sửa bộ đọc trong `lib/drive-folder-reader.js`.
- Ảnh **đi qua máy chủ của app** (`/anh/nho/<mã>` 600px, `/anh/lon/<mã>` 2000px): máy chủ tải hộ từ Google, tối đa 4 ảnh cùng lúc,
  bị giới hạn (429) thì chờ rồi thử lại, rồi lưu ở `data/cache-anh/`. Lý do: trình duyệt gọi thẳng Google thì album hơn nghìn ảnh
  bị Google từ chối hàng loạt (đã gặp 26/10). Route chỉ phục vụ ảnh thuộc album trong app. Cache cỡ ~60 KB/ảnh nhỏ — xoá thư mục là tải lại.
- Dữ liệu album nằm trong `data/albums.json` (không có cơ sở dữ liệu).
- Khách chọn vượt hạn mức vẫn lưu được; giao diện báo đỏ để studio báo phí in thêm.

## Trang chủ quản lý dự án (studio)

- Thẻ số liệu: số album, ảnh gốc, khách chọn xong chờ chỉnh, sắp hết hạn lưu (bấm để lọc).
- Lọc theo 8 trạng thái: Chờ khách chọn → Khách đã chọn xong → Đang chỉnh ảnh → Chờ khách duyệt → Khách đã duyệt → Đang in →
  Có hình – báo khách lấy → Đã giao khách. Mỗi thẻ có ô chọn trạng thái + nút → sang bước kế.
- Chuyển sang **Chờ khách duyệt** mà chưa có hạn lưu thì tự đặt hạn lưu +30 ngày. Thẻ hiện "Còn N ngày", ≤ 7 ngày đổi màu.
- Từ **Đang chỉnh ảnh** trở đi, khách chỉ xem, không sửa lựa chọn được (máy chủ chặn, trang khách báo đã khoá). Quá hạn lưu → trang khách báo hết hạn.
- **Báo khách**: chép tin nhắn soạn sẵn theo trạng thái rồi mở `zalo.me/<SĐT>` để dán (chưa tự gửi).
- Gỡ album chỉ xoá bản ghi trong app, không đụng Drive.

## Ghim góp ý trên ảnh (giai đoạn 3, phần 1 — 26/10/2026)

- Khách: trong ảnh lớn bấm **Ghim lên ảnh** rồi chạm đúng chỗ cần sửa (đánh số ①②③), hoặc **Góp ý chung** cho cả ảnh.
  Hỏi tên một lần (nhớ trên máy khách, `localStorage` khoá `ten-khach-cuoi`). Ô ảnh ngoài lưới hiện số góp ý.
  Khách xoá được góp ý phía khách khi studio chưa xử lý. Góp ý được cả khi lựa chọn đã khoá (để góp ý ảnh đã chỉnh); hết hạn lưu thì không.
- Studio: nút **Góp ý** trên thẻ album (số đỏ = chờ xử lý) → ngăn bên phải: ảnh nhỏ có chấm ghim, trả lời ngay dưới góp ý, tick **Đã xử lý**.
  Khách hỏi tiếp dưới một góp ý đã xử lý → tự mở lại.
- Dữ liệu: `album.gopY[]` trong `data/albums.json` — toạ độ x, y tỉ lệ 0–1 (null = cả ảnh), trả lời 1 tầng. Code: `lib/gop-y-routes.js`,
  `public/khach-gop-y.js`, `public/studio-gop-y.js`.
- Thử nghiệm không đụng dữ liệu thật: `DATA_DIR=<thư mục tạm> PORT=5194 node server.js` (dữ liệu, tài khoản, cache riêng).

## So sánh trước/sau + khách duyệt (giai đoạn 3, phần 2 — 26/10/2026)

- Studio: chỉnh xong thì **Sửa album → dán "Link thư mục ảnh đã chỉnh"** (để trống = gỡ). Quét lại Drive đọc cả thư mục này.
- App ghép ảnh đã chỉnh ↔ ảnh gốc **theo tên file** (bỏ đuôi, chữ thường; không thấy thì bỏ hậu tố sau `_`/`-` cuối, vd `_PTP6853_1.jpg` → `_PTP6853`).
  Thử thật: 29/30 ảnh ghép được. Code: `lib/anh-da-chinh-va-nguoi-chon.js` (`ghepTruocSau`).
- Khách: tab **Ảnh đã chỉnh** (tự mở khi album ở bước duyệt) → ảnh lớn → **So sánh trước / sau**: kéo trên ảnh hoặc thanh trượt; góp ý được trên ảnh đã chỉnh.
  Album ở trạng thái **Chờ khách duyệt** thì có nút **Duyệt ảnh đã chỉnh** → trạng thái sang **Khách đã duyệt**.

## Cô dâu, chú rể chọn riêng (giai đoạn 3, phần 3 — 26/10/2026)

- Lần đầu bấm Chọn, app hỏi **Cô dâu / Chú rể / Người nhà** (nhớ trên máy, `localStorage` khoá `nguoi-chon-cuoi`; đổi bằng nút "Bạn: …").
  Người nhà chỉ xem và góp ý, không chọn được.
- Lưu `album.chonBoi = { <mã ảnh>: ['co-dau','chu-re'] }`; `album.chon` vẫn là lựa chọn **gộp** (studio in/chỉnh theo đây). Một người bỏ chọn mà
  người kia còn chọn thì ảnh vẫn ở lại. Gắn khổ in = người đó cũng chọn ảnh.
- Khách thấy huy hiệu **D / R** trên ảnh, viền vàng khi cả hai cùng chọn, tab **Cả hai chọn / Một người chọn**.
- Studio: **Kết quả** có mục "Theo người chọn" — cả hai / chỉ cô dâu / chỉ chú rể / chưa rõ (lựa chọn có từ trước khi có tính năng này).

## Nhạc nền

`public/nhac/nhac-cuoi-mac-dinh.mp3` — bài piano + dây không lời, tạo bằng AI (Google Lyria 3 Pro) ngày 26/10/2026 để tránh bản quyền
nhạc trend. Tự phát khi mở trang; trình duyệt chặn phát tiếng khi khách chưa chạm → lần chạm / bấm phím đầu tiên bất kỳ đâu sẽ bật.
Nút loa góc trên để tắt, nhớ lựa chọn trên máy khách (đã tắt thì không tự bật lại).
Album có thể dùng link mp3 riêng (ô "Nhạc nền" khi sửa album) — studio tự chịu trách nhiệm bản quyền bài đó.

## Đăng nhập + chạy trên internet (26/10/2026)

- Địa chỉ công khai: **https://chonanhcuoi.ayyastudio.vn** — đi qua Cloudflare Tunnel **dùng chung** với PhotoShare
  (`C:\Users\PC\.cloudflared\config.yml`, thêm một dòng ingress → `http://127.0.0.1:5193`; bản sao lưu `config.yml.bak-261026`).
  Khởi động lại tunnel là anh.ayyastudio.vn cũng chớp mất vài giây.
- App chỉ nghe `127.0.0.1` (đổi bằng `HOST=0.0.0.0` nếu muốn mở trong wifi studio). Tin địa chỉ khách từ tunnel qua `trust proxy = loopback`.
- Trang studio cần đăng nhập. Đặt/đổi tài khoản: `npm run dat-mat-khau` (mật khẩu ≥ 10 ký tự, băm scrypt, lưu `data/tai-khoan-studio.json`;
  đổi mật khẩu là đăng xuất mọi máy). Cookie phiên ký HMAC, khoá ở `data/khoa-phien.txt`, sống 30 ngày, HttpOnly + SameSite=Lax (+ Secure qua https).
  Sai 5 lần / 15 phút thì khoá địa chỉ đó 15 phút (tính trong bộ nhớ — khởi động lại app là mở khoá).
- Lệnh ghi (POST/PATCH/DELETE) gửi từ trang có Origin khác bị chặn.
- Vào bằng `http://` qua tunnel → chuyển 301 sang `https://`, kèm HSTS 180 ngày.
- **Cloudflare ép đệm 4 tiếng cho .js/.css.** Máy chủ tự gắn `?v=<mốc sửa file>` vào mọi link JS/CSS khi gửi trang (`guiTrang` trong
  `server.js`), nên sửa file là khách nhận bản mới ngay — không cần tăng số phiên bản bằng tay. Thêm file JS/CSS mới thì cứ nhúng bằng
  đường dẫn `/ten-file.js` trong HTML, máy chủ tự gắn.
- Sửa code xong: bấm đúp `scripts/win-autostart/khoi-dong-lai-app.cmd` — chỉ tắt tiến trình đang nghe 127.0.0.1:5193 rồi bật lại,
  không đụng tunnel hay PhotoShare. Từ phiên Claude chạy được bằng `powershell Start-Process explorer.exe -ArgumentList '<đường dẫn .cmd>'`
  (tiến trình thuộc explorer nên không chết theo phiên).
- Tự chạy: bấm đúp `scripts/win-autostart/cai-tu-chay.cmd` **một lần** (đặt file vào thư mục Startup, bật app, khởi động lại tunnel).
  Không chạy được từ trong phiên Claude: Norton chặn ghi vào Startup và app Claude ảo hoá AppData. Log app: `data/app.log`.

## Giới hạn của bản demo

- Một tài khoản studio duy nhất, chưa phân quyền nhân viên.
- Chưa có: Zalo tự gửi tin, ghim góp ý trên ảnh, so sánh trước/sau, nhiều người cùng chọn, AI.
- Giao diện tông đỏ rượu vang, kem; font Cormorant Garamond + Be Vietnam Pro (Google Fonts).
