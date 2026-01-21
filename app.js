let map, infoWindow, userMarker;
const KAABA = { lat: 21.422487, lng: 39.826206 };

async function initMap() {
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary("places");
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

    map = new Map(document.getElementById("map"), {
        center: { lat: 45.4215, lng: -75.6972 },
        zoom: 13,
        mapId: "DEMO_MAP_ID",
        disableDefaultUI: true
    });
    infoWindow = new InfoWindow();

    document.getElementById("locate-btn").addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                updateUI(pos, Place, AdvancedMarkerElement, PinElement);
            });
        }
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

async function updateUI(pos, Place, AdvancedMarkerElement, PinElement) {
    map.setCenter(pos);
    const qibla = calculateQibla(pos.lat, pos.lng);
    document.getElementById('qibla-val').innerText = `${Math.round(qibla)}°`;
    document.getElementById('qibla-indicator').style.transform = `rotate(${qibla}deg)`;

    const request = {
        fields: ["displayName", "location", "formattedAddress"],
        locationRestriction: { center: pos, radius: 15000 },
        includedPrimaryTypes: ["place_of_worship"],
        maxResultCount: 20
    };

    const { places } = await Place.searchNearby(request);
    const list = document.getElementById("list");
    list.innerHTML = "";

    places.forEach(place => {
        const marker = new AdvancedMarkerElement({ map, position: place.location, title: place.displayName });
        const card = document.createElement("div");
        card.className = "place-card";
        card.innerHTML = `<strong>${place.displayName}</strong><p>${place.formattedAddress}</p>`;
        list.appendChild(card);
    });
}

initMap();