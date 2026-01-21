const map = L.map('map').setView([45.4215, -75.6972], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

document.getElementById('locate-btn').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 14);
        fetchMasjids(latitude, longitude);
    });
});

async function fetchMasjids(lat, lon) {
    const list = document.getElementById('list');
    list.innerHTML = "Searching...";

    // Overpass Query: Find mosques within 5000 meters
    const query = `
        [out:json];
        node["amenity"="place_of_worship"]["religion"="muslim"](around:5000, ${lat}, ${lon});
        out;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        list.innerHTML = "";
        data.elements.forEach(item => {
            const name = item.tags.name || "Unnamed Masjid";
            
            // Add Marker to Map
            L.marker([item.lat, item.lon]).addTo(map).bindPopup(name);

            // Add to Sidebar
            const div = document.createElement('div');
            div.className = 'place-card';
            div.innerHTML = `
                <strong>${name}</strong><br>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}" target="_blank">Directions</a>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        list.innerHTML = "Error fetching data.";
    }
}