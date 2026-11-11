// Script to fetch popular places in Abeokuta using Google Places API
// and add them to the landmarks database

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// You'll need to set your Google Maps API Key here
const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

// Abeokuta center coordinates
const ABEOKUTA_CENTER = {
    lat: 7.1475,
    lng: 3.3465
};

// Place types to search for in Abeokuta
const PLACE_TYPES = [
    'hospital',
    'school',
    'university',
    'bank',
    'atm',
    'gas_station',
    'pharmacy',
    'supermarket',
    'restaurant',
    'hotel',
    'church',
    'mosque',
    'bus_station',
    'shopping_mall',
    'government_office',
    'post_office',
    'police',
    'fire_station',
    'park',
    'stadium',
    'market'
];

// Categories mapping
const CATEGORY_MAPPING = {
    hospital: 'Healthcare',
    school: 'Education',
    university: 'Education',
    bank: 'Finance',
    atm: 'Finance',
    gas_station: 'Transport',
    pharmacy: 'Healthcare',
    supermarket: 'Shopping',
    restaurant: 'Food',
    hotel: 'Hotel',
    church: 'Religious',
    mosque: 'Religious',
    bus_station: 'Transport',
    shopping_mall: 'Shopping',
    government_office: 'Government',
    post_office: 'Government',
    police: 'Government',
    fire_station: 'Government',
    park: 'Recreation',
    stadium: 'Recreation',
    market: 'Shopping'
};

async function fetchPlacesForType(type, radius = 10000) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${ABEOKUTA_CENTER.lat},${ABEOKUTA_CENTER.lng}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.status === 'OK') {
            return data.results;
        } else {
            console.warn(`API returned status: ${data.status} for type: ${type}`);
            return [];
        }
    } catch (error) {
        console.error(`Error fetching places for type ${type}:`, error);
        return [];
    }
}

async function fetchAllAbeokutaPlaces() {
    console.log('🔍 Fetching places in Abeokuta...');
    const allPlaces = [];

    for (const type of PLACE_TYPES) {
        console.log(`📍 Searching for ${type} places...`);
        const places = await fetchPlacesForType(type);

        places.forEach(place => {
            // Only include places that are actually in Abeokuta
            if (place.vicinity && place.vicinity.toLowerCase().includes('abeokuta')) {
                const landmark = {
                    id: `google-${place.place_id}`,
                    name: place.name,
                    shortName: place.name.length > 30 ? place.name.substring(0, 30) + '...' : place.name,
                    category: CATEGORY_MAPPING[type] || 'Other',
                    lat: place.geometry.location.lat,
                    lng: place.geometry.location.lng,
                    address: `${place.name}, ${place.vicinity}`,
                    rating: place.rating || null,
                    placeId: place.place_id,
                    types: place.types
                };

                // Avoid duplicates
                if (!allPlaces.find(p => p.placeId === place.place_id)) {
                    allPlaces.push(landmark);
                }
            }
        });

        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Found ${allPlaces.length} unique places in Abeokuta`);
    return allPlaces;
}

async function updateLandmarksFile(newPlaces) {
    const landmarksPath = path.join(__dirname, '../src/data/landmarks.js');

    try {
        // Read current landmarks file
        const landmarksContent = fs.readFileSync(landmarksPath, 'utf8');

        // Parse existing landmarks (basic regex parsing)
        const existingMatch = landmarksContent.match(/export const landmarks = \[([\s\S]*?)\];/);
        if (!existingMatch) {
            throw new Error('Could not parse existing landmarks file');
        }

        // Create backup
        const backupPath = path.join(__dirname, '../src/data/landmarks.backup.js');
        fs.writeFileSync(backupPath, landmarksContent);
        console.log('📁 Created backup at landmarks.backup.js');

        // Format new places as JavaScript objects
        const newPlacesJS = newPlaces.map(place => {
            return `    {
        id: '${place.id}',
        name: "${place.name.replace(/"/g, '\\"')}",
        shortName: "${place.shortName.replace(/"/g, '\\"')}",
        category: '${place.category}',
        lat: ${place.lat},
        lng: ${place.lng},
        address: "${place.address.replace(/"/g, '\\"')}"${place.rating ? `,
        rating: ${place.rating}` : ''}${place.placeId ? `,
        placeId: "${place.placeId}"` : ''}
    }`;
        }).join(',\n');

        // Get the existing landmarks content (everything before the last landmark)
        const existingLandmarksContent = existingMatch[1].trim();

        // Create new landmarks content
        const newLandmarksContent = `// Abeokuta landmarks and popular places with coordinates
export const landmarks = [
${existingLandmarksContent},
    // === GOOGLE PLACES DATA (Auto-generated) ===
${newPlacesJS}
];

// Function to search landmarks by name or category
export const searchLandmarks = (query) => {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();

    return landmarks.filter(landmark =>
        landmark.name.toLowerCase().includes(lowerQuery) ||
        landmark.shortName.toLowerCase().includes(lowerQuery) ||
        landmark.category.toLowerCase().includes(lowerQuery) ||
        landmark.address.toLowerCase().includes(lowerQuery)
    );
};

// Function to get landmarks by category
export const getLandmarksByCategory = (category) => {
    return landmarks.filter(landmark =>
        landmark.category.toLowerCase() === category.toLowerCase()
    );
};

// Function to get landmark by ID
export const getLandmarkById = (id) => {
    return landmarks.find(landmark => landmark.id === id);
};

// Export default
export default landmarks;
`;

        // Write updated file
        fs.writeFileSync(landmarksPath, newLandmarksContent);
        console.log(`✅ Updated landmarks.js with ${newPlaces.length} new places`);

        return true;
    } catch (error) {
        console.error('❌ Error updating landmarks file:', error);
        return false;
    }
}

// Main execution
async function main() {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
        console.error('❌ Please set your GOOGLE_MAPS_API_KEY environment variable');
        console.log('You can run: set VITE_GOOGLE_MAPS_API_KEY=your_api_key_here');
        process.exit(1);
    }

    try {
        console.log('🚀 Starting Abeokuta places fetch...');
        const places = await fetchAllAbeokutaPlaces();

        if (places.length > 0) {
            const success = await updateLandmarksFile(places);
            if (success) {
                console.log('🎉 Successfully updated landmarks with Abeokuta places!');
                console.log(`📊 Summary:`);
                console.log(`   Total places added: ${places.length}`);

                // Show breakdown by category
                const categoryBreakdown = places.reduce((acc, place) => {
                    acc[place.category] = (acc[place.category] || 0) + 1;
                    return acc;
                }, {});

                Object.entries(categoryBreakdown).forEach(([category, count]) => {
                    console.log(`   ${category}: ${count} places`);
                });
            }
        } else {
            console.log('⚠️ No places found. Check your API key and internet connection.');
        }
    } catch (error) {
        console.error('❌ Error in main execution:', error);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { fetchAllAbeokutaPlaces, updateLandmarksFile };