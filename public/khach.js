// Trang khách: thiệp chào + nhạc nền → lưới ảnh từ Google Drive → chọn ảnh, gắn khổ in theo hạn mức → Chọn xong.
// Studio đã chuyển đơn sang bước chỉnh ảnh trở đi thì trang chỉ còn xem, không sửa lựa chọn được nữa.
const $ = s => document.querySelector(s);
const token = location.pathname.split('/').pop();
// Ảnh nhỏ / ảnh lớn đi qua máy chủ của app (máy chủ tải hộ từ Drive và lưu lại — xem lib/drive-image-cache.js)
const anhNho = id => `/anh/nho/${id}`;
const anhLon = id => `/anh/lon/${id}`;
// Máy chủ đang chờ Google (503) thì thử lại vài lần, giãn dần
window.thuLaiAnh = img => {
  const n = +(img.dataset.n || 0);
  if (n >= 3) return;
  img.dataset.n = n + 1;
  setTimeout(() => { img.src = img.src.split('?')[0] + '?r=' + (n + 1); }, 2500 * (n + 1));
};
const BUOC = ['Chọn ảnh', 'Studio chỉnh ảnh', 'Duyệt ảnh', 'In ảnh', 'Nhận ảnh'];

let A = null, chon = {}, chonBoi = {}, tab = 'all', dangXem = -1, dsHien = [], dangOThiep = true;

async function api(url, opt = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.loi || `Lỗi ${res.status}`);
  return data;
}
function toast(msg) {
  // Đang xem ảnh lớn → báo ngay trong bảng điều khiển (dưới ảnh / cột phải) thay vì đè lên ảnh
  if (dangXem > -1) {
    const tb = $('#lbTb'); tb.textContent = msg; tb.hidden = false;
    clearTimeout(toast.hLb); toast.hLb = setTimeout(() => { tb.hidden = true; }, 3500);
    return;
  }
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3200);
}
function demKho() {
  const d = Object.fromEntries(A.khoIn.map(k => [k, 0]));
  Object.values(chon).forEach(ks => ks.forEach(k => d[k]++));
  return d;
}

// ---------- Thiệp chào + nhạc nền ----------
function veThiep() {
  const [t1, t2] = A.coDauChuRe.split('&').map(s => s.trim());
  $('#ten1').textContent = t1 || A.coDauChuRe; $('#ten2').textContent = t2 || '';
  $('#amp').hidden = !t2;
  $('#ngay').textContent = A.ngayCuoi ? A.ngayCuoi.split('-').reverse().join(' · ') : '';
  $('#loiNhan').textContent = A.loiNhan || 'Cảm ơn anh chị đã tin tưởng studio lưu giữ ngày hạnh phúc. Mời anh chị thong thả xem và chọn những khoảnh khắc mình yêu thích nhất.';
  if (A.anh[0]) $('#heroBg').style.backgroundImage = `url("${anhLon(A.anh[0].id)}")`;
  document.title = `${A.coDauChuRe} · Wedding Album`;
}

const audio = $('#audio'), nutNhac = $('#nhac');
const nhoTatNhac = () => { try { return localStorage.getItem('tat-nhac') === '1'; } catch { return false; } };
function ghiNhoNhac(tat) { try { localStorage.setItem('tat-nhac', tat ? '1' : '0'); } catch { /* chế độ riêng tư */ } }
function capNhatNutNhac() {
  const dangPhat = !audio.paused;
  nutNhac.setAttribute('aria-pressed', dangPhat); nutNhac.setAttribute('aria-label', dangPhat ? 'Tắt nhạc nền' : 'Bật nhạc nền');
  $('#nhacIc').innerHTML = ic(dangPhat ? 'music' : 'mute', 20);
}
async function batNhac() {
  if (!audio.src) audio.src = A.nhacNen;
  audio.volume = 0; try { await audio.play(); } catch { return capNhatNutNhac(); }
  const iv = setInterval(() => { audio.volume = Math.min(.55, audio.volume + .05); if (audio.volume >= .55) clearInterval(iv); }, 120);
  capNhatNutNhac();
}
nutNhac.onclick = () => { if (audio.paused) { ghiNhoNhac(false); batNhac(); } else { audio.pause(); ghiNhoNhac(true); capNhatNutNhac(); } };

