let map, userMarker, deviceHeading = 0;
const KAABA = { lat: 21.422487, lng: 39.826206 };

// Initialize Map with High-Quality Dark Tiles
map = L.map('map', { zoomControl: false }).setView([45.4215, -75.6972], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

function getQibla(lat, lon) {
    const φ1 = lat * Math.PI / 180;
    const φ2 = KAABA.lat * Math.PI / 180;
    const Δλ = (KAABA.lng - lon) * Math.PI / 180;
    const y = Math.sin(Δλ);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Device Orientation logic
window.addEventListener('deviceorientationabsolute', (e) => {
    deviceHeading = e.alpha || e.webkitCompassHeading || 0;
    document.getElementById('compass-face').style.transform = `rotate(${-deviceHeading}deg)`;
    document.getElementById('facing-val').innerText = `${Math.round(deviceHeading)}°`;
}, true);

document.getElementById('search-btn').addEventListener('click', async () => {
    const query = document.getElementById('address-input').value;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.length > 0) updatePos(parseFloat(data[0].lat), parseFloat(data[0].lon));
});

document.getElementById('locate-btn').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(p => updatePos(p.coords.latitude, p.coords.longitude));
});

function updatePos(lat, lon) {
    if (userMarker) userMarker.remove();
    userMarker = L.circleMarker([lat, lon], { radius: 12, color: '#fff', weight: 3, fillColor: '#3498db', fillOpacity: 1 }).addTo(map);
    
    map.setView([lat, lon], 14);
    const qibla = getQibla(lat, lon);
    document.getElementById('qibla-indicator').style.transform = `rotate(${qibla}deg)`;
    document.getElementById('qibla-val').innerText = `${Math.round(qibla)}°`;
    
    fetchMasjids(lat, lon);
}

async function fetchMasjids(lat, lon) {
    const list = document.getElementById('list');
    list.innerHTML = "<p style='padding:20px; color:#888;'>Scanning area...</p>";

    // Get Prayer Times (Aladhan)
    const pRes = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`);
    const pData = await pRes.json();
    const times = pData.data.timings;

    // Search for Mosque/Masjid (Overpass)
    const query = `[out:json];(node["amenity"="place_of_worship"]["religion"="muslim"](around:15000,${lat},${lon});node["name"~"Masjid|Mosque",i](around:15000,${lat},${lon}););out;`;
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();

    let results = data.elements.map(m => ({
        name: m.tags.name || "Masjid",
        lat: m.lat, lon: m.lon,
        dist: L.latLng(lat, lon).distanceTo([m.lat, m.lon]) / 1000
    })).sort((a, b) => a.dist - b.dist);

    list.innerHTML = "";
    results.forEach(m => {
        L.marker([m.lat, m.lon]).addTo(map);
        const card = document.createElement('div');
        card.className = 'place-card';
        card.innerHTML = `
            <div style="font-weight:bold; font-size:18px;">${m.name}</div>
            <div style="color:#2ecc71; margin:5px 0;">Next: Dhuhr at ${times.Dhuhr}</div>
            <span style="color:#888; font-size:12px;">${m.dist.toFixed(1)} km away</span>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}" target="_blank" style="float:right; color:#3498db; text-decoration:none; font-weight:bold;">NAVIGATE →</a>
        `;
        list.appendChild(card);
    });
}