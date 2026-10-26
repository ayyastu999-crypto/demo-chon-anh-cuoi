@echo off
rem Khoi dong lai RIENG app Chon anh cuoi (sau khi sua code). Khong dung toi tunnel hay PhotoShare.
rem Bam dup, hoac: explorer.exe duong-dan\khoi-dong-lai-app.cmd
rem Chi tat dung tien trinh node dang nghe cong 5193 (khong tat moi node.exe trong may).
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:"127.0.0.1:5193 .*LISTENING"') do taskkill /PID %%p /F >nul 2>&1
timeout /t 1 /nobreak >nul
wscript.exe "D:\2023\demo-chon-anh-cuoi\scripts\win-autostart\launcher-app.vbs"
