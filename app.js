// Replace your tileLayer line with this:
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// Update function to reflect new stat boxes
function updatePos(lat, lon) {
    if (userMarker) userMarker.remove();
    userMarker = L.circleMarker([lat, lon], {
        radius: 12,
        color: '#fff',
        weight: 3,
        fillColor: '#3498db',
        fillOpacity: 1
    }).addTo(map);

    const qibla = getQibla(lat, lon);
    document.getElementById('qibla-indicator').style.transform = `rotate(${qibla}deg)`;
    document.getElementById('qibla-val').innerText = `${Math.round(qibla)}°`;
    
    map.setView([lat, lon], 14);
    fetchMasjids(lat, lon);
}

// Ensure the orientation updates the FACING stat box
window.addEventListener('deviceorientationabsolute', (e) => {
    let heading = e.alpha || e.webkitCompassHeading || 0;
    document.getElementById('compass-face').style.transform = `rotate(${-heading}deg)`;
    document.getElementById('facing-val').innerText = `${Math.round(heading)}°`;
}, true);