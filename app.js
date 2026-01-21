const map = L.map('map').setView([45.4215, -75.6972], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Kaaba Location
const KAABA = { lat: 21.422487, lng: 39.826206 };

function calculateQibla(lat, lon) {
    const φ1 = lat * Math.PI / 180;
    const φ2 = KAABA.lat * Math.PI / 180;
    const Δλ = (KAABA.lng - lon) * Math.PI / 180;
    const y = Math.sin(Δλ);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    let qibla = Math.atan2(y, x) * 180 / Math.PI;
    return (qibla + 360) % 360;
}

document.getElementById('locate-btn').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Update Compass
        const qibla = calculateQibla(latitude, longitude);
        document.getElementById('qibla-arrow-wrapper').style.transform = `rotate(${qibla}deg)`;
        document.getElementById('qibla-debug').innerText = `Qibla: ${Math.round(qibla)}° from North`;

        map.setView([latitude, longitude], 14);
        fetchData(latitude, longitude);
    });
});

async function fetchData(lat, lon) {
    const list = document.getElementById('list');
    list.innerHTML = "<p style='padding:20px;'>Scanning 15km radius...</p>";

    // 1. Fetch Prayer Times (Aladhan API)
    const prayerUrl = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`;
    const prayerRes = await fetch(prayerUrl);
    const prayerData = await prayerRes.json();
    const times = prayerData.data.timings;

    // 2. Fetch Masjids (Overpass API - 15km)
    const query = `[out:json];node["amenity"="place_of_worship"]["religion"="muslim"](around:15000,${lat},${lon});out;`;
    const osmUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    
    try {
        const osmRes = await fetch(osmUrl);
        const osmData = await osmRes.json();

        // 3. Process & Sort by Distance
        let masjids = osmData.elements.map(m => {
            const distance = L.latLng(lat, lon).distanceTo([m.lat, m.lon]) / 1000;
            return {
                name: m.tags.name || "Masjid / Mosque",
                lat: m.lat,
                lon: m.lon,
                distance: distance,
                rating: (Math.random() * (5.0 - 4.2) + 4.2).toFixed(1) // Simulated rating
            };
        }).sort((a, b) => a.distance - b.distance);

        // 4. Render
        list.innerHTML = "";
        masjids.forEach(m => {
            L.marker([m.lat, m.lon]).addTo(map).bindPopup(m.name);
            
            const card = document.createElement('div');
            card.className = 'place-card';
            card.innerHTML = `
                <span class="rating">★ ${m.rating}</span>
                <span class="dist" style="float:right;">${m.distance.toFixed(1)} km</span>
                <div style="font-weight:bold; margin-top:5px;">${m.name}</div>
                <div class="prayer-badge">Next: Dhuhr at ${times.Dhuhr}</div>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}" target="_blank" class="nav-link">Navigate →</a>
            `;
            list.appendChild(card);
        });
    } catch (err) {
        list.innerHTML = "<p style='padding:20px; color:red;'>Error loading data.</p>";
    }
}