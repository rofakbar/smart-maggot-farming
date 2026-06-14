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
const statusDhtVal = document.getElementById('status-dht-val');
const statusDhtMsg = document.getElementById('status-dht-msg');
const statusGasVal = document.getElementById('status-gas-val');
const statusGasMsg = document.getElementById('status-gas-msg');

// --- 4. GRAFIK DHT22 DAN MQ-135 TERPISAH ---
const dhtChartCtx = document.getElementById('dhtChart').getContext('2d');
const gasChartCtx = document.getElementById('gasChart').getContext('2d');

const dhtChartData = {
    labels: [],
    datasets: [
        { label: 'Suhu (°C)', data: [], borderWidth: 2, tension: 0.25 },
        { label: 'Kelembaban (%)', data: [], borderWidth: 2, tension: 0.25 }
    ]
};

const gasChartData = {
    labels: [],
    datasets: [
        { label: 'Gas MQ-135 (ADC)', data: [], borderWidth: 2, tension: 0.25 }
    ]
};

const dhtChart = new Chart(dhtChartCtx, {
    type: 'line',
    data: dhtChartData,
    options: {
        responsive: true,
        animation: false,
        scales: {
            y: { beginAtZero: true }
        }
    }
});

const gasChart = new Chart(gasChartCtx, {
    type: 'line',
    data: gasChartData,
    options: {
        responsive: true,
        animation: false,
        scales: {
            y: { beginAtZero: true }
        }
    }
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

function setDhtStatus(statusKandang) {
    statusDhtVal.innerText = statusKandang;

    if (statusKandang === 'Bahaya') {
        statusDhtVal.className = 'status-warning';
        statusDhtMsg.innerText = 'Suhu atau kelembaban berada pada kondisi bahaya. Segera cek kandang.';
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

// --- 5. FUNGSI AMBIL DATA DARI BACKEND API ---
async function fetchSensorData() {
    try {
        const response = await fetch(`${BASE_URL}/sensor-terbaru`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Gagal mengambil data');

        const data = await response.json();

        // Kompatibel dengan dua format data:
        // ESP32: temp, hum, gas, status, statusGas
        // Dashboard lama: suhu, kelembaban, gas_amonia, status_gas
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

fetchSensorData();
setInterval(fetchSensorData, 3000);