// Tự phát nhạc khi mở trang. Trình duyệt chặn phát tiếng khi khách chưa chạm vào trang →
// thử ngay, bị chặn thì lần chạm / bấm phím đầu tiên ở bất kỳ đâu sẽ bật (trừ chính nút loa).
// Khách đã tắt nhạc thì nhớ, không tự bật lại.
function tuPhatNhac() {
  if (nhoTatNhac()) return;
  batNhac();
  const moKhoa = e => {
    if (nutNhac.contains(e.target)) return;
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.removeEventListener(ev, moKhoa));
    if (audio.paused && !nhoTatNhac()) batNhac();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, moKhoa, { passive: true }));
}

// ---------- Thanh tiến độ + lưới ----------
function veBuoc() {
  $('#steps').innerHTML = BUOC.map((t, i) => `<li class="${i + 1 === A.buoc ? 'on' : i + 1 < A.buoc ? 'xong' : ''}" ${i + 1 === A.buoc ? 'aria-current="step"' : ''}><i>${i + 1}</i>${t}</li>`).join('');
  $('#help').innerHTML = tab === 'sua'
    ? `${ic('refresh', 22)}<span>Đây là <b>ảnh studio đã chỉnh</b>. Bấm vào ảnh rồi chọn <b>So sánh trước / sau</b> để kéo xem khác biệt, góp ý nếu cần sửa thêm.${A.duocDuyet ? ' Xem xong bấm <b>Duyệt ảnh đã chỉnh</b>.' : ''}</span>`
    : A.duocChon
    ? `${ic('image', 22)}<span>Bấm <b>Chọn</b> ở ảnh anh chị thích. Bấm vào ảnh để xem lớn và gắn <b>khổ in</b>. Chọn xong bấm <b>Chọn xong</b>.</span>`
    : `${ic('lock', 22)}<span>Studio đang ở bước <b>${A.tenTrangThai}</b>. Lựa chọn của anh chị đã được khoá để studio xử lý — anh chị vẫn xem ảnh bình thường.</span>`;
  document.body.classList.toggle('khoa', !A.duocChon);
}
function veThanh() {
  const d = demKho(), n = Object.keys(chon).length;
  $('#soChon').textContent = n;
  $('#khos').innerHTML = A.khoIn.map(k => {
    const han = A.hanMuc[k];
    if (!han && !d[k]) return '';
    return `<span class="${han && d[k] > han ? 'vuot' : ''}">${k} <b>${d[k]}${han ? '/' + han : ''}</b>${han && d[k] > han ? ' vượt gói' : ''}</span>`;
  }).join('');
  $('#btnXong').classList.toggle('show', n > 0 && A.duocChon && !dangOThiep && tab !== 'sua');
  veNguoiBar(); veNutDuyet();
}

// Các tab lọc: tab "cả hai / một người" chỉ hiện khi đã có chọn riêng; tab "ảnh đã chỉnh" khi studio đã gắn ảnh chỉnh
function veTabs() {
  const ds = [['all', `Tất cả (${A.anh.length.toLocaleString('vi')})`], ['sel', 'Đã chọn']];
  if (coChonRieng()) ds.push(['hai', 'Cả hai chọn'], ['mot', 'Một người chọn']);
  if ((A.anhDaChinh || []).length) ds.push(['sua', `Ảnh đã chỉnh (${A.anhDaChinh.length})`]);
  if (!ds.some(([k]) => k === tab)) tab = 'all';
  $('#tabs').innerHTML = ds.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}">${t}</button>`).join('');
}
function theAnh(f, i) {
  const ks = chon[f.id], cuaToi = ks && toiDaChon(f.id), soGy = (A.gopY || []).filter(g => g.maAnh === f.id && !g.parentId).length;
  return `<div class="it ${ks ? 'sel' : ''} ${caHaiChon(f.id) ? 'hai' : ''}" data-i="${i}">
    <span class="hhs">${huyHieu(f.id)}</span>
    <img loading="lazy" decoding="async" src="${anhNho(f.id)}" onload="this.classList.add('ok')" onerror="thuLaiAnh(this)" alt="Ảnh ${escHtml(f.name)}">
    <span class="nm">${escHtml(f.name.replace(/\.\w+$/, ''))}</span>
    ${soGy ? `<span class="gyc" aria-label="${soGy} góp ý">${ic('message', 14)}${soGy}</span>` : ''}
    <div class="tg">${(ks || []).map(k => `<span>${escHtml(k)}</span>`).join('')}</div>
    <button class="ch ${cuaToi ? 'toi' : ''}" data-chon="${i}" aria-pressed="${!!cuaToi}" aria-label="${cuaToi ? 'Bỏ chọn' : 'Chọn'} ảnh ${escHtml(f.name)}">${cuaToi ? ic('check', 16) + 'Đã chọn' : 'Chọn'}</button></div>`;
}
function veLuoi() {
  veTabs(); veBuoc();
  const loc = { all: () => true, sel: f => chon[f.id], hai: f => caHaiChon(f.id), mot: f => motNguoiChon(f.id) };
  dsHien = tab === 'sua' ? A.anhDaChinh : A.anh.filter(loc[tab]);
  if (!dsHien.length) {
    $('#groups').innerHTML = `<p class="empty">${tab === 'hai' ? 'Chưa có ảnh nào cả hai cùng chọn.' : tab === 'mot' ? 'Không còn ảnh nào chỉ một người chọn — hai bạn đã thống nhất.' : 'Anh chị chưa chọn ảnh nào.'}</p>`;
    return veThanh();
  }
  const ve = tab === 'sua' ? theAnhSua : theAnh;
  const nhom = new Map();
  dsHien.forEach((f, i) => { if (!nhom.has(f.group)) nhom.set(f.group, []); nhom.get(f.group).push(ve(f, i)); });
  $('#groups').innerHTML = [...nhom].map(([g, html]) => `${g ? `<h2 class="gh">${escHtml(g)}</h2>` : ''}<div class="grid">${html.join('')}</div>`).join('');
  veThanh();
}

