// =====================================================
// BananaPuck Dashboard (single SERVER_BASE + full UI)
// =====================================================

// If you ever want to override without editing this file:
// <script>window.SERVER_URL="https://bananapuck-server.onrender.com"</script>
const SERVER_BASE =
  (typeof window.SERVER_URL !== "undefined" && window.SERVER_URL) ||
  "https://bananapuck-server.onrender.com";

// ---------------------------
// DOM ELEMENTS
// ---------------------------
const el = {
  // Vitals
  hr: document.getElementById("heartRate"),
  respiration: document.getElementById("respirationRate"),
  temperature: document.getElementById("temperature"),

  // Motion
  accelX: document.getElementById("accelX"),
  accelY: document.getElementById("accelY"),
  accelZ: document.getElementById("accelZ"),

  gyroX: document.getElementById("gyroX"),
  gyroY: document.getElementById("gyroY"),
  gyroZ: document.getElementById("gyroZ"),

  roll: document.getElementById("roll"),
  pitch: document.getElementById("pitch"),
  yaw: document.getElementById("yaw"),

  // GPS
  gpsLat: document.getElementById("gpsLat"),
  gpsLon: document.getElementById("gpsLon"),
  gpsAcc: document.getElementById("gpsAcc"),

  // Water / ECG / Last update
  waterSub: document.getElementById("waterSub"),
  ecgValue: document.getElementById("ecgValue"),
  lastUpdate: document.getElementById("lastUpdate"),

  // Alerts
  alertsContainer: document.getElementById("alertsContainer"),
  clearAlertsBtn: document.getElementById("clearAlertsBtn"),
  activeAlertsBtn: document.getElementById("activeAlertsBtn"),
  historyAlertsBtn: document.getElementById("historyAlertsBtn"),
  callUserBtn: document.getElementById("callUserBtn"),
  alertsWindow: document.getElementById("alertsWindow"),

  // History modal
  historyModalOverlay: document.getElementById("historyModalOverlay"),
  historyWindow: document.getElementById("historyWindow"),
  historyChart: document.getElementById("historyChart"),
  historyTableBody: document.querySelector("#historyTable tbody"),
  modalTitle: document.getElementById("modalTitle"),
  closeModalBtn: document.getElementById("closeModalBtn"),

  // Mapping
  mappingModal: document.getElementById("mappingModal"),
  btnMapNewLocation: document.getElementById("btnMapNewLocation"),
  closeMappingModal: document.getElementById("closeMappingModal"),
  createLocationBtn: document.getElementById("createLocationBtn"),
  locationNameInput: document.getElementById("locationName"),
  mappingStep: document.getElementById("mappingStep"),
  photoInput: document.getElementById("photoInput"),
  uploadPhotosBtn: document.getElementById("uploadPhotosBtn"),
  mappingStatus: document.getElementById("mappingStatus"),
  photoGallery: document.getElementById("photoGallery"),
};

// ---------------------------
// LEAFLET MAP
// ---------------------------
let map = null;
let marker = null;

function initMap() {
  map = L.map("map").setView([36.9741, -122.0308], 14); // Santa Cruz default
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);
  marker = L.marker([36.9741, -122.0308]).addTo(map);
}
initMap();

// ---------------------------
// STATE
// ---------------------------
let currentAlertsMode = "active";
let cachedActiveAlerts = [];
let cachedHistoryAlerts = [];

let currentHistoryMetric = null;
let historyChartInstance = null;

// ---------------------------
// FETCH LOOP
// ---------------------------
async function fetchData() {
  try {
    const r = await fetch(`${SERVER_BASE}/get_data`, { cache: "no-store" });
    if (!r.ok) throw new Error(`GET /get_data failed: ${r.status}`);
    const data = await r.json();

    updateUI(data);
    updateActiveAlerts(data.alerts_active || []);
  } catch (err) {
    console.log("Error fetching /get_data:", err);
  }
}

fetchData();
setInterval(fetchData, 1000);

// ---------------------------
// UI UPDATE (robust mapping)
// ---------------------------
function fmtNum(x, digits = 2) {
  if (x === null || x === undefined || x === "" || Number.isNaN(x)) return "--";
  const n = Number(x);
  if (Number.isNaN(n)) return String(x);
  return n.toFixed(digits);
}

function setText(node, value) {
  if (!node) return;
  node.textContent = value;
}

