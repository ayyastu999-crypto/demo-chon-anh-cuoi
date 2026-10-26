// Trang chủ quản lý dự án: số liệu tổng, lọc theo 8 trạng thái, thẻ album và các thao tác nhanh.
let DS = [], TT = [], loc = 'tat-ca', tuKhoa = '';
const homNay = () => new Date().toISOString().slice(0, 10);
const soNgayToi = d => Math.round((new Date(d) - new Date(homNay())) / 864e5);
const viTri = ma => TT.findIndex(t => t.ma === ma);
const linkKhach = a => `${location.origin}/a/${a.token}`;

// Trạng thái cần studio làm gì tiếp → đổi màu nhãn cho nổi
const CAN_LAM = ['da-chon-xong', 'da-duyet', 'bao-lay'];

$('#btnTao').innerHTML = ic('plus') + 'Tạo album';
$('#fab').innerHTML = ic('plus') + 'Tạo album';
$('#navDuAn').innerHTML = ic('grid') + 'Dự án';
$('#icSearch').innerHTML = ic('search', 18);
document.querySelectorAll('[data-mo="tao"]').forEach(b => b.addEventListener('click', () => moForm()));

function sapHetHan(a) { return a.hanLuu && !a.hetHan && soNgayToi(a.hanLuu) <= 7; }

function veThongKe() {
  const anh = DS.reduce((s, a) => s + a.soAnh, 0);
  const canLam = DS.filter(a => a.trangThai === 'da-chon-xong').length;
  const sapHet = DS.filter(sapHetHan).length;
  $('#stats').innerHTML = `
    <div class="stat"><span>${ic('folder', 16)}Album</span><b>${DS.length}</b></div>
    <div class="stat"><span>${ic('image', 16)}Ảnh gốc</span><b>${anh.toLocaleString('vi')}</b></div>
    <button class="stat ${canLam ? 'hot' : ''}" data-loc="da-chon-xong"><span>${ic('check', 16)}Khách chọn xong, chờ chỉnh</span><b>${canLam}</b></button>
    <button class="stat ${sapHet ? 'hot' : ''}" data-loc="sap-het"><span>${ic('clock', 16)}Sắp hết hạn lưu (≤ 7 ngày)</span><b>${sapHet}</b></button>`;
}

function veBoLoc() {
  const dem = ma => DS.filter(a => a.trangThai === ma).length;
  const chips = [{ ma: 'tat-ca', ten: 'Tất cả', n: DS.length }, ...TT.map(t => ({ ma: t.ma, ten: t.ten, n: dem(t.ma) }))];
  if (DS.some(sapHetHan)) chips.push({ ma: 'sap-het', ten: 'Sắp hết hạn lưu', n: DS.filter(sapHetHan).length });
  $('#chips').innerHTML = chips.filter(c => c.ma === 'tat-ca' || c.n || c.ma === loc)
    .map(c => `<button class="chip ${c.ma === loc ? 'on' : ''}" role="tab" aria-selected="${c.ma === loc}" data-loc="${c.ma}">${escHtml(c.ten)}<em>${c.n}</em></button>`).join('');
}

function theHanLuu(a) {
  if (!a.hanLuu) return '';
  if (a.hetHan) return `<span class="keep out">${ic('clock', 14)}Hết hạn lưu</span>`;
  const n = soNgayToi(a.hanLuu);
  return `<span class="keep ${n <= 7 ? 'soon' : ''}">${ic('clock', 14)}Còn ${n} ngày</span>`;
}

function theKho(a) {
  return KHO_IN.map(k => {
    const han = a.hanMuc[k], dem = a.demKho[k];
    if (!han && !dem) return '';
    return `<span class="${han && dem > han ? 'vuot' : ''}">${k} <b>${dem}${han ? '/' + han : ''}</b>${han && dem > han ? ' · vượt' : ''}</span>`;
  }).join('');
}

