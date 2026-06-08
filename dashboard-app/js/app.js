// --- 1. PROTEKSI HALAMAN ---
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

// --- 2. LOGIKA LOGOUT ---
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
});

// --- 3. AMBIL ELEMEN UI ---
const tempVal = document.getElementById('temp-val');
const humVal = document.getElementById('hum-val');
const gasVal = document.getElementById('gas-val');
const statusVal = document.getElementById('status-val');
const statusMsg = document.getElementById('status-msg');

// --- 4. FUNGSI AMBIL DATA DARI BACKEND API ---
async function fetchSensorData() {
    try {
        // BASE_URL diambil dari file js/config.js
        const response = await fetch(`${BASE_URL}/sensor-terbaru`);
        if (!response.ok) throw new Error("Gagal mengambil data");

        const data = await response.json();
        
        // Tampilkan data ke Card Dashboard
        tempVal.innerText = data.suhu;
        humVal.innerText = data.kelembaban;
        gasVal.innerText = data.gas_amonia;

        // Logika Analisis Tiga Sensor (Suhu, Kelembaban, Gas)
        if (data.gas_amonia > 50) {
            statusVal.innerText = "Kritis: Gas Tinggi";
            statusVal.className = "status-warning";
            statusMsg.innerText = "Gas Amonia melebihi 50 ppm! Kandang terlalu bau, segera ganti atau tambahkan sampah kering.";
        } else if (data.suhu > 35) {
            statusVal.innerText = "Kritis: Overheat";
            statusVal.className = "status-warning";
            statusMsg.innerText = "Suhu kandang di atas 35°C! Segera lakukan penyemprotan air halus untuk pendinginan.";
        } else if (data.kelembaban < 50) {
            statusVal.innerText = "Kritis: Kering";
            statusVal.className = "status-warning";
            statusMsg.innerText = "Kelembaban di bawah 50%! Media budidaya terlalu kering, maggot susah mengunyah.";
        } else {
            statusVal.innerText = "Optimal/Aman";
            statusVal.className = "status-optimal";
            statusMsg.innerText = "Kondisi lingkungan kandang sangat baik untuk pertumbuhan larva BSF.";
        }

    } catch (error) {
        console.error("Error fetching data:", error);
        statusVal.innerText = "Error";
        statusVal.className = "status-default";
        statusMsg.innerText = "Gagal memuat data terbaru dari server.";
    }
}

// Jalankan penarikan data pertama kali pas halaman kebuka
fetchSensorData();

// Polling data otomatis setiap 5 detik ke server API backend lu
setInterval(fetchSensorData, 5000);