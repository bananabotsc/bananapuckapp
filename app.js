// ---------------- MAP SETUP ----------------

let map = L.map('map').setView([37.7749, -122.4194], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

let marker = L.marker([37.7749, -122.4194]).addTo(map);

// --------------- SENSOR POLLING ---------------

async function fetchData() {
    try {
        const response = await fetch("/data");
        const data = await response.json();

        // Update UI fields
        document.getElementById("heartRate").textContent = data.heart_rate;
        document.getElementById("respirationRate").textContent = data.respiration_rate;
        document.getElementById("temperature").textContent = data.temperature;
        document.getElementById("waterSub").textContent = data.water;

        document.getElementById("ecg").textContent = data.ecg;
        document.getElementById("imu").textContent = `P:${data.pitch} R:${data.roll} Y:${data.yaw}`;
        document.getElementById("gps").textContent = `${data.latitude}, ${data.longitude}`;
        document.getElementById("audio").textContent = data.audio;
        document.getElementById("logic").textContent = data.logic;
        document.getElementById("lidar").textContent = data.lidar_distance;

        // Update map marker
        if (data.latitude && data.longitude) {
            marker.setLatLng([data.latitude, data.longitude]);
            map.setView([data.latitude, data.longitude]);
        }

    } catch (err) {
        console.error("Fetch error:", err);
    }
}

// Poll sensors every 1 second
setInterval(fetchData, 1000);
