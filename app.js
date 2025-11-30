const SERVER_URL = "http://10.0.0.75:5000";

let map;
let marker;

// Initialize map
window.onload = function() {
    map = L.map('map').setView([37.421999, -122.084057], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    marker = L.marker([37.421999, -122.084057]).addTo(map);
};

// Fetch GPS + alerts + walkie messages
async function fetchData() {
    try {
        const res = await fetch(`${SERVER_URL}/get_data`);
        const data = await res.json();

        updateLocation(data.location);
        updateWalkie(data.inbox);

    } catch (err) {
        console.error("Fetch error:", err);
    }
}

// Update map + coordinates
function updateLocation(loc) {
    document.getElementById("lat").textContent = loc.lat.toFixed(6);
    document.getElementById("lon").textContent = loc.lon.toFixed(6);
    document.getElementById("acc").textContent = loc.accuracy;

    marker.setLatLng([loc.lat, loc.lon]);
    map.setView([loc.lat, loc.lon]);
}

// Update walkie messages
function updateWalkie(messages) {
    const box = document.getElementById("walkie-messages");
    box.innerHTML = "";

    messages.forEach(msg => {
        const li = document.createElement("li");
        li.textContent = `[${new Date(msg.ts).toLocaleTimeString()}] Voice message received`;
        box.appendChild(li);
    });
}

setInterval(fetchData, 1000);

// ------------------------
// Walkie Talkie Recorder
// ------------------------

let mediaRecorder;
let audioChunks = [];

const recordBtn = document.getElementById("record-btn");

recordBtn.addEventListener("mousedown", async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    recordBtn.textContent = "Recording...";
    recordBtn.style.background = "#ff5757";
});

recordBtn.addEventListener("mouseup", () => {
    if (!mediaRecorder) return;

    mediaRecorder.stop();

    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        sendAudio(audioBlob);

        recordBtn.textContent = "Hold to Talk";
        recordBtn.style.background = "#ffcc00";
    };
});

// Send audio to Flask server
async function sendAudio(blob) {
    const formData = new FormData();
    formData.append("audio", blob);

    await fetch(`${SERVER_URL}/send_audio`, {
        method: "POST",
        body: formData
    });
}