// ---------- Chọn ảnh + khổ in ----------
// Gửi lựa chọn của người đang dùng máy; máy chủ trả về lựa chọn gộp + ai chọn ảnh nào (nguồn đúng duy nhất)
async function luu(f, co, kho) {
  try {
    const r = await api(`/api/a/${token}/chon`, { method: 'PUT', body: JSON.stringify({ maAnh: f.id, chon: co, kho, nguoi: laNguoiChon() ? toi : undefined }) });
    chon = r.chon; chonBoi = r.chonBoi || {};
  } catch (e) { toast('Chưa lưu được: ' + e.message); }
  capNhat();
}
async function datChon(f, co) {
  if (!A.duocChon || !(await duocChonKhong())) return;
  await luu(f, co, chon[f.id] || []);
}
async function batKho(f, k) {
  if (!A.duocChon || !(await duocChonKhong())) return;
  const ks = [...(chon[f.id] || [])], i = ks.indexOf(k);
  if (i > -1) ks.splice(i, 1); else ks.push(k);
  const han = A.hanMuc[k], dem = demKho()[k] + (i === -1 ? 1 : -1);
  if (i === -1 && han && dem > han) toast(`Khổ ${k} đã vượt gói (${dem}/${han}) — studio sẽ báo phí in thêm.`);
  await luu(f, true, ks); // gắn khổ = người này cũng chọn ảnh
}
function capNhat() { veLuoi(); if (dangXem > -1) veLb(); }

// ---------- Xem ảnh lớn ----------
let nutMoLb = null;
function moLb(i) { nutMoLb = document.activeElement; dangXem = i; $('#lb').hidden = false; document.body.style.overflow = 'hidden'; veLb(); $('#lbDong').focus(); }
function dongLb() { dangXem = -1; $('#lb').hidden = true; document.body.style.overflow = ''; nutMoLb?.focus?.(); }
function chuyen(b) { if (!dsHien.length) return; dangXem = (dangXem + b + dsHien.length) % dsHien.length; veLb(); }
function veLb() {
  const f = dsHien[dangXem]; if (!f) return dongLb();
  const ks = chon[f.id], cuaToi = ks && toiDaChon(f.id), d = demKho(), img = $('#lbAnh');
  if (img.dataset.id !== f.id) {
    // Sang ảnh khác thì bỏ dở góp ý đang soạn (của ảnh trước)
    if (typeof gy !== 'undefined') { gy.diem = null; gy.cheDoGhim = false; gy.sangId = null; $('#gyForm').hidden = true; }
    img.style.opacity = .3; img.onload = () => { img.style.opacity = 1; }; img.src = anhLon(f.id); img.dataset.id = f.id; img.alt = 'Ảnh ' + f.name;
    const ke = dsHien[(dangXem + 1) % dsHien.length]; if (ke) new Image().src = anhLon(ke.id); // tải trước ảnh kế tiếp
  }
  $('#lbTen').textContent = f.name;
  const nut = $('#lbChon');
  nut.className = 'sel' + (cuaToi ? ' on' : ''); nut.disabled = !A.duocChon; nut.setAttribute('aria-pressed', !!cuaToi);
  nut.innerHTML = !A.duocChon ? `${ks ? 'Ảnh anh chị đã chọn' : 'Đã khoá lựa chọn'}` : cuaToi ? `<span>${ic('check', 18)} Đã chọn ảnh này</span><small>Bấm lần nữa để bỏ chọn</small>` : 'Chọn ảnh này';
  $('#lbAi').innerHTML = huyHieu(f.id) + escHtml(aiDaChonChu(f.id));
  $('#lbKhos').innerHTML = A.khoIn.map(k => `<button data-kho="${escHtml(k)}" class="${ks && ks.includes(k) ? 'on' : ''}" aria-pressed="${!!(ks && ks.includes(k))}" ${A.duocChon ? '' : 'disabled'}>Ảnh ${escHtml(k)}${A.hanMuc[k] ? `<small>${d[k]}/${A.hanMuc[k]}</small>` : ''}</button>`).join('');
  $('#lbCnt').textContent = `${dangXem + 1} / ${dsHien.length} · Đã chọn ${Object.keys(chon).length}`;
  if (typeof veGopYLb === 'function') veGopYLb();
  if (typeof veSoSanhLb === 'function') veSoSanhLb();
}

