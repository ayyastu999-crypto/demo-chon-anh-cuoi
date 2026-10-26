// Demo app khách chọn ảnh cưới: studio dán link thư mục Google Drive → có link gửi khách →
// khách xem ảnh, chọn và gắn khổ in theo hạn mức của gói → studio theo dõi đơn qua 8 trạng thái.
// Trang studio cần đăng nhập (lib/xac-thuc-studio.js); trang khách vào bằng link riêng.
// Chạy sau Cloudflare Tunnel: app chỉ nghe 127.0.0.1, tunnel đưa khách từ internet vào.
const fs = require('fs');
const path = require('path');
const express = require('express');
const store = require('./lib/album-store');
const { layFolderId, docAnhTrongThuMuc } = require('./lib/drive-folder-reader');
const { layAnh } = require('./lib/drive-image-cache');
const { ganXacThuc, canDangNhap } = require('./lib/xac-thuc-studio');
const { ganGopY, demChuaXuLy } = require('./lib/gop-y-routes');
const { NGUOI_CHON, ghepTruocSau, capNhatChon, chiaTheoNguoi } = require('./lib/anh-da-chinh-va-nguoi-chon');

const PORT = process.env.PORT || 5193;
// HOST=0.0.0.0 để mở cho máy khác trong wifi studio; mặc định chỉ trong máy (tunnel đi vào qua 127.0.0.1)
const HOST = process.env.HOST || '127.0.0.1';
const app = express();
app.disable('x-powered-by');
// Tunnel kết nối từ chính máy này và gửi kèm địa chỉ thật của khách trong X-Forwarded-For
app.set('trust proxy', 'loopback');
app.use((req, res, next) => {
  // Khách vào bằng http:// qua tunnel → đẩy sang https:// để mật khẩu và cookie không đi đường trần
  if (req.headers['x-forwarded-proto'] === 'http' && req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' });
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000');
  next();
});
app.use(express.json({ limit: '200kb' }));

// Gửi trang HTML kèm ?v=<mốc sửa file> trên mọi link JS/CSS. Cloudflare ép max-age 4 tiếng cho .js/.css,
// nên sửa code mà không đổi link thì trình duyệt khách chạy bản cũ tới 4 tiếng (đã dính 26/10/2026:
// trang khách chạy khach.js cũ, mất nút góp ý). Mốc tự tính từ file → không phải nhớ tăng số bằng tay.
const PUBLIC = path.join(__dirname, 'public');
function guiTrang(tenFile) {
  return (req, res) => {
    const html = fs.readFileSync(path.join(PUBLIC, tenFile), 'utf8')
      .replace(/(src|href)="\/([\w.-]+\.(?:js|css))"/g, (m, thuocTinh, f) => {
        try { return `${thuocTinh}="/${f}?v=${fs.statSync(path.join(PUBLIC, f)).mtimeMs.toString(36)}"`; } catch { return m; }
      });
    res.set('Cache-Control', 'no-cache').type('html').send(html);
  };
}

ganXacThuc(app, guiTrang('dang-nhap.html'));
// Trang studio chỉ mở qua "/" (có kiểm đăng nhập), không cho mở thẳng file html
app.get(['/studio.html', '/dang-nhap.html', '/khach.html'], (req, res) => res.redirect('/'));
app.use(express.static(PUBLIC, {
  index: false,
  // Link có ?v= (do guiTrang gắn) thì nội dung không bao giờ đổi → cho đệm lâu
  setHeaders: (res, file) => { if (res.req.query.v && /\.(js|css)$/.test(file)) res.set('Cache-Control', 'public, max-age=31536000, immutable'); },
}));

// Express 4 không tự bắt lỗi trong hàm async → bọc lại để lỗi trả về JSON thay vì treo request
const boc = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => res.status(400).json({ loi: e.message }));

// ---------- Làm sạch dữ liệu nhập từ form ----------
const chu = (v, max) => String(v ?? '').trim().slice(0, max);
const ngay = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : '');
const sdt = v => String(v || '').replace(/\D/g, '').slice(0, 12);
const linkNhac = v => (/^https?:\/\/\S+$/i.test(String(v || '').trim()) ? String(v).trim().slice(0, 400) : '');
function docHanMuc(raw = {}) {
  const out = {};
  for (const k of store.KHO_IN) { const n = parseInt(raw[k], 10); if (n > 0) out[k] = n; }
  return out;
}
const homNayCong = soNgay => new Date(Date.now() + soNgay * 864e5).toISOString().slice(0, 10);
const hetHan = a => !!a.hanLuu && a.hanLuu < new Date().toISOString().slice(0, 10);