function updateUI(d) {
  // Vitals
  setText(el.hr, fmtNum(d.hr, 1));
  setText(el.respiration, fmtNum(d.breathing, 1));

  // Your server is currently sending temp around 98.x (looks like °F already)
  // If you later switch to °C, adjust here.
  setText(el.temperature, fmtNum(d.temp, 1));

  // Water
  if (typeof d.water_submerged === "boolean") {
    setText(el.waterSub, d.water_submerged ? "YES" : "NO");
  } else {
    setText(el.waterSub, "--");
  }

  // ECG (may not exist yet)
  if (d.ecg !== undefined && d.ecg !== null) setText(el.ecgValue, String(d.ecg));
  else setText(el.ecgValue, "--");

  // Accel
  if (d.accel && typeof d.accel === "object") {
    setText(el.accelX, `X: ${fmtNum(d.accel.x, 2)}`);
    setText(el.accelY, `Y: ${fmtNum(d.accel.y, 2)}`);
    setText(el.accelZ, `Z: ${fmtNum(d.accel.z, 2)}`);
  } else {
    setText(el.accelX, "X: --");
    setText(el.accelY, "Y: --");
    setText(el.accelZ, "Z: --");
  }

  // Gyro
  if (d.gyro && typeof d.gyro === "object") {
    setText(el.gyroX, `X: ${fmtNum(d.gyro.x, 2)}`);
    setText(el.gyroY, `Y: ${fmtNum(d.gyro.y, 2)}`);
    setText(el.gyroZ, `Z: ${fmtNum(d.gyro.z, 2)}`);
  } else {
    setText(el.gyroX, "X: --");
    setText(el.gyroY, "Y: --");
    setText(el.gyroZ, "Z: --");
  }

  // Orientation (server sends [roll,pitch,yaw])
  if (Array.isArray(d.orientation) && d.orientation.length === 3) {
    setText(el.roll, `Roll: ${fmtNum(d.orientation[0], 2)}`);
    setText(el.pitch, `Pitch: ${fmtNum(d.orientation[1], 2)}`);
    setText(el.yaw, `Yaw: ${fmtNum(d.orientation[2], 2)}`);
  } else {
    setText(el.roll, "Roll: --");
    setText(el.pitch, "Pitch: --");
    setText(el.yaw, "Yaw: --");
  }

  // GPS
  if (d.gps && typeof d.gps === "object") {
    const lat = d.gps.lat;
    const lon = d.gps.lon;
    const acc = d.gps.accuracy;

    setText(el.gpsLat, `Lat: ${lat ?? "--"}`);
    setText(el.gpsLon, `Lon: ${lon ?? "--"}`);
    setText(el.gpsAcc, `Accuracy: ${acc ?? "--"}`);

    if (lat != null && lon != null && marker && map) {
      marker.setLatLng([lat, lon]);
      map.setView([lat, lon], map.getZoom() || 16);
    }
  } else {
    setText(el.gpsLat, "Lat: --");
    setText(el.gpsLon, "Lon: --");
    setText(el.gpsAcc, "Accuracy: --");
  }

  // Last update: server sometimes sends last_update epoch seconds
  if (d.last_update != null) {
    const ms =
      typeof d.last_update === "number"
        ? (d.last_update > 1e12 ? d.last_update : d.last_update * 1000)
        : Date.parse(d.last_update);
    const dt = new Date(ms);
    setText(el.lastUpdate, isNaN(dt.getTime()) ? String(d.last_update) : dt.toLocaleString());
  } else if (d.timestamp) {
    const dt = new Date(d.timestamp);
    setText(el.lastUpdate, isNaN(dt.getTime()) ? String(d.timestamp) : dt.toLocaleString());
  } else {
    setText(el.lastUpdate, "--");
  }
}

// ---------------------------
// ALERTS (ACTIVE + HISTORY)
// ---------------------------
function updateActiveAlerts(alerts) {
  cachedActiveAlerts = alerts;
  if (currentAlertsMode === "active") renderActiveAlerts();
}

