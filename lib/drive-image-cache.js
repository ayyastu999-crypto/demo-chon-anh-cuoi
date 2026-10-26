// Tải ảnh từ Google Drive về máy chủ rồi lưu lại, thay vì để trình duyệt khách gọi thẳng Google.
// Lý do: Google giới hạn số ảnh một trình duyệt tải liên tục — album hơn nghìn ảnh cuộn nhanh là bị từ chối hàng loạt.
// Ở đây chỉ tải tối đa vài ảnh cùng lúc, bị giới hạn (429) thì chờ rồi thử lại; ảnh đã tải thì lấy từ ổ đĩa.
const fs = require('fs');
const path = require('path');

const THU_MUC = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'cache-anh');
const KICH_THUOC = { nho: 600, lon: 2000 };
const TOI_DA_CUNG_LUC = 4;

let dangChay = 0;
const hangCho = [];
const dangTai = new Map(); // tránh tải trùng một ảnh khi nhiều người cùng xem

function xinLuot() {
  return new Promise(r => { if (dangChay < TOI_DA_CUNG_LUC) { dangChay++; r(); } else hangCho.push(r); });
}
function traLuot() {
  const ke = hangCho.shift();
  if (ke) ke(); else dangChay--;
}

async function taiTuGoogle(id, w) {
  for (let lan = 0; lan < 5; lan++) {
    const res = await fetch(`https://lh3.googleusercontent.com/d/${id}=w${w}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`Google trả lỗi ${res.status} cho ảnh này`);
    await new Promise(r => setTimeout(r, 700 * 2 ** lan)); // chờ tăng dần: 0,7s → 1,4s → 2,8s…
  }
  throw new Error('Google đang giới hạn tải ảnh, thử lại sau ít phút');
}

// Trả về đường dẫn file ảnh trên máy (tải về nếu chưa có). `co` = 'nho' | 'lon'.
async function layAnh(id, co) {
  const w = KICH_THUOC[co];
  if (!w) throw new Error('Cỡ ảnh không hợp lệ');
  const file = path.join(THU_MUC, `${id}_${w}.jpg`);
  if (fs.existsSync(file)) return file;
  if (dangTai.has(file)) return dangTai.get(file);
  const viec = (async () => {
    await xinLuot();
    try {
      if (fs.existsSync(file)) return file;
      const buf = await taiTuGoogle(id, w);
      fs.mkdirSync(THU_MUC, { recursive: true });
      fs.writeFileSync(file + '.tmp', buf);
      fs.renameSync(file + '.tmp', file);
      return file;
    } finally { traLuot(); }
  })();
  dangTai.set(file, viec);
  try { return await viec; } finally { dangTai.delete(file); }
}

module.exports = { layAnh };
