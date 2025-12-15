const SERVER_URL = "https://bananapuck-server.onrender.com/get_data";

let map = L.map("map").setView([36.9741, -122.0308], 14);
let marker = L.marker([36.9741, -122.0308]).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

async function fetchData() {
  try {
    const res = await fetch(SERVER_URL);
    const data = await res.json();

    // Vitals
    document.getElementById("hr").textContent = data.hr?.toFixed(1) ?? "--";
    document.getElementById("breathing").textContent =
      data.breathing?.toFixed(1) ?? "--";
    document.getElementById("temp").textContent =
      data.temp?.toFixed(1) ?? "--";

    // Acceleration
    document.getElementById("ax").textContent = data.accel?.x?.toFixed(2) ?? "--";
    document.getElementById("ay").textContent = data.accel?.y?.toFixed(2) ?? "--";
    document.getElementById("az").textContent = data.accel?.z?.toFixed(2) ?? "--";

    // Gyro
    document.getElementById("gx").textContent = data.gyro?.x?.toFixed(2) ?? "--";
    document.getElementById("gy").textContent = data.gyro?.y?.toFixed(2) ?? "--";
    document.getElementById("gz").textContent = data.gyro?.z?.toFixed(2) ?? "--";

    // GPS
    if (data.gps?.lat && data.gps?.lon) {
      document.getElementById("lat").textContent = data.gps.lat.toFixed(6);
      document.getElementById("lon").textContent = data.gps.lon.toFixed(6);
      document.getElementById("acc").textContent =
        data.gps.accuracy ?? "--";

      marker.setLatLng([data.gps.lat, data.gps.lon]);
      map.setView([data.gps.lat, data.gps.lon], 16);
    }

    // Alerts
    const alertsBox = document.getElementById("activeAlerts");
    if (data.alerts_active && data.alerts_active.length > 0) {
      alertsBox.innerHTML = "";
      data.alerts_active.forEach((a) => {
        const div = document.createElement("div");
        div.className = "alert-item";
        div.textContent = a;
        alertsBox.appendChild(div);
      });
    } else {
      alertsBox.textContent = "No active alerts";
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// Poll every 2 seconds
fetchData();
setInterval(fetchData, 2000);