async function docAnhTuLink(link) {
  const folderId = layFolderId(link);
  if (!folderId) throw new Error('Link Google Drive chưa đúng. Dán link thư mục dạng drive.google.com/drive/folders/…');
  const anh = await docAnhTrongThuMuc(folderId);
  if (!anh.length) throw new Error('Thư mục không có ảnh JPG/PNG nào, hoặc chưa mở quyền xem cho người có link');
  return { folderId, anh };
}

function tomTat(a) {
  return {
    id: a.id, token: a.token, coDauChuRe: a.coDauChuRe, ngayCuoi: a.ngayCuoi, loiNhan: a.loiNhan, linkDrive: a.linkDrive,
    sdtZalo: a.sdtZalo || '', ngayHenTra: a.ngayHenTra || '', hanLuu: a.hanLuu || '', hetHan: hetHan(a), nhacNen: a.nhacNen || '',
    trangThai: a.trangThai, soAnh: a.anh.length, soChon: Object.keys(a.chon).length, anhBia: a.anh[0]?.id || null,
    hanMuc: a.hanMuc, demKho: store.demTheoKho(a), createdAt: a.createdAt, capNhatLuc: a.capNhatLuc || a.createdAt,
    soGopY: (a.gopY || []).filter(g => !g.parentId).length, gopYChuaXuLy: demChuaXuLy(a),
    linkDriveDaChinh: a.linkDriveDaChinh || '', soAnhDaChinh: (a.anhDaChinh || []).length,
  };
}

// ---------- Studio ----------
app.get('/api/admin/albums', (req, res) => res.json({
  albums: store.danhSach().map(tomTat), trangThai: store.TRANG_THAI, khoIn: store.KHO_IN,
}));

app.post('/api/admin/albums', boc(async (req, res) => {
  const b = req.body || {};
  if (!chu(b.coDauChuRe, 120)) throw new Error('Nhập tên cô dâu & chú rể');
  const { folderId, anh } = await docAnhTuLink(b.linkDrive);
  const daChinh = chu(b.linkDriveDaChinh, 400) ? await docAnhTuLink(b.linkDriveDaChinh) : null;
  const album = store.taoAlbum({
    linkDriveDaChinh: daChinh ? chu(b.linkDriveDaChinh, 400) : '', folderDaChinh: daChinh?.folderId || null, anhDaChinh: daChinh?.anh || [],
    coDauChuRe: chu(b.coDauChuRe, 120), ngayCuoi: ngay(b.ngayCuoi), loiNhan: chu(b.loiNhan, 600),
    sdtZalo: sdt(b.sdtZalo), ngayHenTra: ngay(b.ngayHenTra), hanLuu: ngay(b.hanLuu), nhacNen: linkNhac(b.nhacNen),
    linkDrive: chu(b.linkDrive, 400), folderId, anh, hanMuc: docHanMuc(b.hanMuc),
  });
  res.json(tomTat(album));
}));

