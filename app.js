let map, service, infoWindow;

function initMap() {
    // Start map centered on Ottawa
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 45.4215, lng: -75.6972 },
        zoom: 12,
        mapId: "DEMO_MAP_ID", // Required for advanced markers
    });
    infoWindow = new google.maps.InfoWindow();

    document.getElementById("locate-me").addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(pos);
                map.setZoom(14);
                findMasjids(pos);
            });
        }
    });
}

function findMasjids(location) {
    const request = {
        location: location,
        radius: '10000', // 10km search
        type: ['mosque']
    };

    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            const list = document.getElementById("results-list");
            list.innerHTML = ""; // Clear old results
            results.forEach(place => {
                createMarker(place);
                addToList(place);
            });
        }
    });
}

function createMarker(place) {
    const marker = new google.maps.Marker({
        map,
        position: place.geometry.location,
        title: place.name,
        icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" // Custom Green Pin
    });

    marker.addListener("click", () => {
        infoWindow.setContent(`<strong>${place.name}</strong><br>${place.vicinity}`);
        infoWindow.open(map, marker);
    });
}

function addToList(place) {
    const list = document.getElementById("results-list");
    const div = document.createElement("div");
    div.className = "place-card";
    
    // Create direct Google Maps direction link
    const directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name)}&destination_place_id=${place.place_id}`;
    
    div.innerHTML = `
        <h3>${place.name}</h3>
        <p>${place.vicinity}</p>
        <a href="${directionsLink}" target="_blank" class="directions-btn">Get Directions</a>
    `;
    list.appendChild(div);
}