// GO7 Delivery Route Mock Data Generator
// Creates realistic delivery routes for testing the replay system

import { Timestamp } from 'firebase/firestore';

// Lagos delivery area coordinates
const LAGOS_BOUNDS = {
  north: 6.7,
  south: 6.4,
  east: 3.6,
  west: 3.3
};

// Common delivery locations in Lagos
const PICKUP_LOCATIONS = [
  { lat: 6.5244, lng: 3.3792, name: "Victoria Island" },
  { lat: 6.4698, lng: 3.3697, name: "Ikoyi" },
  { lat: 6.6018, lng: 3.3515, name: "Ikeja" },
  { lat: 6.5795, lng: 3.3211, name: "Surulere" },
  { lat: 6.4985, lng: 3.3529, name: "Lekki Phase 1" },
  { lat: 6.4473, lng: 3.4673, name: "Ajah" },
  { lat: 6.6342, lng: 3.3464, name: "Alaba" }
];

const DELIVERY_LOCATIONS = [
  { lat: 6.5388, lng: 3.3515, name: "Lagos Island" },
  { lat: 6.4593, lng: 3.3901, name: "Banana Island" },
  { lat: 6.4314, lng: 3.4106, name: "Lekki Phase 2" },
  { lat: 6.4698, lng: 3.5560, name: "Epe" },
  { lat: 6.6269, lng: 3.3441, name: "Yaba" },
  { lat: 6.5833, lng: 3.2500, name: "Agege" },
  { lat: 6.4433, lng: 3.3915, name: "VI Extension" }
];

export class DeliveryRouteGenerator {
  constructor() {
    this.orderId = this.generateOrderId();
  }

