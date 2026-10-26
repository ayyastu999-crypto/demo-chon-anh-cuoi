' Chay app Chon anh cuoi AN (khong hien cua so), ghi log vao data\app.log.
' Duoc goi tu file trong thu muc Startup cua Windows (xem cai-tu-chay.cmd) moi khi dang nhap.
' App nghe 127.0.0.1:5193; Cloudflare Tunnel dua khach tu chonanhcuoi.ayyastudio.vn vao.
'
' File may-cu-the: duong dan cung cho may studio nay.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "D:\2023\demo-chon-anh-cuoi"
sh.Run "cmd /c """"C:\Program Files\nodejs\node.exe"" server.js >> data\app.log 2>&1""", 0, False