// ---------- Hướng dẫn 4 bước ----------
const HD = [
  ['Xem ảnh', 'Kéo xuống để xem hết ảnh. <b>Bấm vào một ảnh</b> để xem lớn, <b>vuốt trái / phải</b> hoặc bấm mũi tên để qua ảnh khác.'],
  ['Chọn ảnh', 'Bấm nút <b>Chọn</b> ở góc ảnh, hoặc <b>Chọn ảnh này</b> khi đang xem lớn. Ảnh đã chọn có viền sáng.'],
  ['Gắn khổ in', 'Khi xem lớn, bấm <b>Ảnh 60x90, Ảnh bàn, Ảnh album…</b> để báo studio in ảnh đó khổ nào. Thanh trên cùng đếm theo gói.'],
  ['Chọn xong', 'Chọn xong bấm <b>Chọn xong</b> ở góc dưới. Anh chị vẫn mở lại link để đổi ý được, tới khi studio bắt đầu chỉnh ảnh.'],
];
let hdI = 0;
function veHd() {
  $('#hdBuoc').textContent = `BƯỚC ${hdI + 1} / ${HD.length}`;
  $('#hdNd').innerHTML = `<h2 id="hdTitle">${HD[hdI][0]}</h2><p>${HD[hdI][1]}</p>`;
  $('#hdDots').innerHTML = HD.map((_, i) => `<i class="${i === hdI ? 'on' : ''}"></i>`).join('');
  $('#hdTruoc').style.visibility = hdI ? 'visible' : 'hidden';
  $('#hdSau').textContent = hdI === HD.length - 1 ? 'Bắt đầu chọn' : 'Tiếp theo →';
}
const dongModal = id => { $(id).hidden = true; };

