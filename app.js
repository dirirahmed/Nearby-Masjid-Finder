let map, userMarker, infoWindow;
let masjidMarkers = [];
const KAABA = { lat: 21.422487, lng: 39.826206 };

async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { Place, Autocomplete } = await google.maps.importLibrary("places");
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

    // Dark Mode Map Style
    map = new Map(document.getElementById("map"), {
        center: { lat: 21.4225, lng: 39.8262 },
        zoom: 14,
        mapId: "4504f994bd057f62", // Use your Map ID for Advanced Markers
        disableDefaultUI: true,
        styles: [{ "elementType": "geometry", "stylers": [{ "color": "#212121" }] }] // Basic dark style
    });

    // 1. Setup Blue Arrow for User
    const pin = new PinElement({ background: "#007AFF", borderColor: "#fff", glyphColor: "#fff" });
    userMarker = new AdvancedMarkerElement({ map, zIndex: 10 });

    // 2. Setup Autocomplete
    const input = document.getElementById("address-input");
    const autocomplete = new Autocomplete(input);
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            updateUI(place.geometry.location.toJSON(), Place, AdvancedMarkerElement);
        }
    });

    // 3. Locate Button
    document.getElementById("locate-btn").addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                updateUI(pos, Place, AdvancedMarkerElement);
            });
        }
    });

    // 4. Compass Logic
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientationabsolute', (e) => {
            if (e.alpha) {
                document.getElementById('facing-val').innerText = `${Math.round(e.alpha)}°`;
                document.getElementById('compass-face').style.transform = `rotate(${-e.alpha}deg)`;
            }
        }, true);
    }
}

function calculateQibla(lat, lon) {
    const φ1 = lat * Math.PI / 180;
    const φ2 = KAABA.lat * Math.PI / 180;
    const Δλ = (KAABA.lng - lon) * Math.PI / 180;
    const y = Math.sin(Δλ);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

async function updateUI(pos, Place, AdvancedMarkerElement) {
    map.panTo(pos);
    userMarker.position = pos;

    const qibla = calculateQibla(pos.lat, pos.lng);
    document.getElementById('qibla-val').innerText = `${Math.round(qibla)}°`;
    document.getElementById('qibla-indicator').style.transform = `rotate(${qibla}deg)`;

    // Clear old markers
    masjidMarkers.forEach(m => m.map = null);
    masjidMarkers = [];

    const request = {
        fields: ["displayName", "location", "formattedAddress"],
        locationRestriction: { center: pos, radius: 5000 },
        includedPrimaryTypes: ["mosque"],
        maxResultCount: 15
    };

    const { places } = await Place.searchNearby(request);
    const list = document.getElementById("list");
    list.innerHTML = "";

    places.forEach(place => {
        const marker = new AdvancedMarkerElement({ map, position: place.location, title: place.displayName.text });
        masjidMarkers.push(marker);

        const card = document.createElement("div");
        card.className = "place-card";
        card.innerHTML = `<strong>${place.displayName.text}</strong><p>${place.formattedAddress}</p>`;
        card.onclick = () => {
            map.panTo(place.location);
            map.setZoom(16);
        };
        list.appendChild(card);
    });
}

initMap();