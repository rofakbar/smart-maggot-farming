PANDUAN INTEGRASI SMART MAGGOT FARMING

Alur sistem:
ESP32 + DHT22 + MQ-135 -> WiFi -> Mosquitto MQTT di laptop -> backend Python -> dashboard web/APK.

A. FILE PENTING
1. esp32/smart_maggot_farming_esp32.ino
   Kode ESP32 yang publish ke topic iot/sensor.
2. backend/start_mosquitto.bat
   Menyalakan Mosquitto pada port 1883.
3. backend/start_backend.bat
   Menyalakan backend API di port 5000.
4. dashboard-app/js/config.js
   Berisi alamat backend. Ubah IP sesuai IPv4 laptop.
5. dashboard-app/start_dashboard.bat
   Menjalankan dashboard web di port 5501.

B. URUTAN MENJALANKAN
1. Cek IPv4 laptop dengan perintah: ipconfig
   Gunakan IPv4 dari WiFi yang sama dengan ESP32.
2. Ubah IP pada kode ESP32:
   IPAddress mqtt_server(10, 26, 173, 74);
   Sesuaikan dengan IPv4 laptop.
3. Ubah IP pada dashboard-app/js/config.js:
   const BASE_URL = "http://IP-LAPTOP:5000";
4. Jalankan Mosquitto:
   klik dua kali backend/start_mosquitto.bat
5. Jalankan backend:
   klik dua kali backend/start_backend.bat
6. Upload kode ESP32 dari Arduino IDE.
7. Jalankan dashboard:
   klik dua kali dashboard-app/start_dashboard.bat
8. Buka dashboard:
   http://localhost:5501/login.html
   Dari HP satu WiFi: http://IP-LAPTOP:5501/login.html

C. LOGIN DASHBOARD
Username: admin@gmail.com
Password: maggot2026

D. TEST MQTT MANUAL
Buka CMD baru:
cd "C:\Program Files\mosquitto"
mosquitto_sub -h localhost -t iot/sensor -v

Jika ESP32 jalan, akan tampil data seperti:
iot/sensor {"temp":29.1,"hum":70.2,"gas":512,"status":"Ideal","statusGas":"Normal"}

E. CATATAN APK
Folder dashboard-app bisa dijadikan APK memakai WebView/Capacitor/Cordova.
Untuk tugas praktikum, cara paling cepat adalah dashboard dijalankan di laptop lalu HP membuka alamat http://IP-LAPTOP:5501/login.html.
Jika dibuat APK WebView, pastikan WebView mengizinkan HTTP cleartext dan config.js tetap memakai IP laptop, bukan localhost.

F. TROUBLESHOOTING CEPAT
1. ESP32 serial monitor: TCP gagal
   - IP laptop salah.
   - Mosquitto belum hidup.
   - Firewall Windows memblokir port 1883.
2. Dashboard Error
   - Backend Python belum hidup.
   - BASE_URL salah.
   - Firewall memblokir port 5000.
3. Data MQTT masuk tetapi dashboard tetap kosong
   - Buka http://IP-LAPTOP:5000/sensor-terbaru di browser.
   - Jika JSON muncul, backend aman. Cek config.js.
4. Gas terlalu tinggi terus
   - MQ-135 perlu pemanasan.
   - Nilai 700 adalah nilai ADC mentah, bukan ppm. Kalibrasi diperlukan jika ingin ppm.


G. TAMPILAN DASHBOARD BARU
1. Card sensor nilai: Suhu Kandang, Kelembaban, Nilai Gas MQ-135.
2. Card kondisi terpisah: Kondisi DHT22 dan Kondisi MQ-135.
3. Grafik terpisah: Grafik DHT22 untuk suhu dan kelembaban, Grafik MQ-135 untuk nilai gas ADC.