function theAlbum(a) {
  const i = viTri(a.trangThai), tt = TT[i], ke = TT[i + 1];
  const loaiNhan = a.trangThai === 'da-giao' ? 'done' : CAN_LAM.includes(a.trangThai) ? 'act' : '';
  return `<article class="card" data-id="${a.id}">
    <div class="cover">${a.anhBia ? `<img loading="lazy" src="/anh/nho/${a.anhBia}" alt="Ảnh bìa album ${escHtml(a.coDauChuRe)}">` : ''}
      <span class="badge ${loaiNhan}"><i></i>${escHtml(tt.ten)}</span>${theHanLuu(a)}</div>
    <div class="body">
      <h3>${escHtml(a.coDauChuRe)}</h3>
      <p class="meta">${a.ngayCuoi ? `<span>Cưới <b>${ngayVN(a.ngayCuoi)}</b></span>` : ''}<span><b>${a.soAnh.toLocaleString('vi')}</b> ảnh</span><span>Đã chọn <b>${a.soChon}</b></span>
        ${a.soAnhDaChinh ? `<span><b>${a.soAnhDaChinh}</b> ảnh đã chỉnh</span>` : ''}
        ${a.gopYChuaXuLy ? `<span class="gy-cho">${a.gopYChuaXuLy} góp ý chờ xử lý</span>` : ''}
        ${a.ngayHenTra ? `<span>Hẹn trả <b>${ngayVN(a.ngayHenTra)}</b></span>` : ''}</p>
      <div class="track" aria-hidden="true">${TT.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
      <p class="track-l">Bước ${i + 1}/${TT.length}</p>
      ${theKho(a) ? `<div class="kho">${theKho(a)}</div>` : ''}
      <div class="flow">
        <label class="sr" for="tt${a.id}">Trạng thái</label>
        <select id="tt${a.id}" data-act="trang-thai">${TT.map(t => `<option value="${t.ma}" ${t.ma === a.trangThai ? 'selected' : ''}>${escHtml(t.ten)}</option>`).join('')}</select>
        ${ke ? `<button class="btn pri" data-act="ke" title="Chuyển sang: ${escHtml(ke.ten)}">${ic('arrow', 18)}<span class="sr">Chuyển sang ${escHtml(ke.ten)}</span></button>` : ''}
      </div>
      <div class="acts">
        <button class="btn ghost" data-act="chep">${ic('link', 18)}Chép link</button>
        <a class="btn ghost" href="/a/${a.token}" target="_blank" rel="noopener">${ic('external', 18)}Trang khách</a>
        <button class="btn ghost" data-act="ket-qua">${ic('list', 18)}Kết quả</button>
        <button class="btn ghost ${a.gopYChuaXuLy ? 'co-viec' : ''}" data-act="gop-y">${ic('message', 18)}Góp ý${a.soGopY ? `<em>${a.gopYChuaXuLy || a.soGopY}</em>` : ''}</button>
        <button class="btn ghost" data-act="bao">${ic('external', 18)}Báo khách</button>
        <details class="more"><summary class="btn ghost" aria-label="Thêm thao tác">${ic('more', 18)}</summary>
          <div class="menu"><button class="btn ghost" data-act="sua">${ic('edit', 18)}Sửa album</button>
            <button class="btn ghost" data-act="quet">${ic('refresh', 18)}Quét lại Drive</button>
            <a class="btn ghost" href="${escHtml(a.linkDrive)}" target="_blank" rel="noopener">${ic('folder', 18)}Mở Drive</a>
            <button class="btn ghost danger" data-act="xoa">${ic('trash', 18)}Gỡ khỏi app</button></div></details>
      </div>
    </div></article>`;
}

function veDanhSach() {
  const q = tuKhoa.trim().toLowerCase();
  const ds = DS.filter(a => (loc === 'tat-ca' || (loc === 'sap-het' ? sapHetHan(a) : a.trangThai === loc)) && (!q || a.coDauChuRe.toLowerCase().includes(q)));
  $('#list').innerHTML = ds.length ? ds.map(theAlbum).join('')
    : DS.length ? '<div class="empty"><h3>Không có album phù hợp</h3><p>Thử bỏ bộ lọc hoặc tìm tên khác.</p></div>'
      : `<div class="empty"><h3>Chưa có dự án nào</h3><p>Dán link thư mục Google Drive để tạo album đầu tiên.</p><p style="margin-top:16px"><button class="btn pri" data-mo-rong>${ic('plus')}Tạo album</button></p></div>`;
}

function veTatCa() { veThongKe(); veBoLoc(); veDanhSach(); }

window.taiLai = async () => {
  const r = await api('/api/admin/albums');
  TT = r.trangThai;
  DS = r.albums.sort((x, y) => (y.capNhatLuc || '').localeCompare(x.capNhatLuc || ''));
  veTatCa();
};