// Sửa thông tin hoặc đổi trạng thái. Đổi link Drive thì đọc lại ảnh, giữ lựa chọn của khách.
app.patch('/api/admin/albums/:id', boc(async (req, res) => {
  const id = +req.params.id, b = req.body || {};
  const cu = store.timAlbum(x => x.id === id);
  if (!cu) throw new Error('Không có album này');
  let docLai = null;
  if (b.linkDrive !== undefined && chu(b.linkDrive, 400) !== cu.linkDrive) docLai = await docAnhTuLink(b.linkDrive);
  // Link thư mục ảnh đã chỉnh: dán thêm sau khi chỉnh xong; xoá trống = bỏ tab ảnh đã chỉnh
  let daChinh;
  if (b.linkDriveDaChinh !== undefined && chu(b.linkDriveDaChinh, 400) !== (cu.linkDriveDaChinh || '')) {
    daChinh = chu(b.linkDriveDaChinh, 400) ? await docAnhTuLink(b.linkDriveDaChinh) : { folderId: null, anh: [] };
  }
  if (b.trangThai !== undefined && !store.TRANG_THAI.some(t => t.ma === b.trangThai)) throw new Error('Trạng thái không hợp lệ');
  const sau = store.suaAlbum(id, a => {
    if (b.coDauChuRe !== undefined && chu(b.coDauChuRe, 120)) a.coDauChuRe = chu(b.coDauChuRe, 120);
    if (b.ngayCuoi !== undefined) a.ngayCuoi = ngay(b.ngayCuoi);
    if (b.loiNhan !== undefined) a.loiNhan = chu(b.loiNhan, 600);
    if (b.sdtZalo !== undefined) a.sdtZalo = sdt(b.sdtZalo);
    if (b.ngayHenTra !== undefined) a.ngayHenTra = ngay(b.ngayHenTra);
    if (b.hanLuu !== undefined) a.hanLuu = ngay(b.hanLuu);
    if (b.nhacNen !== undefined) a.nhacNen = linkNhac(b.nhacNen);
    if (b.hanMuc !== undefined) a.hanMuc = docHanMuc(b.hanMuc);
    if (docLai) { a.linkDrive = chu(b.linkDrive, 400); a.folderId = docLai.folderId; a.anh = docLai.anh; }
    if (daChinh) { a.linkDriveDaChinh = chu(b.linkDriveDaChinh, 400); a.folderDaChinh = daChinh.folderId; a.anhDaChinh = daChinh.anh; }
    if (b.trangThai !== undefined) {
      a.trangThai = b.trangThai;
      if (b.trangThai === 'cho-duyet' && !a.hanLuu) a.hanLuu = homNayCong(30); // gửi khách duyệt → hạn lưu 30 ngày
    }
    a.capNhatLuc = new Date().toISOString();
  });
  res.json(tomTat(sau));
}));

app.delete('/api/admin/albums/:id', (req, res) => {
  if (!store.xoaAlbum(+req.params.id)) return res.status(404).json({ loi: 'Không có album này' });
  res.json({ ok: true });
});

app.get('/api/admin/albums/:id', (req, res) => {
  const a = store.timAlbum(x => x.id === +req.params.id);
  if (!a) return res.status(404).json({ loi: 'Không có album này' });
  const tenTheoMa = Object.fromEntries(a.anh.map(f => [f.id, f.group ? `${f.group}/${f.name}` : f.name]));
  const theoKho = Object.fromEntries(store.KHO_IN.map(k => [k, []]));
  const daChon = [];
  for (const [ma, khos] of Object.entries(a.chon)) {
    const ten = tenTheoMa[ma] || ma;
    daChon.push(ten);
    for (const k of khos) theoKho[k]?.push(ten);
  }
  res.json({ ...tomTat(a), daChon: daChon.sort(), theoKho: Object.fromEntries(Object.entries(theoKho).map(([k, v]) => [k, v.sort()])),
    theoNguoi: chiaTheoNguoi(a, tenTheoMa) });
});

// Quét lại Drive khi studio bỏ thêm ảnh vào thư mục — giữ nguyên lựa chọn của khách
app.post('/api/admin/albums/:id/quet-lai', boc(async (req, res) => {
  const a = store.timAlbum(x => x.id === +req.params.id);
  if (!a) throw new Error('Không có album này');
  const anh = await docAnhTrongThuMuc(a.folderId);
  const anhDaChinh = a.folderDaChinh ? await docAnhTrongThuMuc(a.folderDaChinh) : null;
  res.json(tomTat(store.suaAlbum(a.id, x => { x.anh = anh; if (anhDaChinh) x.anhDaChinh = anhDaChinh; x.capNhatLuc = new Date().toISOString(); })));
}));

// ---------- Khách (vào bằng token, không cần đăng nhập) ----------
const albumKhach = token => store.timAlbum(x => x.token === token);
const duocChon = a => store.trangThai(a.trangThai).buoc === 1 && !hetHan(a);
ganGopY(app, { albumKhach, hetHan });

app.get('/api/a/:token', (req, res) => {
  const a = albumKhach(req.params.token);
  if (!a) return res.status(404).json({ loi: 'Link không đúng hoặc album đã bị gỡ' });
  const tt = store.trangThai(a.trangThai);
  res.json({
    coDauChuRe: a.coDauChuRe, ngayCuoi: a.ngayCuoi, loiNhan: a.loiNhan, anh: a.anh, hanMuc: a.hanMuc, chon: a.chon,
    trangThai: tt.ma, tenTrangThai: tt.ten, buoc: tt.buoc, duocChon: duocChon(a), hetHan: hetHan(a), hanLuu: a.hanLuu || '',
    nhacNen: a.nhacNen || '/nhac/nhac-cuoi-mac-dinh.mp3', gopY: a.gopY || [], chonBoi: a.chonBoi || {},
    anhDaChinh: ghepTruocSau(a.anh, a.anhDaChinh || []), duocDuyet: a.trangThai === 'cho-duyet' && !hetHan(a),
    khoIn: store.KHO_IN,
  });
});