// ---------- Sự kiện ----------
$('#btnXem').onclick = () => { if (!nhoTatNhac()) batNhac(); $('#main').scrollIntoView(); setTimeout(doThiep, 800); };
$('#btnHd').onclick = () => { if (!nhoTatNhac() && audio.paused) batNhac(); hdI = 0; veHd(); $('#hd').hidden = false; $('#hdSau').focus(); };
$('#hdTruoc').onclick = () => { hdI--; veHd(); };
$('#hdSau').onclick = () => { if (hdI < HD.length - 1) { hdI++; veHd(); } else { dongModal('#hd'); $('#main').scrollIntoView(); setTimeout(doThiep, 800); } };
$('#hdDong').onclick = () => dongModal('#hd');
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab; veLuoi();
});
$('#groups').addEventListener('click', e => {
  const nut = e.target.closest('[data-chon]');
  if (nut) { const f = dsHien[+nut.dataset.chon]; return datChon(f, !(chon[f.id] && toiDaChon(f.id))); }
  const it = e.target.closest('.it'); if (it) moLb(+it.dataset.i);
});
$('#lbDong').onclick = dongLb; $('#lbTruoc').onclick = () => chuyen(-1); $('#lbSau').onclick = () => chuyen(1);
$('#lbChon').onclick = () => { const f = dsHien[dangXem]; datChon(f, !(chon[f.id] && toiDaChon(f.id))); };
$('#lbKhos').addEventListener('click', e => { const b = e.target.closest('[data-kho]'); if (b) batKho(dsHien[dangXem], b.dataset.kho); });
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (dangXem > -1) dongLb(); dongModal('#hd'); dongModal('#xong'); return; }
  if (dangXem < 0) return;
  if (e.key === 'ArrowLeft') chuyen(-1);
  if (e.key === 'ArrowRight') chuyen(1);
});
let x0 = null, y0 = null;
$('.lb-img').addEventListener('touchstart', e => { if (e.touches.length > 1) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
$('.lb-img').addEventListener('touchend', e => {
  if (x0 === null) return;
  const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) chuyen(dx < 0 ? 1 : -1);
  x0 = null;
});

$('#btnXong').onclick = () => {
  const d = demKho(), n = Object.keys(chon).length;
  const vuot = A.khoIn.filter(k => A.hanMuc[k] && d[k] > A.hanMuc[k]);
  $('#xongTieuDe').textContent = `Gửi ${n} ảnh cho studio?`;
  $('#xongNd').innerHTML = (A.khoIn.filter(k => d[k]).map(k => `${k}: <b>${d[k]}${A.hanMuc[k] ? '/' + A.hanMuc[k] : ''}</b>`).join(' · ') || 'Anh chị chưa gắn khổ in cho ảnh nào.') +
    (vuot.length ? `<br><br>Khổ <b>${vuot.join(', ')}</b> đang vượt gói — studio sẽ liên hệ báo phí in thêm.` : '');
  $('#xong').hidden = false; $('#xongOk').focus();
};
$('#xongHuy').onclick = () => dongModal('#xong');
$('#xongOk').onclick = async () => {
  const b = $('#xongOk'); b.disabled = true; b.textContent = 'Đang gửi…';
  try { await api(`/api/a/${token}/chon-xong`, { method: 'POST' }); dongModal('#xong'); $('#camOn').hidden = false; }
  catch (e) { toast(e.message); }
  b.disabled = false; b.textContent = 'Gửi studio';
};
$('#camOnDong').onclick = () => {
  $('#camOn').hidden = true; tab = 'sel';
  veLuoi(); $('#main').scrollIntoView(); setTimeout(doThiep, 800);
};

// Gắn icon vào các nút chỉ có icon
$('#lbDong').innerHTML = ic('x', 18) + 'Đóng';
$('#lbTruoc').innerHTML = ic('left', 26); $('#lbSau').innerHTML = ic('right', 26);
$('#hdDong').innerHTML = ic('x', 22);
$('#btnXong').innerHTML = ic('check', 20) + 'Chọn xong';
$('#btnDuyet').innerHTML = ic('check', 20) + 'Duyệt ảnh đã chỉnh';
capNhatNutNhac();
// Trang thiệp còn chiếm phần lớn màn hình thì ẩn nút "Chọn xong" cho khỏi che thiệp.
// Đo trực tiếp khi cuộn (IntersectionObserver không báo lại ở một số trình duyệt/khung xem — đã gặp 26/10).
function doThiep() {
  const o = $('#hero').getBoundingClientRect().bottom > innerHeight * 0.4;
  if (o !== dangOThiep) { dangOThiep = o; if (A) veThanh(); }
}
addEventListener('scroll', doThiep, { passive: true });
addEventListener('resize', doThiep);

(async () => {
  try {
    A = await api(`/api/a/${token}`); chon = A.chon || {}; chonBoi = A.chonBoi || {};
    if ((A.anhDaChinh || []).length && A.buoc >= 3) tab = 'sua'; // đã tới bước duyệt → mở sẵn tab ảnh đã chỉnh
    if (A.hetHan) {
      document.body.insertAdjacentHTML('beforeend', `<div id="hetHan"><div><p class="wa">WEDDING ALBUM</p><h2>Album đã hết hạn lưu</h2><p>Album của ${escHtml(A.coDauChuRe)} đã hết hạn xem trên mạng. Anh chị liên hệ studio nếu cần lấy lại ảnh.</p></div></div>`);
      return;
    }
    veThiep(); veBuoc(); veLuoi(); tuPhatNhac();
  } catch (e) { document.body.innerHTML = `<p class="empty" style="padding:80px 20px">${escHtml(e.message)}</p>`; }
})();
