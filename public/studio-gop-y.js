// Trang studio — ngăn "Góp ý": xem góp ý khách ghim trên từng ảnh, trả lời, đánh dấu đã xử lý.
// Dùng chung api / toast / escHtml / ic của studio-form.js và icons.js.
let gyAlbum = null, gyDs = [], gyChiChuaXuLy = true;
const gioVNs = s => new Date(s).toLocaleString('vi', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

async function moGopY(album) {
  gyAlbum = album;
  $('#gyTitle').textContent = `Góp ý · ${album.coDauChuRe}`;
  $('#gyBox').innerHTML = '<p style="color:var(--muted);padding:20px 0">Đang tải…</p>';
  $('#dlgGy').showModal();
  try { gyDs = (await api(`/api/admin/albums/${album.id}/gop-y`)).gopY; veGopYStudio(); }
  catch (err) { $('#gyBox').innerHTML = `<p class="ferr">${escHtml(err.message)}</p>`; }
}

function veGopYStudio() {
  const goc = gyDs.filter(g => !g.parentId && (!gyChiChuaXuLy || !g.daXuLy));
  const theoAnh = new Map();
  for (const g of goc) { if (!theoAnh.has(g.maAnh)) theoAnh.set(g.maAnh, []); theoAnh.get(g.maAnh).push(g); }
  const tongChua = gyDs.filter(g => !g.parentId && g.tacGia === 'khach' && !g.daXuLy).length;
  const loc = `<div class="gy-loc"><button class="chip ${gyChiChuaXuLy ? 'on' : ''}" data-gyloc="1">Chưa xử lý<em>${tongChua}</em></button>
    <button class="chip ${gyChiChuaXuLy ? '' : 'on'}" data-gyloc="0">Tất cả<em>${gyDs.filter(g => !g.parentId).length}</em></button></div>`;
  if (!theoAnh.size) { $('#gyBox').innerHTML = loc + `<div class="empty" style="margin-top:16px"><h3>${gyChiChuaXuLy ? 'Đã xử lý hết' : 'Chưa có góp ý'}</h3><p>${gyChiChuaXuLy ? 'Không còn góp ý nào chờ studio.' : 'Khách chưa ghim góp ý nào.'}</p></div>`; return; }
  $('#gyBox').innerHTML = loc + [...theoAnh].map(([maAnh, ds]) => {
    // Đánh số ghim theo toàn bộ góp ý có điểm của ảnh (giống số khách thấy)
    let n = 0; const so = Object.fromEntries(gyDs.filter(g => g.maAnh === maAnh && !g.parentId && g.x !== null).map(g => [g.id, ++n]));
    const pins = ds.filter(g => g.x !== null).map(g => `<i class="spin ${g.daXuLy ? 'xong' : ''}" style="left:${g.x * 100}%;top:${g.y * 100}%">${so[g.id]}</i>`).join('');
    return `<article class="gya">
      <a class="gya-anh" href="/anh/lon/${maAnh}" target="_blank" rel="noopener" aria-label="Mở ảnh lớn"><img loading="lazy" src="/anh/nho/${maAnh}" alt="">${pins}</a>
      <div class="gya-ds"><p class="gya-ten">${escHtml(ds[0].tenAnh)}</p>
      ${ds.map(g => `<div class="gyi ${g.daXuLy ? 'xong' : ''}" data-id="${g.id}">
        <p class="gyi-ai"><b>${so[g.id] || ic('message', 13)}</b>${escHtml(g.tenNguoi || (g.tacGia === 'studio' ? 'Studio' : 'Khách'))} · ${gioVNs(g.luc)}</p>
        <p class="gyi-nd">${escHtml(g.noiDung)}</p>
        ${gyDs.filter(t => t.parentId === g.id).map(t => `<p class="gyi-tl ${t.tacGia}"><span>${t.tacGia === 'studio' ? 'Studio' : escHtml(t.tenNguoi || 'Khách')} · ${gioVNs(t.luc)}</span>${escHtml(t.noiDung)}</p>`).join('')}
        <form class="gyi-f" data-tra="${g.id}"><label class="sr" for="tl${g.id}">Trả lời</label><input id="tl${g.id}" placeholder="Trả lời khách…" maxlength="1000">
          <button class="btn sec">Gửi</button></form>
        <label class="gyi-xl"><input type="checkbox" data-xl="${g.id}" ${g.daXuLy ? 'checked' : ''}> Đã xử lý</label>
      </div>`).join('')}</div></article>`;
  }).join('');
}

$('#gyBox').addEventListener('click', e => {
  const b = e.target.closest('[data-gyloc]'); if (!b) return;
  gyChiChuaXuLy = b.dataset.gyloc === '1'; veGopYStudio();
});
$('#gyBox').addEventListener('change', async e => {
  const id = e.target.dataset.xl; if (!id) return;
  try {
    const r = await api(`/api/admin/albums/${gyAlbum.id}/gop-y/${id}`, { method: 'PATCH', body: JSON.stringify({ daXuLy: e.target.checked }) });
    gyDs.find(g => g.id === id).daXuLy = e.target.checked;
    gyAlbum.gopYChuaXuLy = r.chuaXuLy; toast(e.target.checked ? 'Đã đánh dấu xử lý.' : 'Đã mở lại góp ý.');
    setTimeout(veGopYStudio, 350); window.taiLai && window.taiLai();
  } catch (err) { toast(err.message); e.target.checked = !e.target.checked; }
});
$('#gyBox').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, o = f.querySelector('input'), noiDung = o.value.trim();
  if (!noiDung) return o.focus();
  const nut = f.querySelector('button'); nut.disabled = true;
  try {
    const r = await api(`/api/admin/albums/${gyAlbum.id}/gop-y`, { method: 'POST', body: JSON.stringify({ parentId: f.dataset.tra, noiDung }) });
    gyDs.push({ ...r.gopY, tenAnh: '' }); veGopYStudio(); toast('Đã trả lời khách.');
  } catch (err) { toast(err.message); }
  nut.disabled = false;
});
