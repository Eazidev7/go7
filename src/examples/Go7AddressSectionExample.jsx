// ==========================================================
// INTEGRATION EXAMPLE – How to use Go7AddressSection
// ==========================================================

import React from 'react';
import Go7AddressSection from './components/Go7AddressSection';

const BookDelivery = () => {
    // Fetch suggestions function (using hybrid Google + OSM)
    const fetchSuggestions = async (query, type) => {
        try {
            const bias = "7.1475,3.3619"; // Abeokuta center

            // Call your existing fetchAddressSuggestions function
            // or use the hybrid approach we created earlier
            const [googleRes, osmRes] = await Promise.allSettled([
                fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&location=${bias}&radius=15000&key=YOUR_KEY`),
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)},Abeokuta&format=json&limit=5`)
            ]);

            let suggestions = [];

            // Process Google results
            if (googleRes.status === "fulfilled" && googleRes.value) {
                const data = await googleRes.value.json();
                if (data.predictions) {
                    suggestions.push(...data.predictions.map(p => ({
                        id: p.place_id,
                        text: p.description,
                        source: 'google',
                        coordinates: null
                    })));
                }
            }

            // Process OSM results
            if (osmRes.status === "fulfilled" && osmRes.value) {
                const data = await osmRes.value.json();
                if (data.length > 0) {
                    suggestions.push(...data.map(p => ({
                        id: `osm-${p.place_id}`,
                        text: p.display_name,
                        source: 'osm',
                        coordinates: [parseFloat(p.lon), parseFloat(p.lat)]
                    })));
                }
            }

            return suggestions.slice(0, 7);
        } catch (error) {
            console.error('Fetch suggestions error:', error);
            return [];
        }
    };

    // Calculate route function
    const calculateRoute = async (pickup, dropoff) => {
        try {
            // Use your existing route calculation logic
            // or calculate distance between two points

            const distance = calculateDistance(
                pickup.coordinates?.[1] || pickup.lat,
                pickup.coordinates?.[0] || pickup.lng,
                dropoff.coordinates?.[1] || dropoff.lat,
                dropoff.coordinates?.[0] || dropoff.lng
            );

            const fare = calculateFare(distance);
            const eta = calculateETA(distance);

            return {
                distance: distance.toFixed(1),
                eta: eta,
                fare: fare
            };
        } catch (error) {
            console.error('Calculate route error:', error);
            return null;
        }
    };

    // Handle pickup change
    const handlePickupChange = (suggestion) => {
        console.log('Pickup selected:', suggestion);
        // Set your pickup state here
    };

    // Handle dropoff change
    const handleDropoffChange = (suggestion) => {
        console.log('Dropoff selected:', suggestion);
        // Set your dropoff state here
    };

    return (
        <div className="book-delivery-page">
            {/* Other components */}

            <Go7AddressSection
                onPickupChange={handlePickupChange}
                onDropoffChange={handleDropoffChange}
                fetchSuggestions={fetchSuggestions}
                calculateRoute={calculateRoute}
            />

            {/* Continue with rest of booking form */}
        </div>
    );
};

// Helper functions
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateFare(distance) {
    // Your pricing logic
    const baseRate = 100;
    const perKm = 120;
    return baseRate + (distance * perKm);
}

function calculateETA(distance) {
    // Average speed in Abeokuta (km/h)
    const avgSpeed = 20;
    const hours = distance / avgSpeed;
    const minutes = Math.round(hours * 60);

    if (minutes < 60) {
        return `${minutes} mins`;
    } else {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    }
}

export default BookDelivery;
