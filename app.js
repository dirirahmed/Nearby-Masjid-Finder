let map, userMarker;
let masjidMarkers = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
const KAABA = { lat: 21.422487, lng: 39.826206 };

function initMap() {
    map = L.map('map').setView([21.4225, 39.8262], 14);

    updateMapTheme();

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

    // Theme toggle
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

    // Tabs
    document.getElementById("mosques-tab").addEventListener("click", () => showTab('mosques'));
    document.getElementById("favorites-tab").addEventListener("click", () => showTab('favorites'));
    document.getElementById("prayer-tab").addEventListener("click", () => showTab('prayer'));

    // Compass logic
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
    showLoading();
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'MasjidFinder/1.0' }
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.length > 0) {
                const pos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                updateUI(pos);
            } else {
                showError('Location not found');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Search error:', error);
            showError('Search failed');
        });
}

function updateMapTheme() {
    const isLight = document.body.classList.contains('light-theme');
    const tileUrl = isLight 
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png';
    L.tileLayer(tileUrl, {
        attribution: '© OpenStreetMap contributors' + (isLight ? '' : ', © CartoDB')
    }).addTo(map);
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const btn = document.getElementById('theme-toggle');
    btn.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    // Reinitialize map with new theme
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });
    updateMapTheme();
}

function showTab(tab) {
    document.querySelectorAll('#tabs button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tab + '-tab').classList.add('active');
    const list = document.getElementById('list');
    if (tab === 'mosques') {
        // Show mosques list (already handled in updateUI)
    } else if (tab === 'favorites') {
        showFavorites();
    } else if (tab === 'prayer') {
        showPrayerTimes();
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error-msg').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(msg) {
    document.getElementById('error-msg').textContent = msg;
    document.getElementById('error-msg').style.display = 'block';
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

    showLoading();
    // Fetch mosques using Overpass API
    const query = `[out:json];node(around:5000,${pos.lat},${pos.lng})[amenity=mosque];out;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            hideLoading();
            const list = document.getElementById("list");
            list.innerHTML = "";

            data.elements.forEach(element => {
                const marker = L.marker([element.lat, element.lon]).addTo(map);
                masjidMarkers.push(marker);

                const name = element.tags.name || "Mosque";
                const card = document.createElement("div");
                card.className = "place-card";
                card.innerHTML = `<strong>${name}</strong><p>${element.lat.toFixed(4)}, ${element.lon.toFixed(4)}</p>
                <button onclick="addToFavorites(${element.lat}, ${element.lon}, '${name.replace(/'/g, "\\'")}')">⭐ Favorite</button>
                <button onclick="getDirections(${element.lat}, ${element.lon})">🗺️ Directions</button>
                <button onclick="shareMosque('${name.replace(/'/g, "\\'")}', ${element.lat}, ${element.lon})">📤 Share</button>`;
                card.onclick = (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        map.setView([element.lat, element.lon], 16);
                    }
                };
                list.appendChild(card);
            });

            if (data.elements.length === 0) {
                list.innerHTML = "<p>No mosques found nearby</p>";
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Mosque search error:', error);
            showError('Error loading mosques');
        });
}

function addToFavorites(lat, lng, name) {
    const fav = { lat, lng, name };
    if (!favorites.some(f => f.lat === lat && f.lng === lng)) {
        favorites.push(fav);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        alert('Added to favorites');
    }
}

function showFavorites() {
    const list = document.getElementById('list');
    list.innerHTML = "";
    favorites.forEach(fav => {
        const card = document.createElement("div");
        card.className = "place-card";
        card.innerHTML = `<strong>${fav.name}</strong><p>${fav.lat.toFixed(4)}, ${fav.lng.toFixed(4)}</p>
        <button onclick="removeFavorite(${fav.lat}, ${fav.lng})">❌ Remove</button>
        <button onclick="getDirections(${fav.lat}, ${fav.lng})">🗺️ Directions</button>`;
        card.onclick = () => map.setView([fav.lat, fav.lng], 16);
        list.appendChild(card);
    });
}

function removeFavorite(lat, lng) {
    favorites = favorites.filter(f => !(f.lat === lat && f.lng === lng));
    localStorage.setItem('favorites', JSON.stringify(favorites));
    showFavorites();
}

function showPrayerTimes() {
    const list = document.getElementById('list');
    list.innerHTML = "<p>Loading prayer times...</p>";
    const pos = userMarker.getLatLng();
    fetch(`https://api.aladhan.com/v1/timings?latitude=${pos.lat}&longitude=${pos.lng}&method=2`)
        .then(response => response.json())
        .then(data => {
            const timings = data.data.timings;
            list.innerHTML = `
                <p><strong>Fajr:</strong> ${timings.Fajr}</p>
                <p><strong>Dhuhr:</strong> ${timings.Dhuhr}</p>
                <p><strong>Asr:</strong> ${timings.Asr}</p>
                <p><strong>Maghrib:</strong> ${timings.Maghrib}</p>
                <p><strong>Isha:</strong> ${timings.Isha}</p>
            `;
        })
        .catch(error => {
            list.innerHTML = "<p>Error loading prayer times</p>";
        });
}

function getDirections(lat, lng) {
    const pos = userMarker.getLatLng();
    const url = `https://www.openstreetmap.org/directions?engine=graphhopper_car&route=${pos.lat},${pos.lng};${lat},${lng}`;
    window.open(url, '_blank');
}

function shareMosque(name, lat, lng) {
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16&layers=M`;
    if (navigator.share) {
        navigator.share({
            title: name,
            text: `Check out ${name}`,
            url: url
        });
    } else {
        navigator.clipboard.writeText(`${name}: ${url}`);
        alert('Link copied to clipboard');
    }
}

initMap();

// Load theme on init
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
    document.getElementById('theme-toggle').textContent = '☀️';
}