function renderActiveAlerts() {
  const c = el.alertsContainer;
  if (!c) return;
  c.innerHTML = "";

  if (!cachedActiveAlerts.length) {
    c.innerHTML = `<div class="alert-box alert-ok"><strong>No active alerts</strong></div>`;
    return;
  }

  cachedActiveAlerts.forEach((a) => {
    const div = document.createElement("div");
    const level = (a.level || "WARN").toLowerCase();
    div.className = `alert-box alert-${level}`;

    const time = a.time ? new Date(a.time).toLocaleString() : "";
    const countText = a.count && a.count > 1 ? ` · Count: ${a.count}` : "";

    div.innerHTML = `
      <div class="alert-header-row">
        <strong>${a.title || "Alert"}</strong>
        <button class="dismiss-btn" data-id="${a.id || ""}">X</button>
      </div>
      <div class="alert-message">${a.message || ""}</div>
      <div class="alert-times">${time}${countText}</div>
    `;
    c.appendChild(div);
  });

  c.querySelectorAll(".dismiss-btn").forEach((btn) => {
    btn.onclick = () => dismissAlert(btn.dataset.id);
  });
}

async function loadAlertHistory() {
  try {
    const r = await fetch(`${SERVER_BASE}/alerts/history`, { cache: "no-store" });
    if (!r.ok) throw new Error(`GET /alerts/history failed: ${r.status}`);
    cachedHistoryAlerts = await r.json();

    if (currentAlertsMode === "history") renderHistoryAlerts();
  } catch (err) {
    console.error("Error loading alert history:", err);
  }
}

function renderHistoryAlerts() {
  const c = el.alertsContainer;
  if (!c) return;
  c.innerHTML = "";

  const hours = Number(el.alertsWindow?.value || 24);
  const cutoff = Date.now() - hours * 3600 * 1000;

  const filtered = (cachedHistoryAlerts || []).filter((a) => {
    const t = a.time ? new Date(a.time).getTime() : 0;
    return !t || t >= cutoff;
  });

  if (!filtered.length) {
    c.innerHTML = `<div class="alert-box alert-ok"><strong>No alerts in this window</strong></div>`;
    return;
  }

  filtered.forEach((a) => {
    const div = document.createElement("div");
    const level = (a.level || "WARN").toLowerCase();
    div.className = `alert-box alert-${level}`;

    const time = a.time ? new Date(a.time).toLocaleString() : "";
    const activeLabel = a.active ? "Active" : "Cleared";
    const countText = a.count && a.count > 1 ? ` · Count: ${a.count}` : "";

    div.innerHTML = `
      <div class="alert-message-row">
        <strong>${a.title || "Alert"}</strong>
        <span class="alert-status">(${activeLabel})</span>
      </div>
      <div class="alert-message">${a.message || ""}</div>
      <div class="alert-times">${time}${countText}</div>
    `;
    c.appendChild(div);
  });
}

async function dismissAlert(id) {
  if (!id) return;
  try {
    await fetch(`${SERVER_BASE}/dismiss_alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  } catch (err) {
    console.error("Error dismissing alert:", err);
  }
}

// Buttons
el.clearAlertsBtn &&
  (el.clearAlertsBtn.onclick = async () => {
    try {
      await fetch(`${SERVER_BASE}/clear_alerts`, { method: "POST" });
      cachedActiveAlerts = [];
      renderActiveAlerts();
    } catch (err) {
      console.error("Error clearing alerts:", err);
    }
  });

el.activeAlertsBtn &&
  (el.activeAlertsBtn.onclick = () => {
    currentAlertsMode = "active";
    el.activeAlertsBtn.classList.add("selected");
    el.historyAlertsBtn.classList.remove("selected");
    renderActiveAlerts();
  });

el.historyAlertsBtn &&
  (el.historyAlertsBtn.onclick = () => {
    currentAlertsMode = "history";
    el.historyAlertsBtn.classList.add("selected");
    el.activeAlertsBtn.classList.remove("selected");
    loadAlertHistory();
  });

el.alertsWindow &&
  el.alertsWindow.addEventListener("change", () => {
    if (currentAlertsMode === "history") renderHistoryAlerts();
  });

el.callUserBtn &&
  (el.callUserBtn.onclick = () => {
    alert("Call / vibrate action would be triggered here.");
  });

// ---------------------------
// HISTORY MODAL (sensor card click)
// ---------------------------
document.querySelectorAll(".sensor-box[data-metric]").forEach((card) => {
  card.addEventListener("click", () => {
    currentHistoryMetric = card.dataset.metric;
    const label = card.dataset.label || currentHistoryMetric;
    el.modalTitle.textContent = `${label} history`;
    openHistoryModal();
    loadHistoryData();
  });
});

function openHistoryModal() {
  el.historyModalOverlay.style.display = "flex";
}

function closeHistoryModal() {
  el.historyModalOverlay.style.display = "none";
}

el.closeModalBtn && el.closeModalBtn.addEventListener("click", closeHistoryModal);
el.historyModalOverlay &&
  el.historyModalOverlay.addEventListener("click", (e) => {
    if (e.target === el.historyModalOverlay) closeHistoryModal();
  });

el.historyWindow &&
  el.historyWindow.addEventListener("change", () => {
    if (currentHistoryMetric) loadHistoryData();
  });

async function loadHistoryData() {
  if (!currentHistoryMetric) return;

  // Your server currently supports /history?hours=...
  const hours = Number(el.historyWindow?.value || 24);

  try {
    const r = await fetch(`${SERVER_BASE}/history?hours=${hours}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`GET /history failed: ${r.status}`);
    const payload = await r.json();
    const rows = payload.rows || [];

    updateHistoryChart(rows, currentHistoryMetric);
    updateHistoryTable(rows, currentHistoryMetric);
  } catch (err) {
    console.error("Error loading history:", err);
  }
}