// Khách chọn / bỏ chọn một ảnh và gắn các khổ in. Vượt hạn mức vẫn cho lưu — giao diện báo đỏ.
app.put('/api/a/:token/chon', (req, res) => {
  const a = albumKhach(req.params.token);
  if (!a) return res.status(404).json({ loi: 'Không có album' });
  if (!duocChon(a)) return res.status(403).json({ loi: 'Studio đã bắt đầu xử lý ảnh, lựa chọn đã được khoá' });
  const { maAnh, chon, kho, nguoi } = req.body || {};
  if (!a.anh.some(f => f.id === maAnh)) return res.status(400).json({ loi: 'Ảnh không thuộc album này' });
  if (nguoi !== undefined && !NGUOI_CHON.includes(nguoi)) return res.status(400).json({ loi: 'Chỉ cô dâu hoặc chú rể chọn ảnh' });
  const khoHopLe = [...new Set((kho || []).filter(k => store.KHO_IN.includes(k)))];
  const sau = store.suaAlbum(a.id, x => {
    capNhatChon(x, maAnh, !!chon, khoHopLe, nguoi);
    if (x.trangThai === 'da-chon-xong') x.trangThai = 'cho-chon'; // khách đổi ý thì studio thấy lại "đang chọn"
    x.capNhatLuc = new Date().toISOString();
  });
  res.json({ chon: sau.chon, chonBoi: sau.chonBoi || {}, trangThai: sau.trangThai });
});

// Khách duyệt ảnh đã chỉnh → studio chuyển sang in
app.post('/api/a/:token/duyet', (req, res) => {
  const a = albumKhach(req.params.token);
  if (!a) return res.status(404).json({ loi: 'Không có album' });
  if (a.trangThai !== 'cho-duyet' || hetHan(a)) return res.status(403).json({ loi: 'Album không ở bước duyệt ảnh' });
  store.suaAlbum(a.id, x => { x.trangThai = 'da-duyet'; x.duyetLuc = x.capNhatLuc = new Date().toISOString(); });
  res.json({ ok: true });
});

app.post('/api/a/:token/chon-xong', (req, res) => {
  const a = albumKhach(req.params.token);
  if (!a) return res.status(404).json({ loi: 'Không có album' });
  if (!duocChon(a)) return res.status(403).json({ loi: 'Album đã qua bước chọn ảnh' });
  store.suaAlbum(a.id, x => { x.trangThai = 'da-chon-xong'; x.chonXongLuc = x.capNhatLuc = new Date().toISOString(); });
  res.json({ ok: true });
});

// ---------- Ảnh (máy chủ tải hộ từ Drive + lưu lại) ----------
// Chỉ phục vụ ảnh thuộc một album trong app, để route này không thành cửa tải hộ file Drive bất kỳ.
let maAnhHopLe = new Set(), maAnhLuc = '';
function anhThuocApp(id) {
  const ds = store.danhSach();
  const dau = ds.map(a => `${a.id}:${a.anh.length}:${(a.anhDaChinh || []).length}:${a.capNhatLuc || a.createdAt}`).join('|');
  if (dau !== maAnhLuc) { maAnhHopLe = new Set(ds.flatMap(a => [...a.anh, ...(a.anhDaChinh || [])].map(f => f.id))); maAnhLuc = dau; }
  return maAnhHopLe.has(id);
}
app.get('/anh/:co(nho|lon)/:id', async (req, res) => {
  if (!anhThuocApp(req.params.id)) return res.status(404).end();
  try {
    const file = await layAnh(req.params.id, req.params.co);
    res.set('Cache-Control', 'public, max-age=31536000, immutable').type('jpg').sendFile(file);
  } catch (e) { res.status(503).set('Retry-After', '5').json({ loi: e.message }); }
});

// ---------- Trang ----------
app.get('/', canDangNhap, guiTrang('studio.html'));
app.get('/a/:token', guiTrang('khach.html'));

app.listen(PORT, HOST, () => console.log(`Demo chọn ảnh cưới: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`));
