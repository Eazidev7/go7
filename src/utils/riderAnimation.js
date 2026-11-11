// src/utils/riderAnimation.js
/**
 * Rider Animation Utilities for Go7 Map
 * Smooth marker animation using requestAnimationFrame
 */

/**
 * Animate a marker along a polyline path
 * @param {L.Marker} marker - Leaflet marker to animate
 * @param {Array} routeCoords - Array of [lat, lng] coordinates
 * @param {Object} options - Animation options
 * @returns {Object} Animation controller with start, pause, stop methods
 */
export const animateRider = (marker, routeCoords, options = {}) => {
  let {
    duration = 8000, // 8 seconds for full journey
    loop = true, // Loop the animation
    easing = 'easeInOutQuad', // Easing function
    onUpdate = null, // Callback for each frame
    onComplete = null, // Callback when animation completes
    autoStart = true // Start animation immediately
  } = options;

  let startTime = null;
  let animationId = null;
  let isPaused = false;
  let pausedTime = 0;
  let currentSegment = 0;

  // Easing functions
  const easingFunctions = {
    linear: (t) => t,
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => (--t) * t * t + 1,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  };

  const ease = easingFunctions[easing] || easingFunctions.easeInOutQuad;

  // Calculate total distance for speed normalization
  const calculateDistance = (coord1, coord2) => {
    const lat1 = coord1[0] * Math.PI / 180;
    const lat2 = coord2[0] * Math.PI / 180;
    const deltaLat = (coord2[0] - coord1[0]) * Math.PI / 180;
    const deltaLng = (coord2[1] - coord1[1]) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 6371000; // Earth's radius in meters
  };

  // Calculate cumulative distances for each segment
  const segmentDistances = [];
  let totalDistance = 0;
  
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const distance = calculateDistance(routeCoords[i], routeCoords[i + 1]);
    segmentDistances.push(distance);
    totalDistance += distance;
  }

  // Convert distances to cumulative progress (0 to 1)
  const cumulativeProgress = [0];
  let accumulated = 0;
  
  for (const distance of segmentDistances) {
    accumulated += distance / totalDistance;
    cumulativeProgress.push(accumulated);
  }

  // Linear interpolation between two coordinates
  const lerp = (coord1, coord2, t) => {
    return [
      coord1[0] + (coord2[0] - coord1[0]) * t,
      coord1[1] + (coord2[1] - coord1[1]) * t
    ];
  };

  // Calculate position along the route at time t (0 to 1)
  const getPositionAtTime = (t) => {
    if (t <= 0) return routeCoords[0];
    if (t >= 1) return routeCoords[routeCoords.length - 1];

    // Find which segment we're in
    let segmentIndex = 0;
    for (let i = 0; i < cumulativeProgress.length - 1; i++) {
      if (t >= cumulativeProgress[i] && t <= cumulativeProgress[i + 1]) {
        segmentIndex = i;
        break;
      }
    }

    // Calculate local progress within the segment
    const segmentStart = cumulativeProgress[segmentIndex];
    const segmentEnd = cumulativeProgress[segmentIndex + 1];
    const segmentProgress = (t - segmentStart) / (segmentEnd - segmentStart);

    // Interpolate between segment points
    return lerp(routeCoords[segmentIndex], routeCoords[segmentIndex + 1], segmentProgress);
  };

  // Animation frame function
  const animate = (currentTime) => {
    if (!startTime) startTime = currentTime - pausedTime;
    if (isPaused) return;

    const elapsed = currentTime - startTime;
    let progress = elapsed / duration;

    // Handle looping
    if (progress > 1) {
      if (loop) {
        startTime = currentTime;
        progress = 0;
        pausedTime = 0;
      } else {
        progress = 1;
      }
    }

    // Apply easing
    const easedProgress = ease(progress);
    
    // Get position and update marker
    const position = getPositionAtTime(easedProgress);
    marker.setLatLng(position);

    // Call update callback
    if (onUpdate) {
      onUpdate({
        progress: progress,
        easedProgress: easedProgress,
        position: position,
        segment: currentSegment
      });
    }

    // Continue animation or complete
    if (progress < 1 || loop) {
      animationId = requestAnimationFrame(animate);
    } else {
      animationId = null;
      if (onComplete) onComplete();
    }
  };

  // Animation controller methods
  const controller = {
    start: () => {
      if (!animationId && !isPaused) {
        startTime = null;
        pausedTime = 0;
      }
      isPaused = false;
      animationId = requestAnimationFrame(animate);
      return controller;
    },

    pause: () => {
      if (animationId) {
        isPaused = true;
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      return controller;
    },

    stop: () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      isPaused = false;
      startTime = null;
      pausedTime = 0;
      marker.setLatLng(routeCoords[0]);
      return controller;
    },

    setSpeed: (newDuration) => {
      const wasAnimating = !!animationId;
      if (wasAnimating) controller.pause();
      
      // Calculate how much time has elapsed and adjust
      const currentProgress = startTime ? ((Date.now() - startTime) / duration) : 0;
      pausedTime = currentProgress * newDuration;
      
      duration = newDuration;
      if (wasAnimating) controller.start();
      return controller;
    },

    getProgress: () => {
      if (!startTime) return 0;
      return Math.min(1, (Date.now() - startTime) / duration);
    },

    isAnimating: () => !!animationId,
    isPaused: () => isPaused
  };

  // Auto-start if requested
  if (autoStart) {
    controller.start();
  }

  return controller;
};

