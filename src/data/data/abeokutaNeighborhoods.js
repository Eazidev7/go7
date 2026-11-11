// Define neighborhood data for the interactive map
export const ABEOKUTA_NEIGHBORHOODS = [
  {
    id: 'kuto',
    name: 'Kuto',
    coordinates: [7.1475, 3.3618],
    color: 'blue',
    cssClass: 'label-blue',
    active: false
  },
  {
    id: 'panseke',
    name: 'Panseke',
    coordinates: [7.1547, 3.3456],
    color: 'green',
    cssClass: 'label-green',
    active: false
  },
  {
    id: 'lafenwa',
    name: 'Lafenwa',
    coordinates: [7.1645, 3.3261],
    color: 'red',
    cssClass: 'label-red',
    active: false
  },
  {
    id: 'sapon',
    name: 'Sapon',
    coordinates: [7.1580, 3.3502],
    color: 'purple',
    cssClass: 'label-purple',
    active: false
  },
  {
    id: 'oke-ilewo',
    name: 'Oke-Ilewo',
    coordinates: [7.1555, 3.3410],
    color: 'orange',
    cssClass: 'label-orange',
    active: false
  },
  {
    id: 'adatan',
    name: 'Adatan',
    coordinates: [7.1450, 3.3795],
    color: 'yellow',
    cssClass: 'label-yellow',
    active: false
  },
  {
    id: 'asero',
    name: 'Asero',
    coordinates: [7.1458, 3.3708],
    color: 'brown',
    cssClass: 'label-brown',
    active: false
  },
  {
    id: 'ijaye',
    name: 'Ijaye',
    coordinates: [7.1622, 3.3388],
    color: 'darkred',
    cssClass: 'label-darkred',
    active: false
  },
  {
    id: 'ago-ika',
    name: 'Ago-Ika',
    coordinates: [7.1702, 3.3605],
    color: 'teal',
    cssClass: 'label-teal',
    active: false
  },
  {
    id: 'obantoko',
    name: 'Obantoko',
    coordinates: [7.1255, 3.4022],
    color: 'lightblue',
    cssClass: 'label-lblue',
    active: false
  }
];

// Default map center and zoom level
export const MAP_DEFAULT_CENTER = [7.1475, 3.3618]; // Centered on Kuto
export const MAP_DEFAULT_ZOOM = 13;

// Generate bounds to fit all neighborhoods
export const generateMapBounds = () => {
  const latitudes = ABEOKUTA_NEIGHBORHOODS.map(neighborhood => neighborhood.coordinates[0]);
  const longitudes = ABEOKUTA_NEIGHBORHOODS.map(neighborhood => neighborhood.coordinates[1]);
  
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  
  // Add padding to the bounds
  const latPadding = (maxLat - minLat) * 0.1;
  const lngPadding = (maxLng - minLng) * 0.1;
  
  return [
    [minLat - latPadding, minLng - lngPadding], // Southwest corner
    [maxLat + latPadding, maxLng + lngPadding]  // Northeast corner
  ];
};

// Function to get neighborhood by ID
export const getNeighborhoodById = (id) => {
  return ABEOKUTA_NEIGHBORHOODS.find(neighborhood => neighborhood.id === id) || null;
};