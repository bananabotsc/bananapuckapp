// CHANGE THIS to your PC server IP
const SERVER = "http://10.0.0.75:5000";

async function fetchData() {
    try {
        const res = await fetch(`${SERVER}/get_data`);
        const data = await res.json();

        // ------- Existing Values -------
        document.getElementById("heartRate").innerText = data.hr ?? "--";
        document.getElementById("respiration").innerText = data.breathing ?? "--";
        document.getElementById("bodyTemp").innerText = data.temp ?? "--";
        document.getElementById("water").innerText = data.water_submerged ? "Submerged" : "Dry";

        // ------- NEW VALUES BELOW -------

        // Orientation
        if (data.orientation) {
            document.getElementById("roll").innerText = `Roll: ${data.orientation[0]}`;
            document.getElementById("pitch").innerText = `Pitch: ${data.orientation[1]}`;
            document.getElementById("yaw").innerText = `Yaw: ${data.orientation[2]}`;
        }

        // Acceleration
        if (data.accel) {
            document.getElementById("accelX").innerText = `X: ${data.accel.x}`;
            document.getElementById("accelY").innerText = `Y: ${data.accel.y}`;
            document.getElementById("accelZ").innerText = `Z: ${data.accel.z}`;
        }

        // Gyroscope
        if (data.gyro) {
            document.getElementById("gyroX").innerText = `X: ${data.gyro.x}`;
            document.getElementById("gyroY").innerText = `Y: ${data.gyro.y}`;
            document.getElementById("gyroZ").innerText = `Z: ${data.gyro.z}`;
        }

        // Lidar
        document.getElementById("lidar").innerText = `${data.distance_m ?? "--"} m`;

        // GPS
        if (data.gps) {
            document.getElementById("gpsLat").innerText = `Lat: ${data.gps.lat}`;
            document.getElementById("gpsLon").innerText = `Lon: ${data.gps.lon}`;
            document.getElementById("gpsAcc").innerText = `Accuracy: ${data.gps.accuracy} m`;
        }

        // Audio
        if (data.audio_start) {
            document.getElementById("audioStatus").innerText = "Status: Recording…";
        } else if (data.audio_end) {
            document.getElementById("audioStatus").innerText = "Status: Idle";
        }

        // Actuator events
        if (data.actuator_event) {
            document.getElementById("actEvent").innerText =
                `${data.actuator_event} (Strength ${data.actuator_strength}, Duration ${data.actuator_duration}s)`;
        }

    } catch (err) {
        console.log("Error fetching data:", err);
    }
}

// Poll every 600ms
setInterval(fetchData, 600);

// ---------------------
// Push-to-Talk Handling
// ---------------------
const pttBTN = document.getElementById("ptt-btn");
const pttStatus = document.getElementById("ptt-status");
let mediaRecorder;
let chunks = [];

pttBTN.addEventListener("mousedown", startRecording);
pttBTN.addEventListener("mouseup", stopRecording);
pttBTN.addEventListener("mouseleave", stopRecording);

async function startRecording() {
    pttStatus.innerText = "Recording…";

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.start();
    chunks = [];

    mediaRecorder.ondataavailable = e => chunks.push(e.data);
}

function stopRecording() {
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    pttStatus.innerText = "Sending…";

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        sendAudio(blob);
    };
}

// Send recorded voice to server
async function sendAudio(blob) {
    const formData = new FormData();
    formData.append("audio", blob, "voice.webm");

    await fetch(`${SERVER}/upload_audio`, {
        method: "POST",
        body: formData
    });

    pttStatus.innerText = "Idle";
}