  // Generate a realistic order ID
  generateOrderId() {
    const prefix = 'GO7';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix + '-';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Generate a complete delivery route
  generateRoute(options = {}) {
    const {
      type = 'normal', // normal, express, long, stops
      duration = 25, // minutes
      complexity = 'medium' // low, medium, high
    } = options;

    const pickup = this.randomLocation(PICKUP_LOCATIONS);
    let delivery = this.randomLocation(DELIVERY_LOCATIONS);
    
    // Ensure minimum distance between pickup and delivery
    while (this.calculateDistance(pickup, delivery) < 2000) {
      delivery = this.randomLocation(DELIVERY_LOCATIONS);
    }

    const route = this.generateRoutePoints(pickup, delivery, type, duration, complexity);
    
    return {
      orderId: this.orderId,
      userId: `user_${Math.random().toString(36).substr(2, 9)}`,
      riderId: `rider_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: Timestamp.fromDate(new Date(Date.now() - duration * 60 * 1000)),
      endedAt: Timestamp.fromDate(new Date()),
      status: 'delivered',
      pickup: {
        ...pickup,
        address: `${pickup.name}, Lagos`
      },
      delivery: {
        ...delivery,
        address: `${delivery.name}, Lagos`
      },
      path: route,
      meta: this.calculateRouteMetadata(route)
    };
  }

  // Generate route points between pickup and delivery
  generateRoutePoints(pickup, delivery, type, durationMinutes, complexity) {
    const startTime = Date.now() - durationMinutes * 60 * 1000;
    const endTime = Date.now();
    
    let points = [];
    let currentTime = startTime;
    let currentPos = { ...pickup };
    
    // Add starting point
    points.push({
      lat: currentPos.lat,
      lng: currentPos.lng,
      ts: currentTime,
      speed: 0,
      bearing: 0
    });

    // Generate intermediate waypoints
    const waypoints = this.generateWaypoints(pickup, delivery, complexity);
    
    // Generate route through waypoints
    const allWaypoints = [pickup, ...waypoints, delivery];
    
    for (let i = 1; i < allWaypoints.length; i++) {
      const from = allWaypoints[i - 1];
      const to = allWaypoints[i];
      
      const segmentPoints = this.generateSegment(
        from, to, currentTime, currentTime + (durationMinutes * 60 * 1000) / (allWaypoints.length - 1),
        type, i === 1 ? 'pickup' : (i === allWaypoints.length - 1 ? 'delivery' : 'transit')
      );
      
      // Remove first point to avoid duplicates
      points.push(...segmentPoints.slice(1));
      currentTime = segmentPoints[segmentPoints.length - 1].ts;
    }

    // Add stops for complex routes
    if (complexity === 'high' || type === 'stops') {
      points = this.addStops(points);
    }

    // Add traffic delays for realistic behavior
    if (type === 'normal' || type === 'long') {
      points = this.addTrafficDelays(points);
    }

    return points;
  }

  // Generate waypoints between start and end
  generateWaypoints(start, end, complexity) {
    const waypoints = [];
    const numWaypoints = complexity === 'low' ? 1 : complexity === 'medium' ? 2 : 4;
    
    for (let i = 0; i < numWaypoints; i++) {
      const progress = (i + 1) / (numWaypoints + 1);
      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;
      
      // Add some randomness to make routes more realistic
      const randomOffset = 0.01;
      waypoints.push({
        lat: lat + (Math.random() - 0.5) * randomOffset,
        lng: lng + (Math.random() - 0.5) * randomOffset
      });
    }
    
    return waypoints;
  }

  // Generate segment between two points
  generateSegment(from, to, startTime, endTime, routeType, segmentType) {
    const points = [];
    const distance = this.calculateDistance(from, to);
    const duration = endTime - startTime;
    const numPoints = Math.max(10, Math.floor(distance / 50)); // Point every ~50 meters
    
    // Speed profile based on segment type and route type
    const speedProfile = this.getSpeedProfile(routeType, segmentType, duration);
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints;
      const time = startTime + duration * progress;
      
      // Linear interpolation with some curve variation
      const lat = from.lat + (to.lat - from.lat) * progress;
      const lng = from.lng + (to.lng - from.lng) * progress;
      
      // Add realistic road following variation
      const roadVariation = this.addRoadVariation(progress, distance);
      
      // Calculate bearing
      const bearing = this.calculateBearing(from, to);
      
      // Get speed for this point
      const speed = this.getSpeedAtProgress(speedProfile, progress);
      
      points.push({
        lat: lat + roadVariation.lat,
        lng: lng + roadVariation.lng,
        ts: Math.round(time),
        speed: Math.round(speed * 10) / 10,
        bearing: Math.round(bearing + (Math.random() - 0.5) * 20) // Small bearing variation
      });
    }
    
    return points;
  }

  // Get speed profile for different route types
  getSpeedProfile(routeType, segmentType, duration) {
    const baseSpeed = {
      pickup: 2,    // Slow when picking up
      transit: 8,   // Normal transit speed
      delivery: 3   // Slow when delivering
    }[segmentType] || 6;
    
    const speedMultiplier = {
      express: 1.4,
      normal: 1.0,
      long: 0.8,
      stops: 0.6
    }[routeType] || 1.0;
    
    return {
      start: segmentType === 'pickup' ? 0 : baseSpeed * speedMultiplier * 0.5,
      cruise: baseSpeed * speedMultiplier,
      end: segmentType === 'delivery' ? 0 : baseSpeed * speedMultiplier * 0.7,
      variation: 0.3 // Speed variation factor
    };
  }

  // Get speed at specific progress through segment
  getSpeedAtProgress(profile, progress) {
    let baseSpeed;
    
    if (progress < 0.2) {
      // Acceleration phase
      baseSpeed = profile.start + (profile.cruise - profile.start) * (progress / 0.2);
    } else if (progress > 0.8) {
      // Deceleration phase
      const decelProgress = (progress - 0.8) / 0.2;
      baseSpeed = profile.cruise + (profile.end - profile.cruise) * decelProgress;
    } else {
      // Cruise phase
      baseSpeed = profile.cruise;
    }
    
    // Add random variation
    const variation = (Math.random() - 0.5) * 2 * profile.variation * baseSpeed;
    return Math.max(0, baseSpeed + variation);
  }

  // Add realistic road variation
  addRoadVariation(progress, distance) {
    // Less variation for short distances
    const variationFactor = Math.min(distance / 1000, 1) * 0.0005;
    
    return {
      lat: (Math.random() - 0.5) * variationFactor,
      lng: (Math.random() - 0.5) * variationFactor
    };
  }

  // Add stops to the route
  addStops(points) {
    const modifiedPoints = [...points];
    const numStops = Math.floor(Math.random() * 3) + 1; // 1-3 stops
    
    for (let stop = 0; stop < numStops; stop++) {
      // Random position in the middle part of route
      const stopIndex = Math.floor(points.length * 0.3 + Math.random() * points.length * 0.4);
      const stopDuration = (20 + Math.random() * 180) * 1000; // 20 seconds to 3 minutes
      
      // Insert stop points
      for (let i = 0; i < 10; i++) { // 10 stationary points
        modifiedPoints.splice(stopIndex + i, 0, {
          ...points[stopIndex],
          ts: points[stopIndex].ts + (i * stopDuration / 10),
          speed: Math.random() * 0.5, // Almost stationary
          bearing: points[stopIndex].bearing + (Math.random() - 0.5) * 10
        });
      }
    }
    
    return modifiedPoints;
  }

  // Add traffic delays
  addTrafficDelays(points) {
    const modifiedPoints = [];
    
    for (let i = 0; i < points.length; i++) {
      modifiedPoints.push(points[i]);
      
      // Random traffic delays
      if (Math.random() < 0.1 && points[i].speed > 2) { // 10% chance of delay
        const delayDuration = (5 + Math.random() * 30) * 1000; // 5-35 seconds
        const slowSpeed = points[i].speed * (0.2 + Math.random() * 0.3); // 20-50% of normal speed
        
        // Add slow-moving points
        for (let j = 1; j <= 5; j++) {
          modifiedPoints.push({
            ...points[i],
            ts: points[i].ts + (delayDuration * j / 5),
            speed: slowSpeed + Math.random() * 1,
            bearing: points[i].bearing + (Math.random() - 0.5) * 5
          });
        }
      }
    }
    
    return modifiedPoints;
  }

  // Calculate route metadata
  calculateRouteMetadata(points) {
    if (points.length === 0) return null;
    
    let totalDistance = 0;
    let totalSpeed = 0;
    let maxSpeed = 0;
    let speedCount = 0;
    
    for (let i = 1; i < points.length; i++) {
      const distance = this.calculateDistance(points[i - 1], points[i]);
      totalDistance += distance;
      
      if (points[i].speed !== undefined) {
        totalSpeed += points[i].speed;
        maxSpeed = Math.max(maxSpeed, points[i].speed);
        speedCount++;
      }
    }
    
    return {
      distanceMeters: Math.round(totalDistance),
      avgSpeed: speedCount > 0 ? Math.round((totalSpeed / speedCount) * 10) / 10 : 0,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      totalPoints: points.length,
      duration: points[points.length - 1].ts - points[0].ts
    };
  }

  // Helper functions
  randomLocation(locations) {
    return locations[Math.floor(Math.random() * locations.length)];
  }

  calculateDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  calculateBearing(point1, point2) {
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  // Predefined route templates
  generateQuickRoute() {
    return this.generateRoute({ type: 'express', duration: 12, complexity: 'low' });
  }

  generateNormalRoute() {
    return this.generateRoute({ type: 'normal', duration: 25, complexity: 'medium' });
  }

  generateLongRoute() {
    return this.generateRoute({ type: 'long', duration: 45, complexity: 'high' });
  }

  generateRouteWithStops() {
    return this.generateRoute({ type: 'stops', duration: 35, complexity: 'high' });
  }

  // Generate multiple routes for testing
  generateTestSuite() {
    return {
      quick: this.generateQuickRoute(),
      normal: this.generateNormalRoute(),
      long: this.generateLongRoute(),
      withStops: this.generateRouteWithStops(),
      edgeCases: this.generateEdgeCases()
    };
  }

  // Generate edge cases for testing
  generateEdgeCases() {
    return {
      singlePoint: {
        orderId: this.generateOrderId(),
        path: [{
          lat: 6.5244,
          lng: 3.3792,
          ts: Date.now() - 1000,
          speed: 0,
          bearing: 0
        }],
        meta: { totalPoints: 1, distanceMeters: 0, avgSpeed: 0, maxSpeed: 0 }
      },
      
      identicalTimestamps: {
        orderId: this.generateOrderId(),
        path: Array(5).fill().map(() => ({
          lat: 6.5244 + Math.random() * 0.01,
          lng: 3.3792 + Math.random() * 0.01,
          ts: Date.now(),
          speed: Math.random() * 10,
          bearing: Math.random() * 360
        })),
        meta: { totalPoints: 5, distanceMeters: 100, avgSpeed: 5, maxSpeed: 10 }
      },
      
      largeGaps: (() => {
        const baseTime = Date.now() - 3600000; // 1 hour ago
        return {
          orderId: this.generateOrderId(),
          path: [
            { lat: 6.5244, lng: 3.3792, ts: baseTime, speed: 5, bearing: 45 },
            { lat: 6.5250, lng: 3.3800, ts: baseTime + 1800000, speed: 8, bearing: 50 }, // 30 min gap
            { lat: 6.5260, lng: 3.3810, ts: baseTime + 3600000, speed: 0, bearing: 55 }  // 30 min gap
          ],
          meta: { totalPoints: 3, distanceMeters: 2000, avgSpeed: 4.3, maxSpeed: 8 }
        };
      })()
    };
  }
}

// Export utility functions
export const createMockDeliveryRoute = (type = 'normal') => {
  const generator = new DeliveryRouteGenerator();
  
  switch (type) {
    case 'quick':
      return generator.generateQuickRoute();
    case 'long':
      return generator.generateLongRoute();
    case 'stops':
      return generator.generateRouteWithStops();
    default:
      return generator.generateNormalRoute();
  }
};

export const generateTestRoutes = () => {
  const generator = new DeliveryRouteGenerator();
  return generator.generateTestSuite();
};

// Main function for generating mock routes
export const generateMockRoute = (type = 'normal', customOrderId = null) => {
  const generator = new DeliveryRouteGenerator();
  
  if (customOrderId) {
    generator.orderId = customOrderId;
  }
  
  switch (type.toLowerCase()) {
    case 'express':
      return generator.generateExpressRoute();
    case 'normal':
      return generator.generateNormalRoute();
    case 'long':
      return generator.generateLongRoute();
    case 'stops':
      return generator.generateRouteWithStops();
    default:
      return generator.generateNormalRoute();
  }
};

// Default export
export default DeliveryRouteGenerator;