// Tin nhắn soạn sẵn theo trạng thái — chép rồi mở Zalo của khách để dán
function tinNhan(a) {
  const ten = a.coDauChuRe, link = linkKhach(a);
  if (['dang-chinh'].includes(a.trangThai)) return `Chào ${ten}, studio đã nhận lựa chọn và đang chỉnh ảnh. Hẹn trả ảnh ${ngayVN(a.ngayHenTra) || 'sớm nhất'}.`;
  if (['cho-duyet', 'da-duyet'].includes(a.trangThai)) return `Chào ${ten}, ảnh cưới đã chỉnh xong. Mời anh chị xem và duyệt tại: ${link}${a.hanLuu ? `\nẢnh được lưu tới ${ngayVN(a.hanLuu)}.` : ''}`;
  if (['dang-in', 'bao-lay', 'da-giao'].includes(a.trangThai)) return `Chào ${ten}, ảnh in đã xong. Anh chị ghé studio nhận ảnh giúp em nhé.`;
  return `Chào ${ten}, ảnh cưới đã sẵn sàng. Mời anh chị xem và chọn ảnh tại: ${link}`;
}

async function doiTrangThai(a, ma) {
  const sau = await api(`/api/admin/albums/${a.id}`, { method: 'PATCH', body: JSON.stringify({ trangThai: ma }) });
  Object.assign(a, sau); veTatCa();
  toast(`“${a.coDauChuRe}” → ${TT[viTri(ma)].ten}${ma === 'cho-duyet' && a.hanLuu ? ` · lưu ảnh tới ${ngayVN(a.hanLuu)}` : ''}`);
}

document.addEventListener('click', async e => {
  const loc1 = e.target.closest('[data-loc]');
  if (loc1) { loc = loc === loc1.dataset.loc && loc1.classList.contains('stat') ? 'tat-ca' : loc1.dataset.loc; return veTatCa(); }
  if (e.target.closest('[data-mo-rong]')) return moForm();
  const nut = e.target.closest('[data-act]'); if (!nut || nut.tagName === 'SELECT') return;
  const a = DS.find(x => x.id === +nut.closest('.card').dataset.id);
  nut.closest('details')?.removeAttribute('open');
  try {
    switch (nut.dataset.act) {
      case 'chep': if (await chepChu(linkKhach(a))) toast('Đã chép link khách.'); break;
      case 'ket-qua': moKetQua(a.id); break;
      case 'gop-y': moGopY(a); break;
      case 'sua': moForm(a); break;
      case 'ke': await doiTrangThai(a, TT[viTri(a.trangThai) + 1].ma); break;
      case 'bao':
        await chepChu(tinNhan(a));
        if (a.sdtZalo) { window.open(`https://zalo.me/${a.sdtZalo}`, '_blank', 'noopener'); toast('Đã chép tin nhắn — dán vào khung chat Zalo vừa mở.'); }
        else toast('Đã chép tin nhắn. Album chưa có SĐT Zalo — thêm trong Sửa album để mở Zalo nhanh.');
        break;
      case 'quet': {
        nut.disabled = true;
        const sau = await api(`/api/admin/albums/${a.id}/quet-lai`, { method: 'POST' });
        Object.assign(a, sau); veTatCa(); toast(`Đã quét lại: ${sau.soAnh.toLocaleString('vi')} ảnh.`); break;
      }
      case 'xoa':
        if (!confirm(`Gỡ album “${a.coDauChuRe}” khỏi app?\nLựa chọn của khách sẽ mất. Ảnh trên Google Drive vẫn giữ nguyên.`)) return;
        await api(`/api/admin/albums/${a.id}`, { method: 'DELETE' });
        DS = DS.filter(x => x !== a); veTatCa(); toast('Đã gỡ album khỏi app.'); break;
    }
  } catch (err) { toast(err.message); nut.disabled = false; }
});

document.addEventListener('change', e => {
  if (e.target.dataset.act !== 'trang-thai') return;
  const a = DS.find(x => x.id === +e.target.closest('.card').dataset.id);
  doiTrangThai(a, e.target.value).catch(err => toast(err.message));
});
// Đóng menu "…" khi bấm ra ngoài
document.addEventListener('click', e => document.querySelectorAll('details.more[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }));
$('#q').addEventListener('input', e => { tuKhoa = e.target.value; veDanhSach(); });

taiLai().catch(err => { $('#list').innerHTML = `<p class="ferr">${escHtml(err.message)}</p>`; });
