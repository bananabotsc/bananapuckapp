// ===========================
// CONFIG (FIXED)
// ===========================
const SERVER_BASE = "https://bananapuck-server.onrender.com";
console.log("Using SERVER_BASE:", SERVER_BASE);

// ===========================
// DOM ELEMENTS
// ===========================
const elements = {
  hr: document.getElementById("heartRate"),
  respiration: document.getElementById("respirationRate"),
  temperature: document.getElementById("temperature"),
  water: document.getElementById("waterSub"),
  distance: document.getElementById("lidarDist"),

  accel_x: document.getElementById("accelX"),
  accel_y: document.getElementById("accelY"),
  accel_z: document.getElementById("accelZ"),

  gyro_x: document.getElementById("gyroX"),
  gyro_y: document.getElementById("gyroY"),
  gyro_z: document.getElementById("gyroZ"),

  roll: document.getElementById("roll"),
  pitch: document.getElementById("pitch"),
  yaw: document.getElementById("yaw"),

  lat: document.getElementById("gpsLat"),
  lon: document.getElementById("gpsLon"),
  gps_accuracy: document.getElementById("gpsAcc"),

  lastUpdate: document.getElementById("lastUpdate"),

  alertsContainer: document.getElementById("alertsContainer"),
  clearAlertsBtn: document.getElementById("clearAlertsBtn"),
  activeAlertsBtn: document.getElementById("activeAlertsBtn"),
  historyAlertsBtn: document.getElementById("historyAlertsBtn"),
  callUserBtn: document.getElementById("callUserBtn"),
};

// ===========================
// LEAFLET MAP
// ===========================
let map = L.map("map").setView([37.42, -122.08], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
let marker = L.marker([37.42, -122.08]).addTo(map);

// ===========================
// FETCH LOOP (FIXED)
// ===========================
async function fetchData() {
  try {
    const r = await fetch(`${SERVER_BASE}/get_data`, { cache: "no-store" });

    if (!r.ok) {
      console.error("GET /get_data failed:", r.status);
      return;
    }

    const data = await r.json();
    console.log("Live data:", data);

    updateUI(data);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

fetchData();
setInterval(fetchData, 1000);

// ===========================
// UPDATE UI
// ===========================
function updateUI(d) {
  if (!d) return;

  elements.hr.textContent = d.hr ?? "--";
  elements.respiration.textContent = d.breathing ?? "--";
  elements.temperature.textContent = d.temp ?? "--";
  elements.water.textContent = d.water_submerged ? "YES" : "NO";

  if (d.accel) {
    elements.accel_x.textContent = `X: ${d.accel.x.toFixed(2)}`;
    elements.accel_y.textContent = `Y: ${d.accel.y.toFixed(2)}`;
    elements.accel_z.textContent = `Z: ${d.accel.z.toFixed(2)}`;
  }

  if (d.gyro) {
    elements.gyro_x.textContent = `X: ${d.gyro.x.toFixed(2)}`;
    elements.gyro_y.textContent = `Y: ${d.gyro.y.toFixed(2)}`;
    elements.gyro_z.textContent = `Z: ${d.gyro.z.toFixed(2)}`;
  }

  if (Array.isArray(d.orientation) && d.orientation.length === 3) {
    elements.roll.textContent = d.orientation[0].toFixed(1);
    elements.pitch.textContent = d.orientation[1].toFixed(1);
    elements.yaw.textContent = d.orientation[2].toFixed(1);
  }

  if (d.gps) {
    elements.lat.textContent = d.gps.lat ?? "--";
    elements.lon.textContent = d.gps.lon ?? "--";
    elements.gps_accuracy.textContent = d.gps.accuracy ?? "--";

    if (d.gps.lat && d.gps.lon) {
      marker.setLatLng([d.gps.lat, d.gps.lon]);
      map.setView([d.gps.lat, d.gps.lon], map.getZoom());
    }
  }

  if (d.last_update) {
    elements.lastUpdate.textContent = new Date(d.last_update * 1000).toLocaleString();
  }
}

// ===========================
// BUTTON STUB
// ===========================
elements.callUserBtn.onclick = () => {
  alert("Vibration command would be sent here.");
};
