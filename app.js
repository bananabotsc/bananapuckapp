const API = "https://bananapuck-server.onrender.com/get_data";

let historyData = {
  hr: [],
  breathing: [],
  temp: []
};

let chart;

async function fetchData() {
  const res = await fetch(API);
  const data = await res.json();

  updateCard("hrCard", data.hr, 60, 100);
  document.getElementById("hrValue").innerText = `${data.hr.toFixed(1)} bpm`;
  pushHistory("hr", data.hr);

  updateCard("brCard", data.breathing, 10, 20);
  document.getElementById("brValue").innerText = `${data.breathing.toFixed(1)} breaths/min`;
  pushHistory("breathing", data.breathing);

  updateCard("tempCard", data.temp, 97, 99.5);
  document.getElementById("tempValue").innerText = `${data.temp.toFixed(1)} °F`;
  pushHistory("temp", data.temp);

  document.getElementById("accelValue").innerText =
    `X:${data.accel.x.toFixed(2)} Y:${data.accel.y.toFixed(2)} Z:${data.accel.z.toFixed(2)}`;

  document.getElementById("gyroValue").innerText =
    `X:${data.gyro.x.toFixed(2)} Y:${data.gyro.y.toFixed(2)} Z:${data.gyro.z.toFixed(2)}`;

  document.getElementById("gpsValue").innerText =
    data.gps.lat ? `${data.gps.lat}, ${data.gps.lon}` : "--";

  document.getElementById("waterValue").innerText =
    data.water_submerged ? "YES" : "NO";
}

function updateCard(id, value, min, max) {
  const card = document.getElementById(id);
  card.classList.remove("safe", "warning", "danger");

  if (value < min - 5 || value > max + 5) card.classList.add("danger");
  else if (value < min || value > max) card.classList.add("warning");
  else card.classList.add("safe");
}

function pushHistory(type, value) {
  historyData[type].push({
    time: new Date().toLocaleTimeString(),
    value
  });
  if (historyData[type].length > 50) historyData[type].shift();
}

function openModal(title, type) {
  document.getElementById("modal").style.display = "flex";
  document.getElementById("modalTitle").innerText = `${title} History`;

  const labels = historyData[type].map(p => p.time);
  const values = historyData[type].map(p => p.value);

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: title,
        data: values,
        borderWidth: 2
      }]
    }
  });

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  historyData[type].forEach(p => {
    tbody.innerHTML += `<tr><td>${p.time}</td><td>${p.value.toFixed(2)}</td></tr>`;
  });
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

setInterval(fetchData, 2000);
fetchData();

/* MAP */
const map = L.map("map").setView([36.9741, -122.0308], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
L.marker([36.9741, -122.0308]).addTo(map);
