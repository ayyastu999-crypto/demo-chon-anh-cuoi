// Hai nghiệp vụ của giai đoạn 3 dùng chung một chỗ:
// 1) Ảnh đã chỉnh: ghép mỗi ảnh đã chỉnh với ảnh gốc cùng tên để khách kéo so sánh trước/sau.
// 2) Ai chọn ảnh nào: cô dâu và chú rể chọn riêng trên máy mình; album.chonBoi = { <mã ảnh>: ['co-dau','chu-re'] }.
//    album.chon vẫn là lựa chọn GỘP (studio dùng để in/chỉnh) — ảnh còn ít nhất một người chọn thì còn trong chon.

const NGUOI_CHON = ['co-dau', 'chu-re'];

// Tên để ghép: bỏ đuôi file, chữ thường. Không thấy thì bỏ thêm hậu tố sau dấu "_" hoặc "-" cuối
// (thợ chỉnh hay xuất "_PTP6802_edit.jpg", "IMG_0421-final.jpg").
const tenGhep = ten => ten.toLowerCase().replace(/\.[a-z0-9]+$/, '');
const boHauTo = ten => ten.replace(/[_-][^_-]*$/, '');

function ghepTruocSau(anhGoc, anhDaChinh) {
  const theoTen = new Map(anhGoc.map(f => [tenGhep(f.name), f.id]));
  return anhDaChinh.map(f => {
    const k = tenGhep(f.name);
    return { ...f, goc: theoTen.get(k) || theoTen.get(boHauTo(k)) || null };
  });
}

// Cập nhật lựa chọn của MỘT người. Trả về không gì — sửa trực tiếp album x.
// Không có `nguoi` (link cũ / người chưa xưng danh) thì giữ cách cũ: chọn/bỏ cho cả album.
function capNhatChon(x, maAnh, chon, kho, nguoi) {
  x.chonBoi = x.chonBoi || {};
  const ai = x.chonBoi[maAnh] || [];
  if (chon) {
    x.chon[maAnh] = kho;
    if (nguoi) x.chonBoi[maAnh] = [...new Set([...ai, nguoi])];
    return;
  }
  const con = nguoi ? ai.filter(n => n !== nguoi) : [];
  if (con.length) { x.chonBoi[maAnh] = con; x.chon[maAnh] = kho; } // người kia vẫn chọn → ảnh còn trong lựa chọn gộp
  else { delete x.chonBoi[maAnh]; delete x.chon[maAnh]; }
}

// Chia danh sách đã chọn theo người để studio biết chỗ hai bạn chọn lệch nhau
function chiaTheoNguoi(a, tenTheoMa) {
  const kq = { caHai: [], chiCoDau: [], chiChuRe: [], chuaRo: [] };
  for (const ma of Object.keys(a.chon)) {
    const ai = (a.chonBoi || {})[ma] || [];
    const ten = tenTheoMa[ma] || ma;
    if (ai.includes('co-dau') && ai.includes('chu-re')) kq.caHai.push(ten);
    else if (ai.includes('co-dau')) kq.chiCoDau.push(ten);
    else if (ai.includes('chu-re')) kq.chiChuRe.push(ten);
    else kq.chuaRo.push(ten);
  }
  for (const k of Object.keys(kq)) kq[k].sort();
  return kq;
}

module.exports = { NGUOI_CHON, ghepTruocSau, capNhatChon, chiaTheoNguoi };
