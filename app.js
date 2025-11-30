// PC IP for Flask server
const SERVER_URL = "http://10.0.0.75:5000";

const alertsList = document.getElementById("alerts");
const walkieList = document.getElementById("walkie-messages");
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");
const mapDiv = document.getElementById("map");

let lastAlertTimestamp = 0;

// Fetch data from Flask server
async function fetchData() {
    try {
        const res = await fetch(`${SERVER_URL}/get_data`);
        const data = await res.json();

        updateMap(data.location);
        updateAlerts(data.alerts);
        updateWalkie(data.inbox);

    } catch (err) {
        console.error("Error fetching data:", err);
    }
}

// Update alerts
function updateAlerts(alerts) {
    alertsList.innerHTML = "";
    alerts.forEach(alert => {
        const li = document.createElement("li");
        li.textContent = `[${new Date(alert.ts).toLocaleTimeString()}] ${alert.type.toUpperCase()}: ${alert.message}`;
        alertsList.appendChild(li);

        // Auto-trigger emergency prompt for new alerts
        if (alert.ts > lastAlertTimestamp) {
            lastAlertTimestamp = alert.ts;
            if (alert.type === "submerged" || alert.type === "fall") {
                setTimeout(() => {
                    alertEmergency(alert);
                }, 10000); // 10 sec later
            }
        }
    });
}

// Alert caregiver to call emergency services
function alertEmergency(alert) {
    const call = confirm(`Emergency detected: ${alert.type}\nCall emergency services now?`);
    if (call) {
        alert("Send exact coordinates to emergency services.");
    }
}

// Update walkie messages
function updateWalkie(messages) {
    walkieList.innerHTML = "";
    messages.forEach(msg => {
        const li = document.createElement("li");
        li.textContent = `[${new Date(msg.ts).toLocaleTimeString()}] ${msg.message}`;
        walkieList.appendChild(li);
    });
}

// Send walkie message
sendBtn.addEventListener("click", async () => {
    const message = messageInput.value.trim();
    if (!message) return;

    try {
        await fetch(`${SERVER_URL}/send_message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });
        messageInput.value = "";
        fetchData(); // refresh immediately
    } catch (err) {
        console.error("Error sending message:", err);
    }
});

// Update map (simple placeholder)
function updateMap(location) {
    mapDiv.textContent = `Lat: ${location.lat.toFixed(6)}, Lon: ${location.lon.toFixed(6)}, Accuracy: ${location.accuracy} m`;
}

// Fetch data every second
setInterval(fetchData, 1000);
