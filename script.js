// Koordinat kantor (contoh: -6.200000, 106.816666)
const OFFICE_LAT = -6.200000;
const OFFICE_LON = 106.816666;
const MAX_DISTANCE_METERS = 500;

// Elemen DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const resultDiv = document.getElementById('result');
const checkInBtn = document.getElementById('checkInBtn');
const checkOutBtn = document.getElementById('checkOutBtn');
const timeDisplay = document.getElementById('time');
const gpsStatus = document.getElementById('gpsStatus');
const statusDisplay = document.getElementById('status');

let photoData = null;
let currentLocation = null;

// Update waktu real-time
function updateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    timeDisplay.textContent = `Waktu saat ini: ${hours}:${minutes}`;
    
    // Enable/disable tombol berdasarkan waktu
    checkInBtn.disabled = !(hours === '07' && minutes >= '30');
    checkOutBtn.disabled = !(hours === '16' && minutes >= '00');
}
setInterval(updateTime, 1000);
updateTime();

// Akses kamera
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error("Kamera tidak dapat diakses:", err));

// Ambil foto
captureBtn.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    photoData = canvas.toDataURL('image/png');
    resultDiv.innerHTML = `<img id="photo" src="${photoData}" width="100%">`;
});

// Cek GPS
navigator.geolocation.getCurrentPosition(
    position => {
        currentLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
        };
        const distance = calculateDistance(
            currentLocation.lat, currentLocation.lon,
            OFFICE_LAT, OFFICE_LON
        );
        
        if (distance > MAX_DISTANCE_METERS) {
            gpsStatus.innerHTML = `<span class="warning">Anda di luar jangkauan (${distance.toFixed(0)}m)! Absensi ditolak.</span>`;
            checkInBtn.disabled = true;
            checkOutBtn.disabled = true;
        } else {
            gpsStatus.innerHTML = `<span class="success">Anda dalam jangkauan (${distance.toFixed(0)}m).</span>`;
            checkInBtn.disabled = false;
            checkOutBtn.disabled = false;
        }
    },
    error => {
        gpsStatus.textContent = "GPS tidak aktif!";
        console.error("Error GPS:", error);
    }
);

// Hitung jarak (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Kirim data ke Google Sheets
function sendToGoogleSheets(type) {
    if (!photoData) {
        statusDisplay.textContent = "Ambil foto terlebih dahulu!";
        return;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    const isLate = (type === 'in' && now.getHours() > 7) || 
                   (type === 'out' && now.getHours() < 16);

    // Ganti URL_APPS_SCRIPT dengan URL Google Apps Script Anda
    const scriptUrl = "https://script.google.com/macros/s/AKfycbxn_VCd1nF-MDZuk5OSmSQZ5jVgG7NrdQ4AufgUYJJ6eT_4ZGo5P9EXEIVffK7og6L2/exec";
    
    fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date: dateString,
            time: timeString,
            type: type,
            photo: photoData,
            lat: currentLocation.lat,
            lon: currentLocation.lon,
            status: isLate ? "Terlambat" : "Tepat waktu"
        })
    })
    .then(() => statusDisplay.textContent = `Absensi ${type} berhasil!`)
    .catch(err => statusDisplay.textContent = "Gagal mengirim data.");
}

checkInBtn.addEventListener('click', () => sendToGoogleSheets('in'));
checkOutBtn.addEventListener('click', () => sendToGoogleSheets('out'));
