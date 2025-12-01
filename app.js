// ---------------------------
// CONFIG
// ---------------------------
const SERVER_IP = "http://192.168.137.1:5000";   // ← your PC hotspot IP

// ---------------------------
// DOM ELEMENTS
// ---------------------------
const elements = {
    hr: document.getElementById("hr_val"),
    respiration: document.getElementById("respiration_val"),
    temperature: document.getElementById("temp_val"),
    water: document.getElementById("water_val"),
    distance: document.getElementById("distance_val"),

    accel_x: document.getElementById("accel_x"),
    accel_y: document.getElementById("accel_y"),
    accel_z: document.getElementById("accel_z"),

    gyro_x: document.getElementById("gyro_x"),
    gyro_y: document.getElementById("gyro_y"),
    gyro_z: document.getElementById("gyro_z"),

    roll: document.getElementById("roll_val"),
    pitch: document.getElementById("pitch_val"),
    yaw: document.getElementById("yaw_val"),

    lat: document.getElementById("lat_val"),
    lon: document.getElementById("lon_val"),
    gps_accuracy: document.getElementById("gps_accuracy"),

    alerts_list: document.getElementById("alerts_list"),
    clearAlertsBtn: document.getElementById("clear_alerts")
};

// ---------------------------
// LEAFLET MAP
// ---------------------------
let map = L.map("map").setView([37.42, -122.08], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
let marker = L.marker([37.42, -122.08]).addTo(map);

// ---------------------------
// UPDATE DASHBOARD LOOP
// ---------------------------
async function fetchData() {
    try {
        let r = await fetch(`${SERVER_IP}/get_data`);
        let data = await r.json();

        updateUI(data);
        updateAlerts(data.alerts_active);

    } catch (err) {
        console.log("Error fetching:", err);
    }
}

setInterval(fetchData, 1000);

// ---------------------------
// UPDATE UI ELEMENTS
// ---------------------------
function updateUI(d) {
    elements.hr.textContent = d.hr ?? "--";
    elements.respiration.textContent = d.breathing ?? "--";
    elements.temperature.textContent = d.temp ?? "--";
    elements.water.textContent = d.water_submerged ? "YES" : "NO";
    elements.distance.textContent = d.distance_m ?? "--";

    elements.accel_x.textContent = d.accel?.x ?? "--";
    elements.accel_y.textContent = d.accel?.y ?? "--";
    elements.accel_z.textContent = d.accel?.z ?? "--";

    elements.gyro_x.textContent = d.gyro?.x ?? "--";
    elements.gyro_y.textContent = d.gyro?.y ?? "--";
    elements.gyro_z.textContent = d.gyro?.z ?? "--";

    elements.roll.textContent = d.orientation[0];
    elements.pitch.textContent = d.orientation[1];
    elements.yaw.textContent = d.orientation[2];

    elements.lat.textContent = d.gps.lat ?? "--";
    elements.lon.textContent = d.gps.lon ?? "--";
    elements.gps_accuracy.textContent = d.gps.accuracy ?? "--";

    // Update map
    if (d.gps.lat && d.gps.lon) {
        marker.setLatLng([d.gps.lat, d.gps.lon]);
        map.setView([d.gps.lat, d.gps.lon]);
    }
}

// ---------------------------
// ALERT SYSTEM
// ---------------------------

function updateAlerts(alerts) {
    elements.alerts_list.innerHTML = "";

    alerts.forEach(alert => {
        const div = document.createElement("div");
        div.className = "alert-box " + alert.level.toLowerCase();
        div.innerHTML = `
            <strong>${alert.title}</strong><br>
            ${alert.message}<br>
            <small>${new Date(alert.time).toLocaleTimeString()}</small>
            <button class="dismiss-btn" data-id="${alert.id}">X</button>
        `;
        elements.alerts_list.appendChild(div);
    });

    // Add dismiss handlers
    document.querySelectorAll(".dismiss-btn").forEach(btn => {
        btn.onclick = () => dismissAlert(btn.dataset.id);
    });
}

async function dismissAlert(id) {
    await fetch(`${SERVER_IP}/dismiss_alert`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ id })
    });
}

// CLEAR ALL ALERTS
elements.clearAlertsBtn.onclick = async () => {
    await fetch(`${SERVER_IP}/clear_alerts`, { method: "POST" });
};
