// Đặt (hoặc đổi) tài khoản đăng nhập trang studio. Chạy trên máy chủ: npm run dat-mat-khau
// Mật khẩu gõ vào hiện thành dấu *, không ghi ra màn hình hay log. Đổi mật khẩu thì mọi phiên đăng nhập cũ bị đăng xuất.
// Đọc bàn phím từng phím ở chế độ raw (không dùng readline): readline + che chữ không hiện câu hỏi trong
// khung Terminal của app Claude trên Windows (đã gặp 26/10/2026 — user gõ mà không ăn).
const { datMatKhau, docTaiKhoan } = require('../lib/xac-thuc-studio');

// Một bộ đọc duy nhất cho cả chương trình: phím tới dồn một lượt (dán, gõ nhanh) vẫn giữ đủ cho câu hỏi sau
const vao = process.stdin;
let conDu = '', dangHoi = null; // dangHoi = { an, giaTri, xong }
if (vao.isTTY) vao.setRawMode(true);
vao.setEncoding('utf8');
vao.on('data', d => { conDu += d; xuLyPhim(); });
vao.on('end', () => { if (dangHoi) { console.log('\nThiếu dữ liệu, chưa lưu gì.'); process.exit(1); } });

function xuLyPhim() {
  while (dangHoi && conDu) {
    const c = conDu[0]; conDu = conDu.slice(1);
    if (c === '\r' || c === '\n') {
      if (c === '\r' && conDu[0] === '\n') conDu = conDu.slice(1);
      const { giaTri, xong } = dangHoi; dangHoi = null;
      process.stdout.write('\n');
      return xong(giaTri);
    }
    if (c === '\u0003') { process.stdout.write('\nĐã huỷ, chưa lưu gì.\n'); process.exit(1); } // Ctrl+C
    if (c === '\u007f' || c === '\b') {
      if (dangHoi.giaTri) { dangHoi.giaTri = dangHoi.giaTri.slice(0, -1); process.stdout.write('\b \b'); }
      continue;
    }
    if (c < ' ') continue; // bỏ phím điều khiển khác
    dangHoi.giaTri += c;
    process.stdout.write(dangHoi.an ? '*' : c);
  }
}

function hoi(cau, an = false) {
  return new Promise(xong => {
    process.stdout.write(cau);
    dangHoi = { an, giaTri: '', xong };
    xuLyPhim();
  });
}

(async () => {
  const cu = docTaiKhoan();
  console.log(cu ? `Đang có tài khoản "${cu.ten}". Nhập lại để đổi.` : 'Tạo tài khoản đăng nhập cho trang studio.');
  const ten = ((await hoi(`Tên đăng nhập (Enter để dùng "${cu?.ten || 'studio'}"): `)).trim() || cu?.ten || 'studio').toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(ten)) { console.log('Tên chỉ gồm chữ thường không dấu, số, dấu . _ -, dài 3–32 ký tự.'); process.exit(1); }
  const mk = await hoi('Mật khẩu (ít nhất 10 ký tự): ', true);
  if (mk.length < 10) { console.log('Mật khẩu quá ngắn — app mở ra internet nên cần ít nhất 10 ký tự. Chạy lại lệnh để nhập lại.'); process.exit(1); }
  const mk2 = await hoi('Nhập lại mật khẩu: ', true);
  if (mk !== mk2) { console.log('Hai lần nhập không khớp, chưa lưu gì. Chạy lại lệnh để nhập lại.'); process.exit(1); }
  datMatKhau(ten, mk);
  console.log(`Đã lưu tài khoản "${ten}". Mở trang studio và đăng nhập bằng tài khoản này.`);
  process.exit(0);
})();
