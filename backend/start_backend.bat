@echo off
cd /d "%~dp0"
echo [1/2] Install library Python...
py -m pip install -r requirements.txt

echo [2/2] Menjalankan backend Smart Maggot Farming...
set MQTT_HOST=localhost
set MQTT_PORT=1883
set MQTT_TOPIC=iot/sensor
set API_HOST=0.0.0.0
set API_PORT=5000
py server.py
pause