function buildSeriesFromRows(rows, metric) {
  const times = rows.map((r) => new Date(r.t));

  const series = (label, values) => ({
    labels: times,
    datasets: [{ label, data: values }],
  });

  if (metric === "hr") return series("Heart Rate (bpm)", rows.map((r) => r.hr));
  if (metric === "breathing") return series("Respiration (breaths/min)", rows.map((r) => r.breathing));
  if (metric === "temp") return series("Temperature (°F)", rows.map((r) => r.temp));
  if (metric === "water_submerged")
    return series("Water submerged (0/1)", rows.map((r) => (r.water_submerged ? 1 : 0)));

  if (metric === "accel") {
    return {
      labels: times,
      datasets: [
        { label: "Accel X", data: rows.map((r) => r.accel_x) },
        { label: "Accel Y", data: rows.map((r) => r.accel_y) },
        { label: "Accel Z", data: rows.map((r) => r.accel_z) },
      ],
    };
  }

  if (metric === "gyro") {
    return {
      labels: times,
      datasets: [
        { label: "Gyro X", data: rows.map((r) => r.gyro_x) },
        { label: "Gyro Y", data: rows.map((r) => r.gyro_y) },
        { label: "Gyro Z", data: rows.map((r) => r.gyro_z) },
      ],
    };
  }

  if (metric === "orientation") {
    return {
      labels: times,
      datasets: [
        { label: "Roll", data: rows.map((r) => r.roll) },
        { label: "Pitch", data: rows.map((r) => r.pitch) },
        { label: "Yaw", data: rows.map((r) => r.yaw) },
      ],
    };
  }

  if (metric === "gps") {
    return {
      labels: times,
      datasets: [
        { label: "Latitude", data: rows.map((r) => r.gps_lat) },
        { label: "Longitude", data: rows.map((r) => r.gps_lon) },
        { label: "Accuracy (m)", data: rows.map((r) => r.gps_accuracy) },
      ],
    };
  }

  // ECG might not exist in DB yet
  if (metric === "ecg") return series("ECG", rows.map((r) => r.ecg));

  // last_update isn’t a “history metric”, show timestamp row counts
  if (metric === "last_update") return series("Samples", rows.map(() => 1));

  return series("Value", rows.map((r) => r.hr));
}

function updateHistoryChart(rows, metric) {
  const series = buildSeriesFromRows(rows, metric);
  const ctx = el.historyChart.getContext("2d");

  const datasets = series.datasets.map((ds) => ({
    label: ds.label,
    data: series.labels.map((t, idx) => ({ x: t, y: ds.data[idx] })),
    fill: false,
    tension: 0.1,
  }));

  if (historyChartInstance) {
    historyChartInstance.data.datasets = datasets;
    historyChartInstance.data.labels = series.labels;
    historyChartInstance.update();
  } else {
    historyChartInstance = new Chart(ctx, {
      type: "line",
      data: { labels: series.labels, datasets },
      options: {
        parsing: false,
        responsive: true,
        scales: {
          x: { type: "time", time: { tooltipFormat: "MMM d HH:mm" } },
          y: { beginAtZero: false },
        },
      },
    });
  }
}

