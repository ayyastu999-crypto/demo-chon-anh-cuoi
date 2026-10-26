// Đăng nhập cho trang studio. Trang khách (/a/<token>) không cần đăng nhập — link dài ngẫu nhiên là đủ.
// - Mật khẩu băm bằng scrypt (có sẵn trong Node), lưu ở data/tai-khoan-studio.json — đặt bằng scripts/dat-mat-khau-studio.js.
// - Phiên đăng nhập là cookie có chữ ký HMAC (khoá bí mật tự sinh ở data/khoa-phien.txt), sống 30 ngày.
// - Sai mật khẩu 5 lần trong 15 phút thì khoá địa chỉ đó 15 phút.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE_TK = path.join(DATA, 'tai-khoan-studio.json');
const FILE_KHOA = path.join(DATA, 'khoa-phien.txt');
const COOKIE = 'phien_studio';
const SONG_NGAY = 30;

function khoaPhien() {
  if (!fs.existsSync(FILE_KHOA)) {
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(FILE_KHOA, crypto.randomBytes(32).toString('hex'), { flag: 'wx' });
  }
  return fs.readFileSync(FILE_KHOA, 'utf8').trim();
}
const KHOA = khoaPhien();

function docTaiKhoan() { try { return JSON.parse(fs.readFileSync(FILE_TK, 'utf8')); } catch { return null; } }
const bam = (matKhau, salt) => crypto.scryptSync(String(matKhau), salt, 64).toString('hex');

function datMatKhau(ten, matKhau) {
  const salt = crypto.randomBytes(16).toString('hex');
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(FILE_TK, JSON.stringify({ ten, salt, bam: bam(matKhau, salt), doiLuc: new Date().toISOString() }, null, 1));
}

function dungMatKhau(ten, matKhau) {
  const tk = docTaiKhoan();
  if (!tk || String(ten).trim().toLowerCase() !== tk.ten) return false;
  const a = Buffer.from(bam(matKhau, tk.salt), 'hex'), b = Buffer.from(tk.bam, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- Cookie phiên có chữ ký ----------
const ky = s => crypto.createHmac('sha256', KHOA).update(s).digest('base64url');
function taoPhien(ten) {
  const noiDung = Buffer.from(JSON.stringify({ ten, het: Date.now() + SONG_NGAY * 864e5 })).toString('base64url');
  return `${noiDung}.${ky(noiDung)}`;
}
function docPhien(req) {
  const raw = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [noiDung, chuKy] = raw.slice(COOKIE.length + 1).split('.');
  if (!noiDung || !chuKy) return null;
  const dung = Buffer.from(ky(noiDung)), gui = Buffer.from(chuKy);
  if (dung.length !== gui.length || !crypto.timingSafeEqual(dung, gui)) return null;
  try {
    const p = JSON.parse(Buffer.from(noiDung, 'base64url').toString());
    const tk = docTaiKhoan();
    // Đổi mật khẩu (đổi tài khoản) thì phiên cũ hết hiệu lực
    return p.het > Date.now() && tk && p.ten === tk.ten ? p : null;
  } catch { return null; }
}
function ghiCookie(req, res, giaTri, maxAge) {
  const an = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${giaTri}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${an}`);
}

// ---------- Chống dò mật khẩu ----------
const saiTheoIp = new Map(); // ip → { lan, tu, khoaDen }
function biKhoa(ip) {
  const s = saiTheoIp.get(ip);
  return s && s.khoaDen > Date.now() ? Math.ceil((s.khoaDen - Date.now()) / 60000) : 0;
}
function ghiSai(ip) {
  const now = Date.now(), s = saiTheoIp.get(ip);
  const moi = !s || now - s.tu > 15 * 60000 ? { lan: 1, tu: now, khoaDen: 0 } : { ...s, lan: s.lan + 1 };
  if (moi.lan >= 5) moi.khoaDen = now + 15 * 60000;
  saiTheoIp.set(ip, moi);
}

// Gắn các route đăng nhập + chặn trang/API studio khi chưa đăng nhập
// guiTrangDangNhap: hàm (req, res) gửi trang đăng nhập (server.js gắn sẵn ?v= cho JS/CSS)
function ganXacThuc(app, guiTrangDangNhap) {
  app.get('/dang-nhap', (req, res) => (docPhien(req) ? res.redirect('/') : guiTrangDangNhap(req, res)));
  app.get('/api/dang-nhap/trang-thai', (req, res) => res.json({ daCoTaiKhoan: !!docTaiKhoan() }));

  app.post('/api/dang-nhap', (req, res) => {
    const phut = biKhoa(req.ip);
    if (phut) return res.status(429).json({ loi: `Sai quá nhiều lần. Thử lại sau ${phut} phút.` });
    if (!docTaiKhoan()) return res.status(400).json({ loi: 'Studio chưa đặt mật khẩu. Chạy lệnh đặt mật khẩu trên máy chủ trước.' });
    const { ten, matKhau } = req.body || {};
    if (!dungMatKhau(ten || '', matKhau || '')) { ghiSai(req.ip); return res.status(401).json({ loi: 'Sai tên đăng nhập hoặc mật khẩu.' }); }
    saiTheoIp.delete(req.ip);
    ghiCookie(req, res, taoPhien(docTaiKhoan().ten), SONG_NGAY * 86400);
    res.json({ ok: true });
  });

  app.post('/api/dang-xuat', (req, res) => { ghiCookie(req, res, '', 0); res.json({ ok: true }); });

  // Mọi API studio phải đăng nhập. Lệnh ghi còn phải gửi từ chính trang của app (chặn trang lạ gửi hộ).
  app.use('/api/admin', (req, res, next) => {
    if (!docPhien(req)) return res.status(401).json({ loi: 'Phiên đăng nhập đã hết, đăng nhập lại.' });
    const origin = req.headers.origin;
    if (req.method !== 'GET' && origin) {
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      let khacNguon = true;
      try { khacNguon = new URL(origin).host !== host; } catch { /* origin "null" hoặc hỏng → coi là khác nguồn */ }
      if (khacNguon) return res.status(403).json({ loi: 'Yêu cầu không hợp lệ' });
    }
    next();
  });
}

const canDangNhap = (req, res, next) => (docPhien(req) ? next() : res.redirect('/dang-nhap'));

module.exports = { ganXacThuc, canDangNhap, datMatKhau, docTaiKhoan };
