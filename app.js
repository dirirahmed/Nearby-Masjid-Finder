let userMarker;
const map = L.map('map').setView([45.4215, -75.6972], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 1. Compass Orientation (Device Orientation API)
window.addEventListener('deviceorientationabs', (event) => {
    if (event.alpha !== null) {
        const heading = event.alpha; // Compass heading
        document.getElementById('device-arrow').style.transform = `translate(-50%, -50%) rotate(${-heading}deg)`;
    }
}, true);

// 2. Search Functionality (Using OpenStreetMap Nominatim - Free)
document.getElementById('search-btn').addEventListener('click', async () => {
    const query = document.getElementById('address-input').value;
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (data.length > 0) {
        const { lat, lon } = data[0];
        updateLocation(parseFloat(lat), parseFloat(lon));
    }
});

function updateLocation(lat, lon) {
    // Blue icon for user
    if (userMarker) userMarker.remove();
    userMarker = L.circleMarker([lat, lon], {
        radius: 8, fillColor: "#3498db", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8
    }).addTo(map).bindPopup("You are here");

    map.setView([lat, lon], 14);
    
    // Update Qibla
    const qibla = calculateQibla(lat, lon);
    document.getElementById('qibla-indicator').style.transform = `rotate(${qibla}deg)`;
    document.getElementById('angle-text').innerText = `Qibla: ${Math.round(qibla)}°`;

    fetchMasjids(lat, lon);
}

// Broadened Search for "Mosque" AND "Masjid"
async function fetchMasjids(lat, lon) {
    // We use a regex in Overpass to find both terms in names or tags
    const query = `
        [out:json];
        (
          node["amenity"="place_of_worship"]["religion"="muslim"](around:15000, ${lat}, ${lon});
          node["name"~"Masjid|Mosque", i](around:15000, ${lat}, ${lon});
        );
        out;
    `;
    // ... (rest of your existing fetch and sort logic)
}