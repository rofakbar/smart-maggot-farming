@echo off
cd /d "%~dp0"
echo Dashboard jalan di http://localhost:5501/login.html
echo Dari HP satu WiFi, buka http://IP-LAPTOP:5501/login.html
py -m http.server 5501
pause
