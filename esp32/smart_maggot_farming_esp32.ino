#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

// =====================
// WIFI
// =====================
const char* ssid = "ladikakosAD";
const char* password = "CurugAgung03";

// =====================
// MQTT
// IP ini harus IPv4 laptop yang menjalankan Mosquitto
// =====================
IPAddress mqtt_server(10, 26, 173, 74);
const int mqtt_port = 1883;
const char* mqtt_topic = "iot/sensor";

// =====================
// SENSOR DHT22
// =====================
#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

// =====================
// SENSOR MQ-135
// =====================
#define MQ135_PIN 34
int batasGas = 700;

// =====================
// LED STATUS KANDANG
// =====================
#define LED_HIJAU 25
#define LED_KUNING 26
#define LED_MERAH 27

// =====================
// LED STATUS GAS
// Catatan: GPIO 32 lebih aman daripada GPIO 2 karena GPIO 2 adalah strapping pin pada beberapa board ESP32.
// =====================
#define LED_GAS_NORMAL 32
#define LED_GAS_TIDAK_NORMAL 33

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(1000);

  Serial.println();
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int percobaan = 0;

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    percobaan++;

    if (percobaan > 60) {
      Serial.println();
      Serial.println("WiFi gagal terhubung. ESP32 akan restart.");
      ESP.restart();
    }
  }

  Serial.println();
  Serial.println("WiFi terhubung");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.print("Gateway ESP32: ");
  Serial.println(WiFi.gatewayIP());
  Serial.print("Subnet ESP32: ");
  Serial.println(WiFi.subnetMask());
}

void tes_tcp_mqtt() {
  Serial.println();
  Serial.print("MQTT Server target: ");
  Serial.println(mqtt_server);
  Serial.print("MQTT Port target: ");
  Serial.println(mqtt_port);

  Serial.print("Tes TCP ke MQTT broker... ");

  WiFiClient testClient;

  if (testClient.connect(mqtt_server, mqtt_port)) {
    Serial.println("TCP berhasil");
    testClient.stop();
  } else {
    Serial.println("TCP gagal");
  }

  Serial.println();
}

void reconnect_mqtt() {
  while (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT... ");

    String clientId = "ESP32Maggot";

    if (client.connect(clientId.c_str())) {
      Serial.println("berhasil");
    } else {
      Serial.print("gagal, rc=");
      Serial.print(client.state());
      Serial.println(" coba lagi 3 detik...");
      delay(3000);
    }
  }
}

void matikanSemuaLedKandang() {
  digitalWrite(LED_HIJAU, LOW);
  digitalWrite(LED_KUNING, LOW);
  digitalWrite(LED_MERAH, LOW);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_HIJAU, OUTPUT);
  pinMode(LED_KUNING, OUTPUT);
  pinMode(LED_MERAH, OUTPUT);
  pinMode(LED_GAS_NORMAL, OUTPUT);
  pinMode(LED_GAS_TIDAK_NORMAL, OUTPUT);

  matikanSemuaLedKandang();
  digitalWrite(LED_GAS_NORMAL, LOW);
  digitalWrite(LED_GAS_TIDAK_NORMAL, LOW);

  dht.begin();

  analogReadResolution(12);
  analogSetPinAttenuation(MQ135_PIN, ADC_11db);

  setup_wifi();
  tes_tcp_mqtt();

  client.setServer(mqtt_server, mqtt_port);
  client.setKeepAlive(60);
  client.setSocketTimeout(10);

  Serial.println("Sistem Smart Maggot Farming siap.");
  Serial.println("MQ-135 membutuhkan waktu pemanasan agar nilai lebih stabil.");
}

void loop() {
  if (!client.connected()) {
    reconnect_mqtt();
  }

  client.loop();

  float suhu = dht.readTemperature();
  float kelembaban = dht.readHumidity();
  int gas = analogRead(MQ135_PIN);

  if (isnan(suhu) || isnan(kelembaban)) {
    Serial.println("Gagal membaca DHT22. Cek kabel DATA, VCC, dan GND.");
    delay(3000);
    return;
  }

  String statusKandang;

  bool kondisiIdeal = suhu >= 27 && suhu <= 32 && kelembaban >= 60 && kelembaban <= 80;
  bool kondisiBahaya = suhu > 34 || kelembaban < 50;

  matikanSemuaLedKandang();

  if (kondisiBahaya) {
    statusKandang = "Bahaya";
    digitalWrite(LED_MERAH, HIGH);
  } else if (kondisiIdeal) {
    statusKandang = "Ideal";
    digitalWrite(LED_HIJAU, HIGH);
  } else {
    statusKandang = "Perlu Dipantau";
    digitalWrite(LED_KUNING, HIGH);
  }

  String statusGas;

  if (gas <= batasGas) {
    statusGas = "Normal";
    digitalWrite(LED_GAS_NORMAL, HIGH);
    digitalWrite(LED_GAS_TIDAK_NORMAL, LOW);
  } else {
    statusGas = "Tidak Normal";
    digitalWrite(LED_GAS_NORMAL, LOW);
    digitalWrite(LED_GAS_TIDAK_NORMAL, HIGH);
  }

  String payload = "{";
  payload += "\"temp\":";
  payload += String(suhu, 1);
  payload += ",";
  payload += "\"hum\":";
  payload += String(kelembaban, 1);
  payload += ",";
  payload += "\"gas\":";
  payload += String(gas);
  payload += ",";
  payload += "\"status\":\"";
  payload += statusKandang;
  payload += "\",";
  payload += "\"statusGas\":\"";
  payload += statusGas;
  payload += "\"";
  payload += "}";

  Serial.println(payload);

  bool publishBerhasil = client.publish(mqtt_topic, payload.c_str());

  if (publishBerhasil) {
    Serial.println("Data berhasil dikirim ke MQTT.");
  } else {
    Serial.println("Data gagal dikirim ke MQTT.");
  }

  delay(3000);
}
