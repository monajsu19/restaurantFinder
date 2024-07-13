let map;
let service;
let infowindow;
let userLocationMarker;
let markers = [];
let restaurants = [];

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -33.8688, lng: 151.2195 },
        zoom: 13
    });

    infowindow = new google.maps.InfoWindow();
}

function findRestaurants() {
    clearMarkers();
    restaurants = []; // Clear previous restaurant data

    const locationInput = document.getElementById('location-input').value;
    const radiusInput = document.getElementById('radius-input').value || 3; // Default radius in miles
    const typeInput = document.getElementById('type-input').value;

    const radiusInMeters = radiusInput * 1609.34; // Convert miles to meters

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'address': locationInput }, function (results, status) {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            map.setCenter(location);

            if (userLocationMarker) {
                userLocationMarker.setMap(null);
            }

            userLocationMarker = new google.maps.Marker({
                map: map,
                position: location,
                icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });

            const request = {
                location: location,
                radius: radiusInMeters,
                type: ['restaurant']
            };

            if (typeInput) {
                request.keyword = typeInput;
            }

            service = new google.maps.places.PlacesService(map);
            service.nearbySearch(request, function(results, status) {
                handleResults(results, status, location);
            });
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
}

function clearMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
}

function handleResults(results, status, origin) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        results.forEach((place) => {
            // Query Distance Matrix for each restaurant
            const service = new google.maps.DistanceMatrixService();
            service.getDistanceMatrix({
                origins: [origin],
                destinations: [place.geometry.location],
                travelMode: 'DRIVING',
                unitSystem: google.maps.UnitSystem.IMPERIAL
            }, function(response, status) {
                if (status === 'OK') {
                    const distance = response.rows[0].elements[0].distance;
                    const duration = response.rows[0].elements[0].duration;

                    restaurants.push({
                        place: place,
                        distance: distance,
                        duration: duration
                    });

                    if (restaurants.length === results.length) {
                        displayRestaurants();
                    }
                }
            });
        });
    }
}

function displayRestaurants() {
    const sortBy = document.getElementById('sort-by').value;
    if (sortBy === 'time') {
        restaurants.sort((a, b) => a.duration.value - b.duration.value);
    } else if (sortBy === 'distance') {
        restaurants.sort((a, b) => a.distance.value - b.distance.value);
    }

    const restaurantList = document.getElementById('restaurant-list');
    restaurantList.innerHTML = '';

    restaurants.forEach((restaurant) => {
        const place = restaurant.place;
        createMarker(place);

        const listItem = document.createElement('div');
        listItem.className = 'restaurant-item';
        listItem.innerHTML = `
            <strong><a href="https://www.google.com/maps/place/?q=place_id:${place.place_id}" target="_blank">${place.name}</a></strong><br>
            Rating: ${place.rating || 'N/A'}<br>
            Price Level: ${place.price_level || 'N/A'}<br>
            Driving Distance: ${restaurant.distance.text}<br>
            Driving Time: ${restaurant.duration.text}<br>
        `;
        restaurantList.appendChild(listItem);
    });
}

function createMarker(place) {
    const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location
    });

    markers.push(marker);

    google.maps.event.addListener(marker, 'click', function () {
        infowindow.setContent(`
            <div><strong><a href="https://www.google.com/maps/place/?q=place_id:${place.place_id}" target="_blank">${place.name}</a></strong><br>
            Rating: ${place.rating || 'N/A'}<br>
            Price Level: ${place.price_level || 'N/A'}<br>
        `);
        infowindow.open(map, this);
    });
}