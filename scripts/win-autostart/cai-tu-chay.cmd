@echo off
rem Dua app Chon anh cuoi len internet tai https://chonanhcuoi.ayyastudio.vn — BAM DUP file nay (chi can 1 lan).
rem 1) Cai app tu chay moi khi dang nhap Windows (dat file vao thu muc Startup).
rem 2) Bat app ngay (an, nghe 127.0.0.1:5193, log o data\app.log).
rem 3) Khoi dong lai Cloudflare Tunnel de doc ten mien moi trong C:\Users\PC\.cloudflared\config.yml.
rem    anh.ayyastudio.vn (PhotoShare) mat ket noi vai giay trong luc nay.
rem Khong chay tu ben trong phien Claude: app Claude ao hoa AppData nen file Startup se nam sai cho.
echo Dang cai app Chon anh cuoi tu chay...
copy /Y "D:\2023\demo-chon-anh-cuoi\scripts\win-autostart\startup-demo-chon-anh-cuoi.vbs" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\demo-chon-anh-cuoi-app.vbs" >nul
echo Dang bat app...
wscript.exe "D:\2023\demo-chon-anh-cuoi\scripts\win-autostart\launcher-app.vbs"
echo Dang khoi dong lai Cloudflare Tunnel...
taskkill /IM cloudflared.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
wscript.exe "D:\2023\ayya-photoshare\scripts\win-autostart\launcher-tunnel.vbs"
echo.
echo Xong. Mo https://chonanhcuoi.ayyastudio.vn sau khoang 15 giay.
timeout /t 6 >nul
