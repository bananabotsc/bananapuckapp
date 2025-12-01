// app.js
// Change this if your server IP changes:
const SERVER = "http://10.0.0.75:5000";

let map, marker;
let fullHistory = [];
let activeMetric = null;
let activeMetricLabel = "";
let historyChart = null;

// ---------- MAP SETUP ----------
window.addEventListener("load", () => {
    const mapEl = document.getElementById("map");
    if (mapEl) {
        map = L.map("map").setView([37.422, -122.084], 17);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19
        }).addTo(map);
        marker = L.marker([37.422, -122.084]).addTo(map);
    }

    // Start polling
    setInterval(fetchData, 1000);
    setInterval(fetchHistory, 10000);   // refresh history every 10s
    setInterval(fetchAudioList, 10000); // refresh audio list every 10s

    setupInteractions();
});

// ---------- BASIC HELPERS ----------
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function roundOrDash(val, decimals = 2) {
    if (val == null) return "--";
    const p = Math.pow(10, decimals);
    return Math.round(val * p) / p;
}

function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString();
}

// ---------- FETCH LATEST DATA ----------
async function fetchData() {
    try {
        const res = await fetch(`${SERVER}/get_data`);
        const data = await res.json();

        console.log("Live data:", data);

        // Vitals
        setText("heartRate", data.hr != null ? `${data.hr} bpm` : "-- bpm");
        setText("respirationRate", data.breathing != null ? `${data.breathing} breaths/min` : "-- breaths/min");
        setText("temperature", data.temp != null ? `${data.temp} °C` : "-- °C");
        setText("waterSub", data.water_submerged ? "Submerged" : "Dry");

        // Orientation
        if (Array.isArray(data.orientation)) {
            setText("roll", `Roll: ${roundOrDash(data.orientation[0])}`);
            setText("pitch", `Pitch: ${roundOrDash(data.orientation[1])}`);
            setText("yaw", `Yaw: ${roundOrDash(data.orientation[2])}`);
        }

        // Accel
        if (data.accel) {
            setText("accelX", `X: ${roundOrDash(data.accel.x, 3)}`);
            setText("accelY", `Y: ${roundOrDash(data.accel.y, 3)}`);
            setText("accelZ", `Z: ${roundOrDash(data.accel.z, 3)}`);
        }

        // Gyro
        if (data.gyro) {
            setText("gyroX", `X: ${roundOrDash(data.gyro.x, 3)}`);
            setText("gyroY", `Y: ${roundOrDash(data.gyro.y, 3)}`);
            setText("gyroZ", `Z: ${roundOrDash(data.gyro.z, 3)}`);
        }

        // LiDAR
        setText("lidarDist", data.distance_m != null ? `${data.distance_m} m` : "-- m");

        // GPS
        if (data.gps) {
            if (data.gps.lat != null && data.gps.lon != null) {
                setText("gpsLat", `Lat: ${roundOrDash(data.gps.lat, 6)}`);
                setText("gpsLon", `Lon: ${roundOrDash(data.gps.lon, 6)}`);
            }
            if (data.gps.accuracy != null) {
                setText("gpsAcc", `Accuracy: ${data.gps.accuracy} m`);
            }

            // Update map
            if (map && marker && data.gps.lat != null && data.gps.lon != null) {
                const latlng = [data.gps.lat, data.gps.lon];
                marker.setLatLng(latlng);
                map.setView(latlng);
            }
        }

        // ECG
        setText("ecgVal", data.ecg != null ? data.ecg : "--");

        // Last update
        if (data.timestamp) {
            setText("lastUpdate", new Date(data.timestamp).toLocaleTimeString());
        }

        // Alert box
        const alertBox = document.getElementById("alertBox");
        const alertText = document.getElementById("alertText");
        if (alertBox && alertText) {
            alertText.textContent = data.alert_message || "All good.";
            alertBox.classList.remove("alert-ok", "alert-warning", "alert-critical");
            if (data.alert_level === "CRITICAL") {
                alertBox.classList.add("alert-critical");
            } else if (data.alert_level === "WARNING") {
                alertBox.classList.add("alert-warning");
            } else {
                alertBox.classList.add("alert-ok");
            }
        }

    } catch (err) {
        console.error("Error fetching data:", err);
    }
}

// ---------- FETCH HISTORY ----------
async function fetchHistory() {
    try {
        const res = await fetch(`${SERVER}/history`);
        fullHistory = await res.json();
    } catch (err) {
        console.error("Error fetching history:", err);
    }
}

// ---------- AUDIO LIST ----------
async function fetchAudioList() {
    try {
        const res = await fetch(`${SERVER}/audio_list`);
        const clips = await res.json();
        const container = document.getElementById("audioList");
        if (!container) return;

        container.innerHTML = "";
        clips.forEach(clip => {
            const item = document.createElement("div");
            item.className = "audio-item";

            const timeLabel = document.createElement("div");
            timeLabel.textContent = formatTime(clip.timestamp);

            const audio = document.createElement("audio");
            audio.controls = true;
            audio.src = `${SERVER}/uploads/${clip.filename}`;

            item.appendChild(timeLabel);
            item.appendChild(audio);
            container.appendChild(item);
        });
    } catch (err) {
        console.error("Error fetching audio list:", err);
    }
}

