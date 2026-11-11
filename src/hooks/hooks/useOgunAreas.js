// src/hooks/useOgunAreas.js
import { useState, useEffect } from 'react';

const OGUN_AREAS = [
  // Major cities and towns in Ogun State
  "Abeokuta", "Ijebu Ode", "Sagamu", "Ilaro", "Ota", 
  "Ijebu-Igbo", "Iperu", "Ayetoro", "Ifo", "Owode",
  "Ado-Odo", "Igbesa", "Agbara", "Mowe", "Ibafo",
  "Sango-Ota", "Ijoko", "Akute", "Ogijo", "Idi-Iroko"
];

const CACHE_KEY = 'ogun-areas-v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Hook to geocode and cache Ogun State areas
 * @returns {Object} areas, loading state, error, and refresh function
 */
export function useOgunAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const geocodeArea = async (name) => {
    try {
      const query = `${name}, Ogun State, Nigeria`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.length === 0) {
        console.warn(`No results found for ${name}`);
        return null;
      }
      
      // Verify the result is within Ogun State
      const result = data[0];
      if (!result.display_name.toLowerCase().includes('ogun')) {
        console.warn(`${name} is not within Ogun State according to Nominatim`);
        return null;
      }
      
      return {
        name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
      };
    } catch (err) {
      console.error(`Error geocoding ${name}:`, err);
      return null;
    }
  };

  const getCachedAreas = () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { timestamp, data } = JSON.parse(cached);
        const now = new Date().getTime();
        if (now - timestamp < CACHE_DURATION) {
          return data;
        }
      } catch (err) {
        console.error('Error parsing cached areas:', err);
      }
    }
    return null;
  };

  const saveAreasToCache = (areasData) => {
    const cacheData = {
      timestamp: new Date().getTime(),
      data: areasData
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  };

  const geocodeAreas = async () => {
    setLoading(true);
    setError(null);
    
    // Check cache first
    const cachedAreas = getCachedAreas();
    if (cachedAreas && cachedAreas.length > 0) {
      setAreas(cachedAreas);
      setLoading(false);
      return;
    }
    
    // If no cache, perform geocoding with throttling
    try {
      const results = [];
      
      // Geocode each area with throttling (1 request per second)
      for (const area of OGUN_AREAS) {
        const result = await geocodeArea(area);
        if (result) {
          results.push(result);
        }
        // Throttle to 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Add color clusters based on regions
      const areasWithColors = results.map(area => {
        let color = 'gray';
        const name = area.name.toLowerCase();
        
        // Cluster by regions
        if (['abeokuta', 'owode', 'ifo'].includes(name)) {
          color = 'blue';
        } else if (['ijebu ode', 'ijebu-igbo', 'iperu', 'sagamu'].includes(name)) {
          color = 'green';
        } else if (['ilaro', 'ayetoro', 'idi-iroko'].includes(name)) {
          color = 'orange';
        } else if (['ota', 'sango-ota', 'ado-odo', 'agbara', 'igbesa'].includes(name)) {
          color = 'purple';
        } else if (['mowe', 'ibafo', 'ijoko', 'akute', 'ogijo'].includes(name)) {
          color = 'red';
        }
        
        return { ...area, color };
      });
      
      setAreas(areasWithColors);
      saveAreasToCache(areasWithColors);
    } catch (err) {
      setError('Failed to geocode areas. Please try again later.');
      console.error('Geocoding error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    geocodeAreas();
    
    // Return default mock data if geocoding fails
    const timeout = setTimeout(() => {
      if (loading && areas.length === 0) {
        console.log('Geocoding timeout - using default mock data');
        const mockData = OGUN_AREAS.map((name, index) => ({
          name,
          lat: 6.9075 + (Math.random() * 0.2 - 0.1),
          lng: 3.5813 + (Math.random() * 0.2 - 0.1),
          color: ['blue', 'green', 'orange', 'purple', 'red', 'gray'][index % 6]
        }));
        setAreas(mockData);
        setLoading(false);
      }
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timeout);
  }, []);

  return {
    areas,
    loading,
    error,
    refresh: geocodeAreas
  };
}
