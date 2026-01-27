let map, userMarker;
let masjidMarkers = [];
const KAABA = { lat: 21.422487, lng: 39.826206 };

function initMap() {
    map = L.map('map').setView([21.4225, 39.8262], 14);

    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors, © CartoDB'
    }).addTo(map);

    // User marker
    userMarker = L.marker([21.4225, 39.8262], {
        icon: L.divIcon({
            html: '📍',
            className: 'user-marker',
            iconSize: [30, 30]
        })
    }).addTo(map);

    // Search input
    const input = document.getElementById("address-input");
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            searchLocation(input.value);
        }
    });

    // Search button
    document.getElementById("search-btn").addEventListener("click", () => {
        searchLocation(input.value);
    });

    // Locate button
    document.getElementById("locate-btn").addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                updateUI(pos);
            });
        }
    });

    // Compass logic (same as before)
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientationabsolute', (e) => {
            if (e.alpha) {
                document.getElementById('facing-val').innerText = `${Math.round(e.alpha)}°`;
                document.getElementById('compass-face').style.transform = `rotate(${-e.alpha}deg)`;
            }
        }, true);
    }
}

function searchLocation(query) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const pos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                updateUI(pos);
            } else {
                alert('Location not found');
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            alert('Search failed');
        });
}

function calculateQibla(lat, lon) {
    const φ1 = lat * Math.PI / 180;
    const φ2 = KAABA.lat * Math.PI / 180;
    const Δλ = (KAABA.lng - lon) * Math.PI / 180;
    const y = Math.sin(Δλ);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

async function updateUI(pos) {
    map.setView([pos.lat, pos.lng], 14);
    userMarker.setLatLng([pos.lat, pos.lng]);

    const qibla = calculateQibla(pos.lat, pos.lng);
    document.getElementById('qibla-val').innerText = `${Math.round(qibla)}°`;
    document.getElementById('qibla-indicator').style.transform = `rotate(${qibla}deg)`;

    // Clear old markers
    masjidMarkers.forEach(m => map.removeLayer(m));
    masjidMarkers = [];

    // Fetch mosques using Overpass API
    const query = `[out:json];node(around:5000,${pos.lat},${pos.lng})[amenity=mosque];out;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const list = document.getElementById("list");
            list.innerHTML = "";

            data.elements.forEach(element => {
                const marker = L.marker([element.lat, element.lon]).addTo(map);
                masjidMarkers.push(marker);

                const name = element.tags.name || "Mosque";
                const card = document.createElement("div");
                card.className = "place-card";
                card.innerHTML = `<strong>${name}</strong><p>${element.lat.toFixed(4)}, ${element.lon.toFixed(4)}</p>`;
                card.onclick = () => {
                    map.setView([element.lat, element.lon], 16);
                };
                list.appendChild(card);
            });

            if (data.elements.length === 0) {
                list.innerHTML = "<p>No mosques found nearby</p>";
            }
        })
        .catch(error => {
            console.error('Mosque search error:', error);
            document.getElementById("list").innerHTML = "<p>Error loading mosques</p>";
        });
}

initMap();