@echo off
echo Menjalankan Mosquitto untuk Smart Maggot Farming...
cd /d "%ProgramFiles%\mosquitto"
mosquitto.exe -c "%~dp0mosquitto-smart-maggot.conf" -v
pause
