import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv('MQTT_HOST', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', '1883'))
MQTT_TOPIC = os.getenv('MQTT_TOPIC', 'iot/sensor')
API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('API_PORT', '5000'))

latest_data = {
    'temp': 0,
    'hum': 0,
    'gas': 0,
    'status': 'Menunggu Data',
    'statusGas': 'Menunggu Data'
}
history = []
lock = threading.Lock()


def normalize_payload(payload: dict) -> dict:
    suhu = payload.get('temp', payload.get('suhu', 0))
    kelembaban = payload.get('hum', payload.get('kelembaban', 0))
    gas = payload.get('gas', payload.get('gas_amonia', 0))
    status = payload.get('status', 'Menunggu Data')
    status_gas = payload.get('statusGas', payload.get('status_gas', 'Menunggu Data'))

    try:
        suhu = float(suhu)
    except Exception:
        suhu = 0
    try:
        kelembaban = float(kelembaban)
    except Exception:
        kelembaban = 0
    try:
        gas = int(float(gas))
    except Exception:
        gas = 0

    return {
        # Format asli dari ESP32
        'temp': suhu,
        'hum': kelembaban,
        'gas': gas,
        'status': status,
        'statusGas': status_gas,

        # Format yang dipakai dashboard lama
        'suhu': suhu,
        'kelembaban': kelembaban,
        'gas_amonia': gas,
        'status_gas': status_gas,
    }


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f'[MQTT] Terhubung ke broker {MQTT_HOST}:{MQTT_PORT}. Kode: {reason_code}')
    client.subscribe(MQTT_TOPIC)
    print(f'[MQTT] Subscribe topic: {MQTT_TOPIC}')


def on_message(client, userdata, msg):
    global latest_data, history
    try:
        raw = msg.payload.decode('utf-8')
        payload = json.loads(raw)
        data = normalize_payload(payload)
        with lock:
            latest_data = data
            history.append(data)
            history = history[-100:]
        print(f'[MQTT] Data masuk: {data}')
    except Exception as exc:
        print(f'[MQTT] Payload tidak valid: {msg.payload!r} | error={exc}')


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, body, status=200):
        encoded = json.dumps(body).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_OPTIONS(self):
        self._send_json({'ok': True})

    def do_GET(self):
        path = urlparse(self.path).path
        with lock:
            latest = dict(latest_data)
            recent = list(history)

        if path == '/sensor-terbaru':
            self._send_json(latest)
        elif path == '/riwayat':
            self._send_json(recent)
        elif path == '/health':
            self._send_json({'ok': True, 'mqtt_host': MQTT_HOST, 'mqtt_port': MQTT_PORT, 'topic': MQTT_TOPIC})
        else:
            self._send_json({'error': 'Endpoint tidak ditemukan'}, status=404)

    def log_message(self, format, *args):
        # Kurangi log bawaan HTTP agar terminal mudah dibaca.
        return


def start_mqtt():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_forever()


if __name__ == '__main__':
    threading.Thread(target=start_mqtt, daemon=True).start()
    print(f'[API] Backend jalan di http://{API_HOST}:{API_PORT}')
    print('[API] Endpoint: /sensor-terbaru, /riwayat, /health')
    server = ThreadingHTTPServer((API_HOST, API_PORT), Handler)
    server.serve_forever()
