// Góp ý ghim trên ảnh. Khách bấm vào đúng chỗ trên ảnh (toạ độ tỉ lệ 0–1, không phụ thuộc cỡ màn hình)
// hoặc góp ý chung cả ảnh (x, y = null). Studio trả lời ngay dưới góp ý (chỉ 1 tầng) và đánh dấu đã xử lý.
// Lưu trong album.gopY = [{ id, maAnh, x, y, noiDung, tacGia: 'khach'|'studio', tenNguoi, parentId, luc, daXuLy }]
const crypto = require('crypto');
const store = require('./album-store');

const TOI_DA_MOI_ALBUM = 3000;
const chu = (v, max) => String(v ?? '').trim().slice(0, max);
const toaDo = v => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : Math.min(1, Math.max(0, +v)));

// Số góp ý gốc của khách chưa xử lý — trả lời không tính là một việc riêng
const demChuaXuLy = a => (a.gopY || []).filter(g => g.tacGia === 'khach' && !g.parentId && !g.daXuLy).length;

function taoGopY(a, b, tacGia) {
  const noiDung = chu(b.noiDung, 1000);
  if (!noiDung) throw new Error('Nhập nội dung góp ý');
  if ((a.gopY || []).length >= TOI_DA_MOI_ALBUM) throw new Error('Album đã có quá nhiều góp ý');
  let cha = null;
  if (b.parentId) {
    cha = (a.gopY || []).find(g => g.id === b.parentId);
    if (!cha) throw new Error('Góp ý gốc không còn');
    if (cha.parentId) cha = a.gopY.find(g => g.id === cha.parentId) || cha; // trả lời của trả lời → gắn về gốc
  } else if (![...a.anh, ...(a.anhDaChinh || [])].some(f => f.id === b.maAnh)) throw new Error('Ảnh không thuộc album này'); // góp ý cả ảnh đã chỉnh
  return {
    id: crypto.randomBytes(6).toString('base64url'),
    maAnh: cha ? cha.maAnh : b.maAnh,
    x: cha ? null : toaDo(b.x), y: cha ? null : toaDo(b.y),
    noiDung, tacGia, tenNguoi: chu(b.tenNguoi, 40) || null,
    parentId: cha ? cha.id : null, luc: new Date().toISOString(), daXuLy: false,
  };
}

function luuGopY(a, gopY) {
  return store.suaAlbum(a.id, x => {
    x.gopY = x.gopY || [];
    x.gopY.push(gopY);
    if (gopY.parentId && gopY.tacGia === 'khach') { const cha = x.gopY.find(g => g.id === gopY.parentId); if (cha) cha.daXuLy = false; } // khách hỏi tiếp → mở lại việc
    x.capNhatLuc = gopY.luc;
  });
}

function ganGopY(app, { albumKhach, hetHan }) {
  // ----- Khách -----
  app.post('/api/a/:token/gop-y', (req, res) => {
    const a = albumKhach(req.params.token);
    if (!a) return res.status(404).json({ loi: 'Không có album' });
    if (hetHan(a)) return res.status(403).json({ loi: 'Album đã hết hạn lưu' });
    try {
      const g = taoGopY(a, req.body || {}, 'khach');
      luuGopY(a, g);
      res.json(g);
    } catch (e) { res.status(400).json({ loi: e.message }); }
  });

  // Khách xoá được góp ý của chính phía khách khi studio chưa xử lý (xoá gốc là xoá luôn trả lời)
  app.delete('/api/a/:token/gop-y/:gid', (req, res) => {
    const a = albumKhach(req.params.token);
    const g = a && (a.gopY || []).find(x => x.id === req.params.gid);
    if (!g) return res.status(404).json({ loi: 'Không có góp ý này' });
    if (g.tacGia !== 'khach' || g.daXuLy) return res.status(403).json({ loi: 'Góp ý này studio đã xử lý, không xoá được' });
    store.suaAlbum(a.id, x => { x.gopY = x.gopY.filter(k => k.id !== g.id && k.parentId !== g.id); });
    res.json({ ok: true });
  });

  // ----- Studio (đã qua kiểm đăng nhập ở /api/admin) -----
  app.post('/api/admin/albums/:id/gop-y', (req, res) => {
    const a = store.timAlbum(x => x.id === +req.params.id);
    if (!a) return res.status(404).json({ loi: 'Không có album này' });
    try {
      const g = taoGopY(a, { ...req.body, tenNguoi: 'Studio' }, 'studio');
      const sau = luuGopY(a, g);
      // Studio trả lời một góp ý = thường là đã xử lý xong; để nút "Đã xử lý" quyết định riêng
      res.json({ gopY: g, chuaXuLy: demChuaXuLy(sau) });
    } catch (e) { res.status(400).json({ loi: e.message }); }
  });

  app.patch('/api/admin/albums/:id/gop-y/:gid', (req, res) => {
    const a = store.timAlbum(x => x.id === +req.params.id);
    if (!a || !(a.gopY || []).some(g => g.id === req.params.gid)) return res.status(404).json({ loi: 'Không có góp ý này' });
    const sau = store.suaAlbum(a.id, x => { const g = x.gopY.find(k => k.id === req.params.gid); g.daXuLy = !!req.body?.daXuLy; });
    res.json({ ok: true, chuaXuLy: demChuaXuLy(sau) });
  });

  // Danh sách góp ý cho studio, kèm tên ảnh để hiển thị
  app.get('/api/admin/albums/:id/gop-y', (req, res) => {
    const a = store.timAlbum(x => x.id === +req.params.id);
    if (!a) return res.status(404).json({ loi: 'Không có album này' });
    const ten = Object.fromEntries([...a.anh, ...(a.anhDaChinh || []).map(f => ({ ...f, group: 'Đã chỉnh' + (f.group ? '/' + f.group : '') }))]
      .map(f => [f.id, f.group ? `${f.group}/${f.name}` : f.name]));
    res.json({ gopY: (a.gopY || []).map(g => ({ ...g, tenAnh: ten[g.maAnh] || g.maAnh })), chuaXuLy: demChuaXuLy(a) });
  });
}

module.exports = { ganGopY, demChuaXuLy };
