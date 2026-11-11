/**
 * 🚀 Go7 Dynamic ETA Hook
 * 
 * Custom React hook that calculates real-time ETA using Google Maps Distance Matrix Service
 * Falls back to Haversine formula if Google Maps fails
 * Updates every 30 seconds as the rider moves toward the destination
 * 
 * Features:
 * - Real-time ETA using Google Maps (with traffic data)
 * - Fallback to Haversine calculation
 * - Distance display in km
 * - Auto-refresh every 30 seconds
 * - Formatted arrival time (e.g., "Today, 6:08 PM")
 * 
 * @requires dayjs - For time formatting
 */

import { useState, useEffect } from "react";
import dayjs from "dayjs";

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate dynamic ETA between rider and dropoff location
 * Uses Google Maps Distance Matrix Service with traffic data
 * Falls back to Haversine formula if Google Maps fails
 * 
 * @param {Object} rider - Rider's current location {lat, lng}
 * @param {Object} dropoff - Dropoff destination {lat, lng}
 * @returns {Object} { eta: string, distance: string, isLoading: boolean, error: string|null }
 */
function useETA(rider, dropoff) {
  const [eta, setEta] = useState("Calculating...");
  const [distance, setDistance] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Load Google Maps API once using the global script
  useEffect(() => {
    // Check if already loaded
    if (window.google?.maps) {
      console.log("✅ Google Maps already loaded");
      setGoogleMapsLoaded(true);
      return;
    }

    const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!mapsKey) {
      console.warn('⚠️ VITE_GOOGLE_MAPS_API_KEY missing — ETA will use Haversine fallback');
      setGoogleMapsLoaded(false);
      return;
    }

    // Load Google Maps script (billed GO7 Maps Browser key via env)
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log("✅ Google Maps API loaded successfully");
      setGoogleMapsLoaded(true);
    };
    
    script.onerror = () => {
      console.warn("⚠️ Google Maps API failed to load, using fallback");
      setGoogleMapsLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    // Validate coordinates
    if (!rider?.lat || !rider?.lng || !dropoff?.lat || !dropoff?.lng) {
      setEta("Location unavailable");
      setIsLoading(false);
      return;
    }

    const fetchETA = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try Google Maps Distance Matrix Service first
        if (googleMapsLoaded && window.google?.maps) {
          try {
            console.log("🚀 Fetching ETA from Google Maps Distance Matrix Service...");

            const service = new google.maps.DistanceMatrixService();
            const origin = new google.maps.LatLng(rider.lat, rider.lng);
            const destination = new google.maps.LatLng(dropoff.lat, dropoff.lng);

            const result = await new Promise((resolve, reject) => {
              service.getDistanceMatrix(
                {
                  origins: [origin],
                  destinations: [destination],
                  travelMode: google.maps.TravelMode.DRIVING,
                  drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                  }
                },
                (response, status) => {
                  if (status === google.maps.DistanceMatrixStatus.OK) {
                    resolve(response);
                  } else {
                    reject(new Error(`Distance Matrix failed: ${status}`));
                  }
                }
              );
            });

            const element = result.rows[0].elements[0];
            
            if (element.status === "OK") {
              const durationMinutes = Math.ceil(element.duration_in_traffic?.value / 60 || element.duration.value / 60);
              const distanceKm = (element.distance.value / 1000).toFixed(1);

              // Calculate arrival time
              const arrivalTime = dayjs().add(durationMinutes, "minute");
              const today = dayjs().format("YYYY-MM-DD");
              const arrivalDate = arrivalTime.format("YYYY-MM-DD");

              // Format ETA
              let formattedETA;
              if (today === arrivalDate) {
                formattedETA = `Today, ${arrivalTime.format("h:mm A")}`;
              } else {
                formattedETA = arrivalTime.format("MMM D, h:mm A");
              }

              setEta(formattedETA);
              setDistance(`${distanceKm} km`);

              console.log(`✅ Google Maps ETA: ${formattedETA} (${distanceKm} km, ${durationMinutes} min)`);
              setIsLoading(false);
              return;
            }
          } catch (googleErr) {
            console.warn("⚠️ Google Maps Distance Matrix failed, using fallback:", googleErr.message);
          }
        }

        // Fallback to Haversine calculation
        console.log("🚀 Calculating ETA using Haversine formula...");

        // Calculate straight-line distance
        const distanceKm = calculateDistance(
          rider.lat,
          rider.lng,
          dropoff.lat,
          dropoff.lng
        );

        // Apply road factor (straight line * 1.3 for urban roads)
        const roadDistance = distanceKm * 1.3;

        // Average bike speed in Lagos traffic: 25 km/h
        const avgSpeed = 25;
        const durationMinutes = Math.ceil((roadDistance / avgSpeed) * 60);

        // Calculate arrival time
        const arrivalTime = dayjs().add(durationMinutes, "minute");
        const today = dayjs().format("YYYY-MM-DD");
        const arrivalDate = arrivalTime.format("YYYY-MM-DD");

        // Format ETA (show "Today" if same day, otherwise show date)
        let formattedETA;
        if (today === arrivalDate) {
          formattedETA = `Today, ${arrivalTime.format("h:mm A")}`;
        } else {
          formattedETA = arrivalTime.format("MMM D, h:mm A");
        }

        setEta(formattedETA);
        setDistance(`${roadDistance.toFixed(1)} km`);

        console.log(`✅ Haversine ETA: ${formattedETA} (${roadDistance.toFixed(1)} km, ${durationMinutes} min)`);

        setIsLoading(false);
      } catch (err) {
        console.error("❌ ETA calculation failed:", err.message);
        setError(err.message);
        
        // Fallback to estimated values
        setEta("5-10 min");
        setDistance("~2.5 km");
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchETA();

    // Set up interval to refresh every 30 seconds
    const interval = setInterval(fetchETA, 30000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(interval);
      console.log("🛑 ETA polling stopped");
    };
  }, [rider?.lat, rider?.lng, dropoff?.lat, dropoff?.lng, googleMapsLoaded]);

  return { 
    eta, 
    distance, 
    isLoading, 
    error 
  };
}

export default useETA;
