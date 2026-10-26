// Trang studio — phần dùng chung + hộp thoại tạo/sửa album + ngăn xem kết quả khách chọn.
const KHO_IN = ['60x120', '60x90', '50x70', '40x60', 'Bìa', 'Bàn', 'Album'];
const $ = s => document.querySelector(s);

async function api(url, opt = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
  if (res.status === 401) { location.href = '/dang-nhap'; throw new Error('Cần đăng nhập lại'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.loi || `Lỗi ${res.status}`);
  return data;
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3200);
}

const ngayVN = d => (d ? d.split('-').reverse().join('/') : '');

// ---------- Hộp thoại tạo / sửa album ----------
const dlgForm = $('#dlgForm'), form = $('#f'), ferr = $('#ferr'), nutLuu = $('#fSubmit');
let dangSua = null; // album đang sửa; null = tạo mới

$('#quota').innerHTML = KHO_IN.map((k, i) =>
  `<div><label for="q${i}">${k}</label><input id="q${i}" name="q_${k}" type="number" min="0" inputmode="numeric"></div>`).join('');

function moForm(album = null) {
  dangSua = album;
  form.reset(); ferr.hidden = true;
  $('#formTitle').textContent = album ? 'Sửa album' : 'Tạo album';
  nutLuu.textContent = album ? 'Lưu thay đổi' : 'Tạo album';
  if (album) {
    for (const k of ['linkDrive', 'linkDriveDaChinh', 'coDauChuRe', 'ngayCuoi', 'sdtZalo', 'ngayHenTra', 'hanLuu', 'loiNhan', 'nhacNen']) form.elements[k].value = album[k] || '';
    KHO_IN.forEach(k => { form.elements['q_' + k].value = album.hanMuc[k] || ''; });
  }
  dlgForm.showModal();
  form.elements.linkDrive.focus();
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  ferr.hidden = true;
  // Kiểm tra hai ô bắt buộc ngay tại chỗ, đưa con trỏ về ô sai đầu tiên
  const thieu = ['linkDrive', 'coDauChuRe'].find(k => !form.elements[k].value.trim());
  if (thieu) {
    ferr.textContent = thieu === 'linkDrive' ? 'Cần dán link thư mục Google Drive.' : 'Cần nhập tên cô dâu & chú rể.';
    ferr.hidden = false; form.elements[thieu].focus(); return;
  }
  const fd = new FormData(form);
  const body = Object.fromEntries(['linkDrive', 'linkDriveDaChinh', 'coDauChuRe', 'ngayCuoi', 'sdtZalo', 'ngayHenTra', 'hanLuu', 'loiNhan', 'nhacNen'].map(k => [k, fd.get(k)]));
  body.hanMuc = Object.fromEntries(KHO_IN.map(k => [k, fd.get('q_' + k)]));
  nutLuu.disabled = true;
  nutLuu.textContent = dangSua && body.linkDrive === dangSua.linkDrive && body.linkDriveDaChinh === (dangSua.linkDriveDaChinh || '') ? 'Đang lưu…' : 'Đang đọc thư mục Drive…';
  try {
    const a = dangSua
      ? await api(`/api/admin/albums/${dangSua.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      : await api('/api/admin/albums', { method: 'POST', body: JSON.stringify(body) });
    dlgForm.close();
    toast(dangSua ? `Đã lưu album “${a.coDauChuRe}”.` : `Đã tạo album “${a.coDauChuRe}” với ${a.soAnh.toLocaleString('vi')} ảnh.`);
    window.taiLai && window.taiLai();
  } catch (err) {
    ferr.textContent = err.message; ferr.hidden = false;
  }
  nutLuu.disabled = false; nutLuu.textContent = dangSua ? 'Lưu thay đổi' : 'Tạo album';
});

// ---------- Ngăn kết quả ----------
async function moKetQua(id) {
  const box = $('#res');
  box.innerHTML = '<p style="color:var(--muted);padding:20px 0">Đang tải…</p>';
  $('#dlgRes').showModal();
  try {
    const a = await api(`/api/admin/albums/${id}`);
    $('#resTitle').textContent = a.coDauChuRe;
    const khoi = (tieuDe, ds) => ds.length ? `<h4>${escHtml(tieuDe)} · ${ds.length} ảnh
        <button class="btn ghost" data-chep="${escHtml(ds.join('\n'))}">${ic('copy', 18)} Chép tên file</button></h4><pre>${escHtml(ds.join('\n'))}</pre>` : '';
    const tn = a.theoNguoi || {};
    // Ảnh chỉ một người chọn = chỗ hai bạn chọn lệch nhau, studio nên hỏi lại trước khi in
    const lech = (tn.chiCoDau || []).length + (tn.chiChuRe || []).length;
    const theoNguoi = (tn.caHai || []).length + lech ? `<p class="res-nhom">Theo người chọn${lech ? ` · <b class="lech">${lech} ảnh chỉ một người chọn</b>` : ''}</p>`
      + khoi('Cô dâu và chú rể cùng chọn', tn.caHai || []) + khoi('Chỉ cô dâu chọn', tn.chiCoDau || []) + khoi('Chỉ chú rể chọn', tn.chiChuRe || [])
      + khoi('Chưa rõ ai chọn (chọn trước khi có chọn riêng)', tn.chuaRo || []) : '';
    box.innerHTML = (khoi('Tất cả ảnh khách chọn', a.daChon) + theoNguoi + '<p class="res-nhom">Theo khổ in</p>' + KHO_IN.map(k => khoi('Khổ ' + k + (a.hanMuc[k] ? ` (gói ${a.hanMuc[k]})` : ''), a.theoKho[k])).join(''))
      || '<div class="empty" style="margin-top:20px"><h3>Chưa có lựa chọn</h3><p>Khách chưa chọn ảnh nào.</p></div>';
  } catch (err) { box.innerHTML = `<p class="ferr">${escHtml(err.message)}</p>`; }
}

$('#res').addEventListener('click', async e => {
  const b = e.target.closest('[data-chep]'); if (!b) return;
  if (await chepChu(b.dataset.chep)) toast('Đã chép danh sách tên file.');
});

document.querySelectorAll('[data-dang-xuat]').forEach(b => b.addEventListener('click', async () => {
  await fetch('/api/dang-xuat', { method: 'POST' }).catch(() => {});
  location.href = '/dang-nhap';
}));

// Đóng hộp thoại: nút ✕ / Huỷ, hoặc bấm ra vùng tối phía sau
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-dong]')) d.close(); });
});
document.querySelectorAll('[data-dong]').forEach(b => { if (b.classList.contains('icon-btn')) b.innerHTML = ic('x'); });
