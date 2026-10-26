// Trang khách — cô dâu và chú rể chọn ảnh riêng, mỗi người trên máy mình. Máy nhớ "tôi là ai" (localStorage).
// Người nhà / bạn bè chỉ xem và góp ý, không đổi lựa chọn. Dùng chung biến của khach.js (A, chon, chonBoi, ...).
const TEN_NGUOI = { 'co-dau': 'Cô dâu', 'chu-re': 'Chú rể', 'nguoi-nha': 'Người nhà' };
let toi = (() => { try { return localStorage.getItem('nguoi-chon-cuoi') || ''; } catch { return ''; } })();
const laNguoiChon = () => toi === 'co-dau' || toi === 'chu-re';

const aiChon = id => chonBoi[id] || [];
// Ảnh chọn từ trước khi có chọn riêng (không ghi ai) thì coi như của cả hai — vẫn bỏ chọn được
const toiDaChon = id => (chonBoi[id] ? chonBoi[id].includes(toi) : !!chon[id]);
const caHaiChon = id => aiChon(id).length === 2;
const motNguoiChon = id => aiChon(id).length === 1;
const coChonRieng = () => Object.keys(chonBoi).length > 0;

function huyHieu(id) {
  return aiChon(id).map(n => `<i class="hh ${n}" title="${TEN_NGUOI[n]} đã chọn">${n === 'co-dau' ? 'D' : 'R'}</i>`).join('');
}
function aiDaChonChu(id) {
  const ai = aiChon(id);
  if (!chon[id]) return '';
  if (!ai.length) return 'Đã có trong lựa chọn';
  return ai.length === 2 ? 'Cô dâu và chú rể cùng chọn' : `${TEN_NGUOI[ai[0]]} đã chọn`;
}

function datToi(n) {
  toi = n;
  try { localStorage.setItem('nguoi-chon-cuoi', n); } catch { /* chế độ riêng tư */ }
  if (n !== 'nguoi-nha' && typeof tenKhach === 'function' && !tenKhach()) nhoTenKhach(TEN_NGUOI[n]); // gợi ý sẵn tên khi góp ý
  capNhat();
}

// Hỏi "anh/chị là ai" — trả về vai đã chọn, hoặc '' nếu khách bấm "Để sau"
function hoiLaAi() {
  return new Promise(xong => {
    const hop = $('#ai'); hop.hidden = false; hop.querySelector('[data-ai]').focus();
    hop.onclick = e => {
      const b = e.target.closest('[data-ai]'), huy = e.target.closest('#aiHuy');
      if (!b && !huy) return;
      hop.hidden = true; hop.onclick = null;
      if (b) datToi(b.dataset.ai);
      xong(b ? b.dataset.ai : '');
    };
  });
}

// Gọi trước mọi thao tác chọn: biết vai thì đi tiếp, người nhà thì báo không chọn được
async function duocChonKhong() {
  if (!toi && !(await hoiLaAi())) return false;
  if (toi === 'nguoi-nha') { toast('Người nhà chỉ xem và góp ý — cô dâu, chú rể sẽ chọn ảnh nhé.'); return false; }
  return true;
}

function veNguoiBar() {
  const dem = { 'co-dau': 0, 'chu-re': 0, hai: 0 };
  for (const id of Object.keys(chon)) { const ai = aiChon(id); ai.forEach(n => dem[n]++); if (ai.length === 2) dem.hai++; }
  $('#nguoiBar').innerHTML = `<button class="toi-chip" id="doiToi">${ic('edit', 14)}${toi ? `Bạn: <b>${TEN_NGUOI[toi]}</b>` : 'Bạn là ai?'}</button>`
    + (coChonRieng() ? `<span><i class="hh co-dau">D</i>${dem['co-dau']}</span><span><i class="hh chu-re">R</i>${dem['chu-re']}</span><span><i class="hh hai">✓</i>Cả hai ${dem.hai}</span>` : '');
}
$('#nguoiBar').addEventListener('click', e => { if (e.target.closest('#doiToi')) hoiLaAi(); });
