// ==========================================
// 1. PROTEKSI HALAMAN & LOGOUT
// ==========================================
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
});


// ==========================================
// 2. AMBIL ELEMEN UI SENSOR
// ==========================================
const tempVal = document.getElementById('temp-val');
const humVal = document.getElementById('hum-val');
const gasVal = document.getElementById('gas-val');
const statusDhtVal = document.getElementById('status-dht-val');
const statusDhtMsg = document.getElementById('status-dht-msg');
const statusGasVal = document.getElementById('status-gas-val');
const statusGasMsg = document.getElementById('status-gas-msg');


// ==========================================
// 3. SISTEM NOTIFIKASI BROWSER (POP-UP)
// ==========================================
if ("Notification" in window) {
    Notification.requestPermission();
}

let lastNotificationTime = 0;
function kirimNotifikasi(judul, pesan) {
    const now = Date.now();
    // Kasih jeda 1 menit (60000 ms) biar notifnya gak nyepam terus-terusan
    if (Notification.permission === "granted" && now - lastNotificationTime > 60000) {
        new Notification(judul, {
            body: pesan,
            icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png" 
        });
        lastNotificationTime = now;
    }
}


// ==========================================
// 4. SETUP GRAFIK DHT22 & MQ-135 (CHART.JS)
// ==========================================
const dhtChartCtx = document.getElementById('dhtChart').getContext('2d');
const gasChartCtx = document.getElementById('gasChart').getContext('2d');

const dhtChartData = {
    labels: [],
    datasets: [
        { label: 'Suhu (°C)', data: [], borderWidth: 2, tension: 0.25, borderColor: '#f44336' },
        { label: 'Kelembaban (%)', data: [], borderWidth: 2, tension: 0.25, borderColor: '#2196f3' }
    ]
};

const gasChartData = {
    labels: [],
    datasets: [
        { label: 'Gas MQ-135 (ADC)', data: [], borderWidth: 2, tension: 0.25, borderColor: '#ff9800' }
    ]
};

const dhtChart = new Chart(dhtChartCtx, {
    type: 'line',
    data: dhtChartData,
    options: { responsive: true, animation: false, scales: { y: { beginAtZero: true } } }
});

const gasChart = new Chart(gasChartCtx, {
    type: 'line',
    data: gasChartData,
    options: { responsive: true, animation: false, scales: { y: { beginAtZero: true } } }
});

function limitChartData(chartData, maxPoints = 20) {
    if (chartData.labels.length > maxPoints) {
        chartData.labels.shift();
        chartData.datasets.forEach(dataset => dataset.data.shift());
    }
}

function pushChartPoint(suhu, kelembaban, gas) {
    const now = new Date().toLocaleTimeString('id-ID');

    dhtChartData.labels.push(now);
    dhtChartData.datasets[0].data.push(suhu);
    dhtChartData.datasets[1].data.push(kelembaban);
    limitChartData(dhtChartData);
    dhtChart.update();

    gasChartData.labels.push(now);
    gasChartData.datasets[0].data.push(gas);
    limitChartData(gasChartData);
    gasChart.update();
}


// ==========================================
// 5. UPDATE STATUS UI & TRIGGER NOTIFIKASI
// ==========================================
function setDhtStatus(statusKandang) {
    statusDhtVal.innerText = statusKandang;

    if (statusKandang === 'Bahaya') {
        statusDhtVal.className = 'status-warning';
        statusDhtMsg.innerText = 'Suhu atau kelembaban berada pada kondisi bahaya. Segera cek kandang.';
        kirimNotifikasi("🚨 Kritis: Suhu Kandang Bahaya!", "Suhu melampaui batas ideal. Segera lakukan pendinginan/penyesuaian kandang!");
    } else if (statusKandang === 'Ideal') {
        statusDhtVal.className = 'status-optimal';
        statusDhtMsg.innerText = 'Suhu dan kelembaban berada pada rentang ideal.';
    } else if (statusKandang === 'Perlu Dipantau') {
        statusDhtVal.className = 'status-monitor';
        statusDhtMsg.innerText = 'Suhu atau kelembaban belum ideal, tetapi belum masuk kondisi bahaya.';
    } else {
        statusDhtVal.className = 'status-default';
        statusDhtMsg.innerText = 'Menunggu data suhu dan kelembaban dari ESP32.';
    }
}

function setGasStatus(statusGas) {
    statusGasVal.innerText = statusGas;

    if (statusGas === 'Tidak Normal') {
        statusGasVal.className = 'status-warning';
        statusGasMsg.innerText = 'Nilai MQ-135 melewati batas. Cek media kandang dan ventilasi.';
        kirimNotifikasi("☢️ Peringatan: Amonia Tinggi!", "Gas MQ-135 melebihi batas. Segera tambah sampah kering atau buka ventilasi!");
    } else if (statusGas === 'Normal') {
        statusGasVal.className = 'status-normal';
        statusGasMsg.innerText = 'Nilai gas MQ-135 masih berada pada batas normal.';
    } else {
        statusGasVal.className = 'status-default';
        statusGasMsg.innerText = 'Menunggu data gas dari ESP32.';
    }
}

function showErrorStatus() {
    statusDhtVal.innerText = 'Error';
    statusDhtVal.className = 'status-warning';
    statusDhtMsg.innerText = 'Gagal memuat data DHT22. Cek backend Python dan BASE_URL.';

    statusGasVal.innerText = 'Error';
    statusGasVal.className = 'status-warning';
    statusGasMsg.innerText = 'Gagal memuat data MQ-135. Cek Mosquitto, backend Python, IP, dan firewall.';
}