/**
 * Create a smooth route animation with multiple waypoints
 * @param {L.Marker} marker - Marker to animate
 * @param {Array} waypoints - Array of waypoint objects {lat, lng, duration}
 * @param {Object} options - Animation options
 */
export const animateMultipleWaypoints = (marker, waypoints, options = {}) => {
  let currentWaypointIndex = 0;
  let currentAnimation = null;

  const animateToNextWaypoint = () => {
    if (currentWaypointIndex >= waypoints.length - 1) {
      if (options.onComplete) options.onComplete();
      return;
    }

    const start = waypoints[currentWaypointIndex];
    const end = waypoints[currentWaypointIndex + 1];
    
    // Generate smooth path between waypoints
    const routeCoords = generateSmoothPath(
      [start.lat, start.lng], 
      [end.lat, end.lng], 
      10 // number of intermediate points
    );

    currentAnimation = animateRider(marker, routeCoords, {
      duration: end.duration || 2000,
      loop: false,
      autoStart: true,
      onComplete: () => {
        currentWaypointIndex++;
        setTimeout(animateToNextWaypoint, end.delay || 0);
      },
      ...options
    });
  };

  animateToNextWaypoint();
  
  return {
    stop: () => {
      if (currentAnimation) currentAnimation.stop();
    },
    pause: () => {
      if (currentAnimation) currentAnimation.pause();
    },
    start: () => {
      if (currentAnimation) currentAnimation.start();
    }
  };
};

/**
 * Generate a smooth curved path between two points
 * @param {Array} start - [lat, lng] start coordinate
 * @param {Array} end - [lat, lng] end coordinate  
 * @param {number} segments - Number of segments in the path
 * @returns {Array} Array of [lat, lng] coordinates
 */
export const generateSmoothPath = (start, end, segments = 20) => {
  const path = [start];
  
  // Add slight curve for more natural movement
  const midLat = (start[0] + end[0]) / 2;
  const midLng = (start[1] + end[1]) / 2;
  
  // Add some curvature based on distance
  const latDiff = Math.abs(end[0] - start[0]);
  const lngDiff = Math.abs(end[1] - start[1]);
  const curvature = Math.max(latDiff, lngDiff) * 0.1;
  
  const curvePoint = [
    midLat + (Math.random() - 0.5) * curvature,
    midLng + (Math.random() - 0.5) * curvature
  ];

  // Generate Bézier curve points
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const invT = 1 - t;
    
    // Quadratic Bézier curve
    const lat = invT * invT * start[0] + 2 * invT * t * curvePoint[0] + t * t * end[0];
    const lng = invT * invT * start[1] + 2 * invT * t * curvePoint[1] + t * t * end[1];
    
    path.push([lat, lng]);
  }
  
  path.push(end);
  return path;
};