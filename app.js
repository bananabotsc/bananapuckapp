// app.js - Caregiver web app (uses Firebase Realtime DB + Storage)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();
// messaging if needed:
// const messaging = firebase.messaging();

const DEVICE_ID = "bananapuck_demo_1"; // change for each device in production

// UI refs
const statusEl = document.getElementById('status');
const coordsEl = document.getElementById('coords');
const mapEl = document.getElementById('map');
const alertArea = document.getElementById('alertArea');
const callEmergencyBtn = document.getElementById('callEmergencyBtn');

let map = L.map('map').setView([37.422, -122.084], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
let deviceMarker = null;

// Realtime listener for device location
function startLocationListener(){
  const locRef = db.ref(`/devices/${DEVICE_ID}/location`);
  locRef.on('value', snapshot => {
    const val = snapshot.val();
    if(!val){ statusEl.textContent = 'No location yet'; return; }
    statusEl.textContent = `Last update: ${new Date(val.timestamp || Date.now()).toLocaleString()}`;
    coordsEl.textContent = `Lat: ${val.lat.toFixed(6)}, Lon: ${val.lon.toFixed(6)}, accuracy: ${val.accuracy||'N/A'}`;
    const lat = val.lat, lon = val.lon;
    if(!deviceMarker){
      deviceMarker = L.marker([lat,lon]).addTo(map);
      map.setView([lat,lon], 16);
    } else {
      deviceMarker.setLatLng([lat,lon]);
    }
  });
}

// Alerts listener
function startAlertListener(){
  const alertsRef = db.ref(`/devices/${DEVICE_ID}/alerts`);
  alertsRef.limitToLast(10).on('child_added', snap => {
    const alert = snap.val();
    showAlert(alert);
  });
}

function showAlert(alert){
  console.log("ALERT:", alert);
  const div = document.createElement('div');
  div.className = 'alert';
  div.innerHTML = `<strong>${alert.type.toUpperCase()}</strong> — ${alert.message}<br/><small>${new Date(alert.ts).toLocaleString()}</small>`;
  alertArea.prepend(div);
  // Auto-open walkie and prompt to call after 10s
  openWalkiePanel();
  setTimeout(()=> promptCallEmergency(alert), 10000);
}

// minimal walkie UI + audio recorder
let mediaRecorder, recordedChunks = [], preview = document.getElementById('preview');
const recordBtn = document.getElementById('recordBtn'), sendBtn = document.getElementById('sendBtn');
recordBtn.onclick = async () => {
  if(!mediaRecorder || mediaRecorder.state === 'inactive'){
    // start recording
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];
    mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      preview.src = URL.createObjectURL(blob);
      sendBtn.disabled = false;
    };
    mediaRecorder.start();
    recordBtn.textContent = 'Stop Recording';
  } else {
    mediaRecorder.stop();
    recordBtn.textContent = 'Start Recording';
  }
};

sendBtn.onclick = async () => {
  if(recordedChunks.length === 0) return;
  const blob = new Blob(recordedChunks, { type: 'audio/webm' });
  const name = `messages/${DEVICE_ID}/caregiver_${Date.now()}.webm`;
  const ref = storage.ref().child(name);
  await ref.put(blob);
  const url = await ref.getDownloadURL();
  // add a reference in DB so device sees it
  const msgRef = db.ref(`/devices/${DEVICE_ID}/inbox`).push();
  await msgRef.set({
    from: 'caregiver',
    ts: Date.now(),
    url: url,
    filename: name
  });
  sendBtn.disabled = true;
  preview.src = '';
  alert('Message sent to device.');
};

// incoming messages list (messages the device sends)
function startInboxListener(){
  const inboxRef = db.ref(`/caregiverInbox/${DEVICE_ID}`);
  inboxRef.on('child_added', snap => {
    const m = snap.val();
    addInboxItem(m);
  });
}
function addInboxItem(m){
  const li = document.createElement('li');
  const play = document.createElement('audio');
  play.controls = true; play.src = m.url;
  li.appendChild(play);
  li.appendChild(document.createTextNode(` — ${new Date(m.ts).toLocaleString()}`));
  document.getElementById('inbox').prepend(li);
}

// Helper UI actions
function openWalkiePanel(){
  // scroll to walkie section in page
  document.getElementById('walkie').scrollIntoView({behavior:'smooth'});
}

// Emergency prompt when alert occurs (caregiver)
function promptCallEmergency(alert){
  callEmergencyBtn.style.display = 'inline-block';
  callEmergencyBtn.onclick = async () => {
    // send a log entry to DB for record
    await db.ref(`/devices/${DEVICE_ID}/emergency_requests`).push({
      ts: Date.now(),
      alert,
      caregiverAction: 'call_emergency'
    });
    // find last known location to share
    const locSnap = await db.ref(`/devices/${DEVICE_ID}/location`).once('value');
    const loc = locSnap.val();
    if(loc){
      const shareText = `Emergency: user alert ${alert.type}. Location: ${loc.lat},${loc.lon}`;
      alert(`CALL 911 (or local emergency number) and share: ${shareText}`);
      // in a real app you can integrate click-to-call or share via SMS/email here
    } else {
      alert('No location available to share.');
    }
    callEmergencyBtn.style.display = 'none';
  };
}

// init
startLocationListener();
startAlertListener();
startInboxListener();
