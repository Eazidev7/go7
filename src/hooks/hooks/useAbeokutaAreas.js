// src/hooks/useAbeokutaAreas.js
import { useState, useEffect } from 'react';

const ABEOKUTA_AREAS = [
  "Kuto", "Ibara", "Oke-Ilewo", "Panseke", "Ita‑Eko", "Isale‑Igbein", 
  "Lafenwa", "Quarry Road", "Totoro", "Asero", "Adigbe", "Camp", 
  "Obantoko", "Idi‑Aba", "Saje", "Sapon", "Ijeun", "Ayetoro Road"
];

const CACHE_KEY = 'abeokuta-areas-v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Hook to geocode and cache Abeokuta areas
 * @returns {Object} areas, loading state, error, and refresh function
 */
export function useAbeokutaAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const geocodeArea = async (name) => {
    try {
      const query = `${name}, Abeokuta, Ogun State, Nigeria`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.length === 0) {
        console.warn(`No results found for ${name}`);
        return null;
      }
      
      // Verify the result is within Abeokuta
      const result = data[0];
      if (!result.display_name.toLowerCase().includes('abeokuta')) {
        console.warn(`${name} is not within Abeokuta according to Nominatim`);
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
      for (const area of ABEOKUTA_AREAS) {
        const result = await geocodeArea(area);
        if (result) {
          results.push(result);
        }
        // Throttle to 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Add color clusters based on neighborhood groups
      const areasWithColors = results.map(area => {
        let color = 'gray';
        const name = area.name.toLowerCase();
        
        if (['kuto', 'ibara', 'oke-ilewo', 'panseke', 'ita‑eko'].includes(name)) {
          color = 'blue';
        } else if (['asero', 'adigbe', 'quarry road', 'totoro'].includes(name)) {
          color = 'green';
        } else if (['camp', 'obantoko'].includes(name)) {
          color = 'orange';
        } else if (['lafenwa', 'saje', 'sapon'].includes(name)) {
          color = 'purple';
        } else if (['idi‑aba', 'ijeun', 'ayetoro road'].includes(name)) {
          color = 'pink';
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
  }, []);

  return {
    areas,
    loading,
    error,
    refresh: geocodeAreas
  };
}