function updateHistoryTable(rows, metric) {
  const tbody = el.historyTableBody;
  if (!tbody) return;
  tbody.innerHTML = "";

  const sliced = rows.slice(-80).reverse(); // newest first

  sliced.forEach((r) => {
    const tr = document.createElement("tr");
    const t = new Date(r.t).toLocaleString();

    let valueStr = "";
    if (metric === "hr") valueStr = r.hr;
    else if (metric === "breathing") valueStr = r.breathing;
    else if (metric === "temp") valueStr = r.temp;
    else if (metric === "water_submerged") valueStr = r.water_submerged ? "1" : "0";
    else if (metric === "accel") valueStr = `x=${r.accel_x}, y=${r.accel_y}, z=${r.accel_z}`;
    else if (metric === "gyro") valueStr = `x=${r.gyro_x}, y=${r.gyro_y}, z=${r.gyro_z}`;
    else if (metric === "orientation") valueStr = `roll=${r.roll}, pitch=${r.pitch}, yaw=${r.yaw}`;
    else if (metric === "gps") valueStr = `lat=${r.gps_lat}, lon=${r.gps_lon}, acc=${r.gps_accuracy}`;
    else if (metric === "ecg") valueStr = r.ecg ?? "";
    else valueStr = "";

    tr.innerHTML = `<td>${t}</td><td>${valueStr}</td>`;
    tbody.appendChild(tr);
  });
}

// ---------------------------
// LOCATION MAPPING (modal flow)
// ---------------------------
let currentLocationId = null;

function openMappingModal() {
  if (!el.mappingModal) return;
  el.mappingModal.classList.remove("hidden");
  el.mappingStep.classList.add("hidden");
  currentLocationId = null;
  if (el.mappingStatus) el.mappingStatus.textContent = "";
  if (el.photoGallery) el.photoGallery.innerHTML = "";
  if (el.locationNameInput) el.locationNameInput.value = "";
}

function closeMappingModal() {
  if (!el.mappingModal) return;
  el.mappingModal.classList.add("hidden");
}

async function refreshGallery() {
  if (!currentLocationId) return;
  const r = await fetch(`${SERVER_BASE}/locations/${currentLocationId}/images`, { cache: "no-store" });
  const j = await r.json();
  if (!el.photoGallery) return;

  el.photoGallery.innerHTML = "";
  (j.images || []).forEach((img) => {
    const im = document.createElement("img");
    im.src = `${SERVER_BASE}${img.url}`;
    im.alt = "location photo";
    el.photoGallery.appendChild(im);
  });
}

async function createLocation() {
  const name = (el.locationNameInput?.value || "").trim();
  if (!name) {
    if (el.mappingStatus) el.mappingStatus.textContent = "Please enter a location name first.";
    return;
  }

  if (el.mappingStatus) el.mappingStatus.textContent = "Creating location...";

  const r = await fetch(`${SERVER_BASE}/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const j = await r.json();

  if (!r.ok) {
    if (el.mappingStatus) el.mappingStatus.textContent = j.error || "Failed to create location.";
    return;
  }

  currentLocationId = j.id;
  if (el.mappingStatus) el.mappingStatus.textContent = `Location created: ${j.name}. Now upload photos.`;
  el.mappingStep.classList.remove("hidden");

  // Optional: set active location if your server supports it
  try {
    await fetch(`${SERVER_BASE}/set_active_location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: "default", location_id: currentLocationId }),
    });
  } catch (_) {}

  await refreshGallery();
}

async function uploadSelectedPhotos() {
  if (!currentLocationId) {
    if (el.mappingStatus) el.mappingStatus.textContent = "Create a location first.";
    return;
  }

  const files = el.photoInput?.files;
  if (!files || files.length === 0) {
    if (el.mappingStatus) el.mappingStatus.textContent = "Select one or more photos first.";
    return;
  }

  if (el.mappingStatus) el.mappingStatus.textContent = `Uploading ${files.length} photo(s)...`;

  for (const file of files) {
    const fd = new FormData();
    fd.append("image", file, file.name);

    const r = await fetch(`${SERVER_BASE}/locations/${currentLocationId}/upload`, {
      method: "POST",
      body: fd,
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      if (el.mappingStatus) el.mappingStatus.textContent = j.error || "Upload failed.";
      return;
    }
  }

  if (el.mappingStatus) el.mappingStatus.textContent = "Upload complete. Keep walking and take more photos if needed.";
  el.photoInput.value = "";
  await refreshGallery();
}

// Wire mapping UI
el.btnMapNewLocation?.addEventListener("click", openMappingModal);
el.closeMappingModal?.addEventListener("click", closeMappingModal);
el.mappingModal?.addEventListener("click", (e) => {
  if (e.target === el.mappingModal) closeMappingModal();
});
el.createLocationBtn?.addEventListener("click", createLocation);
el.uploadPhotosBtn?.addEventListener("click", uploadSelectedPhotos);
