// Trang khách — tab "Ảnh đã chỉnh": xem ảnh studio đã chỉnh, kéo thanh so sánh với ảnh gốc, góp ý sửa tiếp, rồi duyệt.
// Ghép ảnh đã chỉnh ↔ ảnh gốc làm ở máy chủ (trường `goc` của mỗi ảnh đã chỉnh).
const ss = { bat: false, x: 50 };
const dangXemSua = () => tab === 'sua';

function theAnhSua(f, i) {
  const soGy = (A.gopY || []).filter(g => g.maAnh === f.id && !g.parentId).length;
  return `<div class="it" data-i="${i}">
    <img loading="lazy" decoding="async" src="${anhNho(f.id)}" onload="this.classList.add('ok')" onerror="thuLaiAnh(this)" alt="Ảnh đã chỉnh ${escHtml(f.name)}">
    <span class="nm">${escHtml(f.name.replace(/\.\w+$/, ''))}</span>
    ${soGy ? `<span class="gyc" aria-label="${soGy} góp ý">${ic('message', 14)}${soGy}</span>` : ''}
    ${f.goc ? `<span class="ss-co">${ic('refresh', 13)}So sánh được</span>` : ''}</div>`;
}

// Vẽ phần riêng của màn ảnh lớn khi đang xem ảnh đã chỉnh
function veSoSanhLb() {
  const f = dsHien[dangXem], laSua = dangXemSua() && !!f;
  $('#lb').classList.toggle('xem-sua', laSua);
  $('#ss').hidden = !laSua;
  if (!laSua) { tatSoSanh(); return; }
  const coGoc = !!f.goc;
  $('#ssNut').disabled = !coGoc;
  $('#ssNut').innerHTML = !coGoc ? 'Không tìm thấy ảnh gốc cùng tên' : ss.bat ? `${ic('x', 16)}Thôi so sánh` : `${ic('refresh', 16)}So sánh trước / sau`;
  $('#ssNut').setAttribute('aria-pressed', ss.bat);
  $('#ssThanhWrap').hidden = !ss.bat;
  if (ss.bat && coGoc) {
    const goc = $('#lbGoc');
    if (goc.dataset.id !== f.goc) { goc.src = anhLon(f.goc); goc.dataset.id = f.goc; }
    datViTriSoSanh();
  }
  $('#lbSs').hidden = !(ss.bat && coGoc);
  $('#lbLop').hidden = ss.bat && coGoc; // đang so sánh thì ẩn ghim để kéo thanh cho dễ
}
function tatSoSanh() { ss.bat = false; $('#lbSs').hidden = true; $('#lbLop').hidden = false; }
function datViTriSoSanh() {
  $('#lbSs').style.setProperty('--x', ss.x + '%');
  $('#ssThanh').value = ss.x;
}

$('#ssNut').onclick = () => { ss.bat = !ss.bat; ss.x = 50; veSoSanhLb(); if (typeof datLop === 'function') datLop(); };
$('#ssThanh').addEventListener('input', e => { ss.x = +e.target.value; datViTriSoSanh(); });
// Kéo trực tiếp trên ảnh (chuột hoặc ngón tay)
let keoSs = false;
const theoTay = e => { const r = $('#lbSs').getBoundingClientRect(); ss.x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)); datViTriSoSanh(); };
$('#lbSs').addEventListener('pointerdown', e => { keoSs = true; $('#lbSs').setPointerCapture(e.pointerId); theoTay(e); e.stopPropagation(); });
$('#lbSs').addEventListener('pointermove', e => { if (keoSs) theoTay(e); });
$('#lbSs').addEventListener('pointerup', () => { keoSs = false; });
$('#lbSs').addEventListener('touchstart', e => e.stopPropagation(), { passive: true }); // không để vuốt chuyển ảnh khi đang kéo thanh

// Nút duyệt ảnh đã chỉnh (chỉ khi studio đang chờ khách duyệt)
function veNutDuyet() { $('#btnDuyet').classList.toggle('show', dangXemSua() && !!A.duocDuyet && !dangOThiep && dangXem < 0); }
$('#btnDuyet').onclick = async () => {
  if (!confirm('Anh/chị đã xem hết ảnh đã chỉnh và đồng ý để studio in ảnh?')) return;
  try {
    await api(`/api/a/${token}/duyet`, { method: 'POST' });
    A.duocDuyet = false; A.buoc = 3; A.tenTrangThai = 'Khách đã duyệt';
    veBuoc(); veNutDuyet(); toast('Cảm ơn anh chị — studio đã nhận duyệt và sẽ chuyển sang in.');
  } catch (e) { toast(e.message); }
};
