---
title: Sửa 4 lỗi giao diện trang khách trước so sánh trước/sau
date: 2026-10-26
summary: "Ghim sát mép, thông báo đè ảnh, nút Chọn xong che thiệp, ảnh lớn bị nhỏ trên điện thoại"
---

# Sửa 4 lỗi giao diện trang khách trước so sánh trước/sau

## What happened
- Ghim góp ý sát mép trên tràn khỏi ảnh: thân ghim luôn vẽ phía trên điểm chạm. Sửa: lật ghim (`.pin.lat`, biến `--xoay`) khi điểm cách mép < 40px.
  Lần sửa đầu làm MỌI ghim bị lật vì vẽ trước khi ảnh tải xong (khung cao 0) → vẽ lại ghim ở sự kiện `load` của ảnh, `latGhim` bỏ qua khung cao 0.
- Thông báo (toast) đè lên ảnh khi xem lớn: `toast()` khi lightbox mở ghi vào dòng trạng thái `#lbTb` trong bảng điều khiển.
- Nút "Chọn xong" che trang thiệp: chỉ hiện khi thiệp cuộn khuất (`doThiep`). IntersectionObserver và cả sự kiện scroll không báo lại trong khung xem thử của app Claude → đo bằng scroll + đo lại 800ms sau các nút tự cuộn.
- Ảnh lớn trên điện thoại chỉ còn ~40% màn hình do `.lb-bot` cố định 52dvh → `.lb-img` 62dvh, cả lightbox cuộn dọc, thanh trên dính.
- Điểm thứ 5 (nhãn ô tên) không phải lỗi: `input.labels.length === 1`.

## Decision
Thử trên bản riêng `DATA_DIR=<tạm> PORT=5194` để không ghi vào album thật đang có khách dùng.

## Next steps
So sánh trước/sau, rồi cô dâu chú rể chọn riêng (giai đoạn 3 còn lại).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
