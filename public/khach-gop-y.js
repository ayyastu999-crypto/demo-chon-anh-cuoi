// Trang khách — ghim góp ý lên ảnh trong màn xem ảnh lớn. Dùng chung biến/hàm của khach.js (A, dsHien, dangXem, api, toast).
// Toạ độ ghim lưu theo tỉ lệ 0–1 của ảnh nên đúng chỗ ở mọi cỡ màn hình.
const gy = { cheDoGhim: false, diem: null, sangId: null };
const tenKhach = () => { try { return localStorage.getItem('ten-khach-cuoi') || ''; } catch { return ''; } };
const nhoTenKhach = t => { try { localStorage.setItem('ten-khach-cuoi', t); } catch { /* chế độ riêng tư */ } };
const gioVN = s => new Date(s).toLocaleString('vi', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

const gopYCuaAnh = maAnh => (A.gopY || []).filter(g => g.maAnh === maAnh);
const goc = ds => ds.filter(g => !g.parentId);
// Số thứ tự ①②③ chỉ đánh cho góp ý có ghim điểm, theo thứ tự gửi
function soGhim(ds) { let n = 0; return Object.fromEntries(goc(ds).filter(g => g.x !== null).map(g => [g.id, ++n])); }

// Ghim cao ~40px: điểm nằm trong khoảng đó tính từ mép trên thì lật ghim xuống để không tràn khỏi ảnh
// Khi ảnh chưa tải xong (khung cao 0) thì chưa lật — vẽ lại ghim lúc ảnh tải xong (xem sự kiện load cuối file)
const latGhim = y => { const h = $('#lbLop').getBoundingClientRect().height; return h > 0 && y * h < 40; };

// Lớp phủ trùng khít khung ảnh đang hiển thị (ảnh co giãn kiểu "contain" nên phải đo lại)
function datLop() {
  const img = $('#lbAnh'), lop = $('#lbLop'), k = $('#lbKhung').getBoundingClientRect(), r = img.getBoundingClientRect();
  const viTri = { left: `${r.left - k.left}px`, top: `${r.top - k.top}px`, width: `${r.width}px`, height: `${r.height}px` };
  Object.assign(lop.style, viTri);
  Object.assign($('#lbSs').style, viTri); // lớp so sánh trước/sau trùng khít ảnh như lớp ghim
}

function veGopYLb() {
  const f = dsHien[dangXem]; if (!f) return;
  const ds = gopYCuaAnh(f.id), so = soGhim(ds);
  const ghim = goc(ds).filter(g => g.x !== null).map(g =>
    `<button type="button" class="pin ${g.daXuLy ? 'xong' : ''} ${g.id === gy.sangId ? 'sang' : ''} ${latGhim(g.y) ? 'lat' : ''}" style="left:${g.x * 100}%;top:${g.y * 100}%" data-gy="${g.id}" aria-label="Góp ý số ${so[g.id]}"><span>${so[g.id]}</span></button>`).join('');
  const tam = gy.diem ? `<span class="pin tam ${latGhim(gy.diem.y) ? 'lat' : ''}" style="left:${gy.diem.x * 100}%;top:${gy.diem.y * 100}%"><span>+</span></span>` : '';
  $('#lbLop').innerHTML = ghim + tam;
  $('#lbLop').classList.toggle('dang-ghim', gy.cheDoGhim);
  $('#gyGhim').setAttribute('aria-pressed', gy.cheDoGhim);
  $('#gyGhim').innerHTML = gy.cheDoGhim ? ic('x', 16) + 'Thôi ghim' : ic('edit', 16) + 'Ghim lên ảnh';
  $('#gyChung').innerHTML = ic('message', 16) + 'Góp ý chung';
  $('#gyGoi').hidden = !gy.cheDoGhim || !!gy.diem;
  const traLoi = g => ds.filter(k => k.parentId === g.id);
  $('#gyList').innerHTML = goc(ds).map(g => `
    <li class="${g.daXuLy ? 'xong' : ''} ${g.id === gy.sangId ? 'sang' : ''}" data-gy="${g.id}">
      <div class="gy-dong"><b class="so">${so[g.id] || ic('message', 14)}</b>
        <div><p class="gy-ai">${escHtml(g.tenNguoi || 'Anh/chị')} · <time>${gioVN(g.luc)}</time>${g.daXuLy ? ` · <em>${ic('check', 13)}Studio đã xử lý</em>` : ''}</p>
          <p class="gy-nd">${escHtml(g.noiDung)}</p></div>
        ${!g.daXuLy ? `<button type="button" class="gy-xoa" data-xoa="${g.id}" aria-label="Xoá góp ý">${ic('trash', 16)}</button>` : ''}</div>
      ${traLoi(g).map(t => `<div class="gy-tl ${t.tacGia}"><p class="gy-ai">${t.tacGia === 'studio' ? 'Studio trả lời' : escHtml(t.tenNguoi || 'Anh/chị')} · <time>${gioVN(t.luc)}</time></p><p class="gy-nd">${escHtml(t.noiDung)}</p></div>`).join('')}
    </li>`).join('') || (gy.cheDoGhim || !$('#gyForm').hidden ? '' : '<li class="gy-trong">Chưa có góp ý nào cho ảnh này.</li>');
  requestAnimationFrame(datLop);
}

function moForm(diem) {
  gy.diem = diem;
  $('#gyVi').innerHTML = diem ? `${ic('edit', 14)} Góp ý cho điểm vừa ghim trên ảnh` : `${ic('message', 14)} Góp ý chung cho cả ảnh`;
  const ten = tenKhach();
  $('#gyTen').value = ten; $('#gyTen').hidden = $('#gyTenNhan').hidden = !!ten;
  $('#gyForm').hidden = false; veGopYLb();
  $('#gyNoiDung').focus({ preventScroll: true });
  $('#gyForm').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function dongForm() { gy.diem = null; gy.cheDoGhim = false; $('#gyForm').hidden = true; $('#gyNoiDung').value = ''; veGopYLb(); }

$('#gyGhim').onclick = () => { gy.cheDoGhim = !gy.cheDoGhim; if (!gy.cheDoGhim) return dongForm(); veGopYLb(); };
$('#gyChung').onclick = () => { gy.cheDoGhim = false; moForm(null); };
$('#gyHuy').onclick = dongForm;

// Chạm lên ảnh khi đang bật "Ghim lên ảnh" → đặt điểm; chạm vào ghim có sẵn → làm sáng góp ý đó trong danh sách
$('#lbLop').addEventListener('click', e => {
  const pin = e.target.closest('[data-gy]');
  if (pin) { gy.sangId = pin.dataset.gy; veGopYLb(); $(`#gyList [data-gy="${gy.sangId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
  if (!gy.cheDoGhim) return;
  const r = $('#lbLop').getBoundingClientRect();
  moForm({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
});
$('#gyList').addEventListener('click', async e => {
  const xoa = e.target.closest('[data-xoa]');
  if (xoa) {
    if (!confirm('Xoá góp ý này?')) return;
    try { await api(`/api/a/${token}/gop-y/${xoa.dataset.xoa}`, { method: 'DELETE' }); A.gopY = A.gopY.filter(g => g.id !== xoa.dataset.xoa && g.parentId !== xoa.dataset.xoa); veGopYLb(); veLuoi(); }
    catch (err) { toast(err.message); }
    return;
  }
  const li = e.target.closest('li[data-gy]'); if (li) { gy.sangId = li.dataset.gy; veGopYLb(); }
});

$('#gyForm').addEventListener('submit', async e => {
  e.preventDefault();
  const noiDung = $('#gyNoiDung').value.trim();
  if (!noiDung) { toast('Anh/chị nhập nội dung góp ý giúp em.'); return $('#gyNoiDung').focus(); }
  const ten = $('#gyTen').value.trim() || tenKhach();
  if (ten) nhoTenKhach(ten);
  const nut = $('#gyGui'); nut.disabled = true; nut.textContent = 'Đang gửi…';
  try {
    const g = await api(`/api/a/${token}/gop-y`, { method: 'POST', body: JSON.stringify({ maAnh: dsHien[dangXem].id, x: gy.diem?.x ?? null, y: gy.diem?.y ?? null, noiDung, tenNguoi: ten }) });
    A.gopY = [...(A.gopY || []), g]; gy.sangId = g.id;
    dongForm(); veLuoi(); toast('Đã gửi góp ý cho studio.');
  } catch (err) { toast(err.message); }
  nut.disabled = false; nut.textContent = 'Gửi góp ý';
});

// Ảnh tải xong / đổi cỡ màn hình → đo lại khung rồi vẽ lại ghim (vị trí lật phụ thuộc chiều cao thật của ảnh)
$('#lbAnh').addEventListener('load', () => { datLop(); veGopYLb(); });
addEventListener('resize', () => { if (dangXem > -1) { datLop(); veGopYLb(); } });