// ==========================================
// 6. FETCH DATA SENSOR DARI BACKEND PYTHON
// ==========================================
async function fetchSensorData() {
    try {
        const response = await fetch(`${BASE_URL}/sensor-terbaru`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Gagal mengambil data');

        const data = await response.json();

        const suhu = Number(data.suhu ?? data.temp ?? 0);
        const kelembaban = Number(data.kelembaban ?? data.hum ?? 0);
        const gas = Number(data.gas_amonia ?? data.gas ?? 0);
        const statusKandang = data.status ?? 'Menunggu Data';
        const statusGas = data.statusGas ?? data.status_gas ?? 'Menunggu Data';

        tempVal.innerText = suhu.toFixed(1);
        humVal.innerText = kelembaban.toFixed(1);
        gasVal.innerText = gas;

        setDhtStatus(statusKandang);
        setGasStatus(statusGas);
        pushChartPoint(suhu, kelembaban, gas);

    } catch (error) {
        console.error('Error fetching data:', error);
        showErrorStatus();
    }
}

// Panggil fungsi pertama kali, lalu polling setiap 3 detik
fetchSensorData();
setInterval(fetchSensorData, 3000);


// ==========================================
// 7. INPUT DATA PRODUKSI (PANGAN & MAGGOT)
// ==========================================
document.getElementById('form-produksi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        tanggal: document.getElementById('input-tanggal').value,
        berat_pangan: document.getElementById('input-pangan').value,
        berat_maggot: document.getElementById('input-maggot').value
    };

    try {
        const response = await fetch(`${BASE_URL}/input-produksi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            alert('Mantap! Data produksi berhasil disimpan ke server.');
            document.getElementById('form-produksi').reset(); // Kosongin form setelah sukses
        } else {
            alert('Gagal! Pastikan server Python sudah di-restart dan menggunakan kode terbaru.');
        }
    } catch (error) {
        alert('Gagal menyimpan data. Pastikan server Python menyala dan BASE_URL benar.');
    }
});


// ==========================================
// 8. EXPORT DATA KE EXCEL (SHEETJS)
// ==========================================
document.getElementById('btn-export-excel').addEventListener('click', async () => {
    try {
        // Ambil data dari backend
        const resRiwayat = await fetch(`${BASE_URL}/riwayat`);
        const dataRiwayat = await resRiwayat.json();

        const resProduksi = await fetch(`${BASE_URL}/data-produksi`);
        const dataProduksi = await resProduksi.json();

        // Bikin Workbook Excel
        const wb = XLSX.utils.book_new();

        // Bikin Sheet 1: Riwayat Sensor (Time Series)
        const wsSensor = XLSX.utils.json_to_sheet(dataRiwayat.map((d, index) => ({
            "No": index + 1,
            "Suhu (°C)": d.temp,
            "Kelembaban (%)": d.hum,
            "Gas MQ135 (ADC)": d.gas,
            "Status Kandang": d.status,
            "Status Gas": d.statusGas
        })));
        XLSX.utils.book_append_sheet(wb, wsSensor, "Riwayat Sensor");

        // Bikin Sheet 2: Data Produksi
        const wsProduksi = XLSX.utils.json_to_sheet(dataProduksi.map((d, index) => ({
            "No": index + 1,
            "Tanggal": d.tanggal,
            "Input Pangan (Kg)": d.berat_pangan,
            "Panen Maggot (Kg)": d.berat_maggot
        })));
        XLSX.utils.book_append_sheet(wb, wsProduksi, "Data Produksi");

        // Download File
        XLSX.writeFile(wb, "Laporan_Smart_Maggot.xlsx");
    } catch (e) {
        console.error(e);
        alert("Gagal men-download Excel. Pastikan backend nyala.");
    }
});


// ==========================================
// 9. EXPORT DATA KE PDF (JSPDF)
// ==========================================
document.getElementById('btn-export-pdf').addEventListener('click', async () => {
    try {
        const resProduksi = await fetch(`${BASE_URL}/data-produksi`);
        const dataProduksi = await resProduksi.json();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Bikin Header Laporan
        doc.setFontSize(18);
        doc.text("Laporan Produksi Smart Maggot Farming", 14, 20);
        doc.setFontSize(12);
        doc.text("Sekolah Alam Indonesia Cibinong", 14, 28);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Dicetak pada: " + new Date().toLocaleString('id-ID'), 14, 34);

        // Siapin Data buat Tabel
        const tableColumn = ["No", "Tanggal", "Input Pangan Organik (Kg)", "Hasil Panen Maggot (Kg)"];
        const tableRows = [];

        dataProduksi.forEach((data, index) => {
            const dataRow = [index + 1, data.tanggal, data.berat_pangan, data.berat_maggot];
            tableRows.push(dataRow);
        });

        // Bikin Tabel
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50] }, // Warna ijo kalem
            styles: { fontSize: 10, halign: 'center' }
        });

        // Download File PDF
        doc.save("Laporan_Produksi_Maggot.pdf");
    } catch (e) {
        console.error(e);
        alert("Gagal menggenerate PDF. Pastikan backend nyala dan sudah ada data produksi yang diinput.");
    }
});