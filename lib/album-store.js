// Lưu album vào một file JSON (bản demo, không cần cơ sở dữ liệu).
// Ghi qua file tạm rồi đổi tên để mất điện giữa chừng không làm hỏng file đang có.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// DATA_DIR cho phép chạy một bản thử với dữ liệu riêng, không đụng dữ liệu thật
const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'albums.json');

// Các khổ in khách gắn được cho ảnh — đúng thứ tự hiện trên giao diện
const KHO_IN = ['60x120', '60x90', '50x70', '40x60', 'Bìa', 'Bàn', 'Album'];

// 8 trạng thái của một đơn, theo thứ tự. `buoc` = bước tương ứng trên thanh 5 bước phía khách.
// Khách chỉ sửa được lựa chọn khi đơn còn ở bước 1 (chưa sang "Đang chỉnh ảnh").
const TRANG_THAI = [
  { ma: 'cho-chon', ten: 'Chờ khách chọn', buoc: 1 },
  { ma: 'da-chon-xong', ten: 'Khách đã chọn xong', buoc: 1 },
  { ma: 'dang-chinh', ten: 'Đang chỉnh ảnh', buoc: 2 },
  { ma: 'cho-duyet', ten: 'Chờ khách duyệt', buoc: 3 },
  { ma: 'da-duyet', ten: 'Khách đã duyệt', buoc: 3 },
  { ma: 'dang-in', ten: 'Đang in', buoc: 4 },
  { ma: 'bao-lay', ten: 'Có hình – báo khách lấy', buoc: 5 },
  { ma: 'da-giao', ten: 'Đã giao khách', buoc: 5 },
];
const trangThai = ma => TRANG_THAI.find(t => t.ma === ma) || TRANG_THAI[0];

function docTatCa() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { nextId: 1, albums: [] }; }
}

function ghiTatCa(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE + '.tmp', JSON.stringify(db, null, 1));
  fs.renameSync(FILE + '.tmp', FILE);
}

function taoAlbum(info) {
  const db = docTatCa();
  const album = {
    id: db.nextId++,
    token: crypto.randomBytes(16).toString('base64url'),
    createdAt: new Date().toISOString(),
    trangThai: 'cho-chon', // cho-chon | da-chon-xong
    chon: {},               // { <mã ảnh>: ['60x90', 'Album', ...] } — có mặt trong đây nghĩa là đã chọn
    ...info,
  };
  db.albums.unshift(album);
  ghiTatCa(db);
  return album;
}

function timAlbum(dieuKien) {
  return docTatCa().albums.find(dieuKien) || null;
}

// Sửa một album bằng hàm `sua(album)`; trả về album sau khi sửa
function suaAlbum(id, sua) {
  const db = docTatCa();
  const album = db.albums.find(a => a.id === id);
  if (!album) return null;
  sua(album);
  ghiTatCa(db);
  return album;
}

function danhSach() { return docTatCa().albums; }

// Gỡ album khỏi app. Chỉ xoá bản ghi — ảnh trên Google Drive không bị đụng tới.
function xoaAlbum(id) {
  const db = docTatCa();
  const truoc = db.albums.length;
  db.albums = db.albums.filter(a => a.id !== id);
  ghiTatCa(db);
  return db.albums.length < truoc;
}

// Đếm số ảnh đã gắn cho từng khổ
function demTheoKho(album) {
  const dem = Object.fromEntries(KHO_IN.map(k => [k, 0]));
  for (const khos of Object.values(album.chon)) for (const k of khos) if (k in dem) dem[k]++;
  return dem;
}

module.exports = { KHO_IN, TRANG_THAI, trangThai, taoAlbum, timAlbum, suaAlbum, xoaAlbum, danhSach, demTheoKho };
