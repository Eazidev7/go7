import { useState, useEffect, useRef } from 'react';
import { haversineKm } from '../utils/distance';

/**
 * Custom hook to provide real-time tracking functionality
 * This simulates a real-time connection to a rider's location
 */
export function useRealTimeTracking(booking, initialStatus = 'assigned') {
  const [riderLocation, setRiderLocation] = useState(null);
  const [status, setStatus] = useState(initialStatus);
  const [eta, setEta] = useState(null);
  const [route, setRoute] = useState([]);
  
  // Refs for simulation
  const simulationTimerRef = useRef(null);
  const simulationSpeedRef = useRef(0.0005); // Adjust for faster/slower movement
  const statusTimersRef = useRef([]);
  
  // Speed values (km/h) for different vehicles and traffic conditions
  const vehicleSpeeds = {
    MOTORCYCLE: { min: 25, max: 35 },
    CAR: { min: 20, max: 30 },
    VAN: { min: 15, max: 25 }
  };
  
  // Status sequence and timing (in seconds)
  const statusSequence = [
    { status: 'assigned', minDuration: 30, maxDuration: 60 },
    { status: 'en-route-pickup', minDuration: 60, maxDuration: 180 },
    { status: 'picked-up', minDuration: 15, maxDuration: 30 },
    { status: 'en-route-dropoff', minDuration: 120, maxDuration: 300 },
    { status: 'delivered', minDuration: 0, maxDuration: 0 }
  ];
  
  // Calculate realistic ETA based on distance and real-world factors
  const calculateRealisticETA = (distanceKm, vehicleType = 'MOTORCYCLE') => {
    if (!distanceKm) return null;
    
    // Get speed range for vehicle type
    const { min: minSpeed, max: maxSpeed } = vehicleSpeeds[vehicleType];
    
    // Random speed within range, simulating traffic conditions
    const speedKmh = minSpeed + Math.random() * (maxSpeed - minSpeed);
    
    // Calculate time in hours
    const timeHours = distanceKm / speedKmh;
    
    // Convert to minutes and add random delay (0-5 minutes)
    const randomDelay = Math.floor(Math.random() * 5);
    const timeMinutes = Math.ceil(timeHours * 60) + randomDelay;
    
    return timeMinutes;
  };
  
  // Generate waypoints between two points for a realistic route
  const generateWaypoints = (start, end, numPoints = 8) => {
    if (!start || !end) return [];
    
    const waypoints = [start];
    
    // Direct vector from start to end
    const dx = end.lng - start.lng;
    const dy = end.lat - start.lat;
    
    // Generate intermediate waypoints with some random deviation
    for (let i = 1; i < numPoints; i++) {
      const ratio = i / numPoints;
      
      // Base position along the direct path
      const baseLng = start.lng + dx * ratio;
      const baseLat = start.lat + dy * ratio;
      
      // Add some random deviation (more in the middle, less at the ends)
      const deviation = 0.0005 * Math.sin(ratio * Math.PI); // Max deviation in the middle
      const randomLng = baseLng + (Math.random() * 2 - 1) * deviation;
      const randomLat = baseLat + (Math.random() * 2 - 1) * deviation;
      
      waypoints.push({ lat: randomLat, lng: randomLng });
    }
    
    waypoints.push(end);
    return waypoints;
  };
  
  // Clean up simulation timers
  const clearAllTimers = () => {
    clearInterval(simulationTimerRef.current);
    statusTimersRef.current.forEach(timer => clearTimeout(timer));
    statusTimersRef.current = [];
  };
  
  // Start or stop the simulation
  useEffect(() => {
    if (!booking || !booking.pickup?.coords || !booking.dropoff?.coords) {
      clearAllTimers();
      return;
    }
    
    // Initialize rider at a location approaching pickup
    if (!riderLocation) {
      // Start rider slightly away from pickup location
      const pickupLat = booking.pickup.coords.lat;
      const pickupLng = booking.pickup.coords.lng;
      
      // Random offset to start rider from
      const riderStartLat = pickupLat + (Math.random() * 0.01 - 0.005);
      const riderStartLng = pickupLng + (Math.random() * 0.01 - 0.005);
      
      setRiderLocation({ lat: riderStartLat, lng: riderStartLng });
      
      // Generate a realistic route from rider to pickup
      const pickupRoute = generateWaypoints(
        { lat: riderStartLat, lng: riderStartLng },
        booking.pickup.coords
      );
      
      // Generate a realistic route from pickup to dropoff
      const deliveryRoute = generateWaypoints(
        booking.pickup.coords,
        booking.dropoff.coords
      );
      
      // Combine routes
      setRoute([...pickupRoute, ...deliveryRoute.slice(1)]);
    }
    
    // Set up status transition simulation
    const setupStatusTimers = () => {
      clearAllTimers();
      
      let currentStatusIndex = statusSequence.findIndex(s => s.status === status);
      if (currentStatusIndex === -1) currentStatusIndex = 0;
      
      let cumulativeDelay = 0;
      
      // Schedule all subsequent status changes
      for (let i = currentStatusIndex + 1; i < statusSequence.length; i++) {
        const { status: nextStatus, minDuration, maxDuration } = statusSequence[i];
        
        // Random duration between min and max
        const duration = Math.floor(minDuration + Math.random() * (maxDuration - minDuration));
        cumulativeDelay += duration * 1000; // Convert to milliseconds
        
        const timerId = setTimeout(() => {
          setStatus(nextStatus);
        }, cumulativeDelay);
        
        statusTimersRef.current.push(timerId);
      }
    };
    
    // Set up rider movement simulation
    const setupMovementSimulation = () => {
      // Clear any existing timer
      clearInterval(simulationTimerRef.current);
      
      // Keep track of current waypoint
      let currentWaypointIndex = 0;
      
      simulationTimerRef.current = setInterval(() => {
        if (!route || route.length < 2 || currentWaypointIndex >= route.length - 1) {
          // End of route or no route
          clearInterval(simulationTimerRef.current);
          return;
        }
        
        // Current and next waypoint
        const currentWaypoint = route[currentWaypointIndex];
        const nextWaypoint = route[currentWaypointIndex + 1];
        
        // Current rider position
        const { lat: riderLat, lng: riderLng } = riderLocation;
        
        // Vector to next waypoint
        const latDiff = nextWaypoint.lat - riderLat;
        const lngDiff = nextWaypoint.lng - riderLng;
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        
        if (distance < simulationSpeedRef.current) {
          // Rider has reached the current waypoint, move to next
          currentWaypointIndex++;
          
          // If we've reached the pickup waypoint, update status
          if (currentWaypointIndex === route.indexOf(booking.pickup.coords) && 
              status === 'en-route-pickup') {
            setStatus('picked-up');
            
            // Schedule transition to en-route-dropoff
            setTimeout(() => setStatus('en-route-dropoff'), 5000);
          }
          
          // If we've reached the final waypoint, mark as delivered
          if (currentWaypointIndex >= route.length - 1) {
            setStatus('delivered');
            clearInterval(simulationTimerRef.current);
          }
          
        } else {
          // Move rider toward next waypoint
          const newLat = riderLat + (latDiff / distance) * simulationSpeedRef.current;
          const newLng = riderLng + (lngDiff / distance) * simulationSpeedRef.current;
          
          setRiderLocation({ lat: newLat, lng: newLng });
          
          // Update ETA based on current position
          let targetCoords;
          if (status === 'assigned' || status === 'en-route-pickup') {
            targetCoords = booking.pickup.coords;
          } else if (status === 'picked-up' || status === 'en-route-dropoff') {
            targetCoords = booking.dropoff.coords;
          }
          
          if (targetCoords) {
            const distanceToTarget = haversineKm(
              [newLat, newLng],
              [targetCoords.lat, targetCoords.lng]
            );
            const newEta = calculateRealisticETA(distanceToTarget);
            setEta(newEta);
          }
        }
      }, 200); // Update every 200ms for smooth movement
    };
    
    // Initialize simulation
    setupStatusTimers();
    setupMovementSimulation();
    
    return () => {
      clearAllTimers();
    };
  }, [booking, riderLocation, status]);
  
  return {
    riderLocation,
    status,
    eta,
    route: route.map(point => [point.lat, point.lng]),
    isDelivered: status === 'delivered'
  };
}