// ---------- INTERACTIONS (call user, history modal) ----------
function setupInteractions() {
    const callBtn = document.getElementById("callUserBtn");
    if (callBtn) {
        callBtn.addEventListener("click", async () => {
            try {
                await fetch(`${SERVER}/call_user`, { method: "POST" });
                alert("Call command sent (vibration).");
            } catch (err) {
                console.error("Error calling user:", err);
            }
        });
    }

    // Vital card clicks
    const cards = document.querySelectorAll(".vital-card");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            activeMetric = card.getAttribute("data-metric");
            activeMetricLabel = card.getAttribute("data-label") || activeMetric;
            openHistoryModal();
        });
    });

    // Modal controls
    const overlay = document.getElementById("historyModalOverlay");
    const closeBtn = document.getElementById("closeModalBtn");
    if (closeBtn) closeBtn.addEventListener("click", closeHistoryModal);
    if (overlay) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeHistoryModal();
        });
    }

    const windowSelect = document.getElementById("historyWindow");
    if (windowSelect) {
        windowSelect.addEventListener("change", () => {
            renderHistoryModal();  // re-render when window changes
        });
    }
}

// ---------- HISTORY MODAL RENDERING ----------
function openHistoryModal() {
    const overlay = document.getElementById("historyModalOverlay");
    const titleEl = document.getElementById("modalTitle");
    if (!overlay || !titleEl) return;

    titleEl.textContent = activeMetricLabel || "History";
    overlay.style.display = "flex";

    if (!historyChart) {
        const ctx = document.getElementById("historyChart").getContext("2d");
        historyChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: [],
                datasets: [{
                    label: activeMetricLabel,
                    data: [],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { display: false },
                    y: { beginAtZero: false }
                }
            }
        });
    }

    renderHistoryModal();
}

function closeHistoryModal() {
    const overlay = document.getElementById("historyModalOverlay");
    if (overlay) overlay.style.display = "none";
}

function renderHistoryModal() {
    if (!activeMetric || !fullHistory || fullHistory.length === 0) return;

    const windowSelect = document.getElementById("historyWindow");
    const hours = parseInt(windowSelect.value, 10) || 24;
    const cutoff = Date.now() - hours * 3600 * 1000;

    // Filter history by time window
    const subset = fullHistory.filter(entry => entry.timestamp >= cutoff);

    const labels = [];
    const values = [];

    subset.forEach(entry => {
        labels.push(new Date(entry.timestamp).toLocaleTimeString());

        let val = null;
        if (["hr", "breathing", "temp", "distance_m", "water_submerged"].includes(activeMetric)) {
            val = entry[activeMetric];
        } else if (activeMetric === "gps") {
            val = entry.gps && entry.gps.lat != null ? entry.gps.lat : null;
        } else if (activeMetric === "orientation") {
            val = entry.orientation && entry.orientation.length > 1 ? entry.orientation[1] : null; // pitch
        } else if (activeMetric === "accel") {
            val = entry.accel ? entry.accel.z : null;
        } else if (activeMetric === "gyro") {
            val = entry.gyro ? entry.gyro.z : null;
        }

        values.push(val);
    });

    // Update chart
    if (historyChart) {
        historyChart.data.labels = labels;
        historyChart.data.datasets[0].label = activeMetricLabel;
        historyChart.data.datasets[0].data = values;
        historyChart.update();
    }

    // Update table
    const tbody = document.querySelector("#historyTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    subset.forEach(entry => {
        const tr = document.createElement("tr");
        const tdTime = document.createElement("td");
        const tdVal = document.createElement("td");

        tdTime.textContent = formatTime(entry.timestamp);

        let val = null;
        if (["hr", "breathing", "temp", "distance_m", "water_submerged"].includes(activeMetric)) {
            val = entry[activeMetric];
        } else if (activeMetric === "gps") {
            if (entry.gps && entry.gps.lat != null && entry.gps.lon != null) {
                val = `${entry.gps.lat.toFixed(6)}, ${entry.gps.lon.toFixed(6)}`;
            }
        } else if (activeMetric === "orientation") {
            val = entry.orientation ? entry.orientation.join(", ") : null;
        } else if (activeMetric === "accel") {
            val = entry.accel ? `x:${entry.accel.x}, y:${entry.accel.y}, z:${entry.accel.z}` : null;
        } else if (activeMetric === "gyro") {
            val = entry.gyro ? `x:${entry.gyro.x}, y:${entry.gyro.y}, z:${entry.gyro.z}` : null;
        }

        tdVal.textContent = val != null ? val : "--";

        tr.appendChild(tdTime);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
    });
}
