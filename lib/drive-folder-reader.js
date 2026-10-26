// Đọc danh sách ảnh trong một thư mục Google Drive đã chia sẻ "Bất kỳ ai có đường liên kết đều xem được".
// Không cần API key: trang embeddedfolderview của Drive trả về HTML liệt kê file của thư mục công khai.
// Thư mục con (vd "Phim trường", "Tiệc") được đọc thêm MỘT tầng và thành nhóm ảnh riêng.

const IMG_EXT = /\.(jpe?g|png|webp)$/i;

// Lấy mã thư mục từ mọi kiểu link Drive hay gặp, hoặc từ chính mã thư mục dán thẳng vào
function layFolderId(link) {
  const s = String(link || '').trim();
  const m = s.match(/folders\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/) || s.match(/^([\w-]{20,})$/);
  return m ? m[1] : null;
}

function giaiMaHtml(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

// Trả về [{ id, name, laThuMuc }] của đúng một thư mục
async function docMotThuMuc(folderId) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`, {
    headers: { 'Accept-Language': 'vi,en;q=0.8', 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) {
    throw new Error(res.status === 404
      ? 'Không mở được thư mục. Kiểm tra lại link và quyền chia sẻ "Bất kỳ ai có đường liên kết đều xem được".'
      : `Google Drive trả lỗi ${res.status}`);
  }
  const html = await res.text();
  const items = [];
  // Mỗi file/thư mục là một khối <div class="flip-entry" id="entry-<mã>"> có link và tên
  const re = /id="entry-([\w-]+)"[\s\S]*?href="([^"]+)"[\s\S]*?class="flip-entry-title"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(html))) {
    items.push({ id: m[1], name: giaiMaHtml(m[3].trim()), laThuMuc: m[2].includes('/folders/') });
  }
  return items;
}

const soSanhTen = (a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true });

// Danh sách ảnh của cả album: ảnh ở thư mục gốc (nhóm rỗng) + ảnh trong từng thư mục con (nhóm = tên thư mục con)
async function docAnhTrongThuMuc(folderId) {
  const goc = await docMotThuMuc(folderId);
  const anh = goc.filter(f => !f.laThuMuc && IMG_EXT.test(f.name)).sort(soSanhTen).map(f => ({ id: f.id, name: f.name, group: '' }));
  const thuMucCon = goc.filter(f => f.laThuMuc).sort(soSanhTen);
  const theoNhom = await Promise.all(thuMucCon.map(async tm => {
    const con = await docMotThuMuc(tm.id);
    return con.filter(f => !f.laThuMuc && IMG_EXT.test(f.name)).sort(soSanhTen).map(f => ({ id: f.id, name: f.name, group: tm.name }));
  }));
  return anh.concat(...theoNhom);
}

module.exports = { layFolderId, docAnhTrongThuMuc };
