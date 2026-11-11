import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { subscribeToRiderLocation, startRiderTracking } from '../services/riderTracking';

// Import rotation plugin for Leaflet
// TODO: Re-enable when leaflet-rotatedmarker build issues are resolved
// import 'leaflet-rotatedmarker';

/**
 * Calculate bearing between two points for marker rotation
 * @param {number} lat1 - Start latitude
 * @param {number} lng1 - Start longitude  
 * @param {number} lat2 - End latitude
 * @param {number} lng2 - End longitude
 * @returns {number} Bearing in degrees
 */
const calculateBearing = (lat1, lng1, lat2, lng2) => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return bearing;
};

/**
 * Smooth marker animation using requestAnimationFrame
 * @param {L.Marker} marker - Leaflet marker to animate
 * @param {Array} startPos - [lat, lng] starting position
 * @param {Array} endPos - [lat, lng] ending position
 * @param {number} duration - Animation duration in milliseconds
 */
const animateMarker = (marker, startPos, endPos, duration = 2000) => {
    const start = performance.now();
    const startLat = startPos[0];
    const startLng = startPos[1];
    const deltaLat = endPos[0] - startLat;
    const deltaLng = endPos[1] - startLng;

    // Calculate bearing for rotation
    const bearing = calculateBearing(startLat, startLng, endPos[0], endPos[1]);

    const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth movement
        const easeProgress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const newLat = startLat + deltaLat * easeProgress;
        const newLng = startLng + deltaLng * easeProgress;

        // Update marker position
        marker.setLatLng([newLat, newLng]);

        // Rotate marker toward movement direction
        if (marker.setRotationAngle) {
            marker.setRotationAngle(bearing);
        }

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
};

/**
 * Create custom Go7 scooter marker
 * @param {Array} latlng - [lat, lng] position
 * @returns {L.Marker} Leaflet marker with custom styling
 */
const createScooterMarker = (latlng) => {
    // Create custom icon with Go7 styling
    const scooterIcon = L.divIcon({
        className: 'go7-scooter-marker',
        html: `
      <div style="
        width: 40px;
        height: 40px;
        background: white;
        border: 3px solid #E30613;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(227, 6, 19, 0.3);
        position: relative;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#E30613">
          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
        </svg>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #E30613;
        "></div>
      </div>
    `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    // Create marker with rotation options if plugin is available
    const markerOptions = { icon: scooterIcon };

    // Only add rotation options if the plugin is loaded
    if (L.Marker.prototype.setRotationAngle) {
        markerOptions.rotationAngle = 0;
        markerOptions.rotationOrigin = 'center center';
    }

    const marker = L.marker(latlng, markerOptions);

    return marker;
};

/**
 * Snap point to nearest location on route polyline
 * @param {Object} point - {lat, lng} point to snap
 * @param {Array} routePoints - Array of [lat, lng] route points
 * @returns {Object} Snapped point and progress info
 */
const snapToRoute = (point, routePoints) => {
    if (!routePoints || routePoints.length < 2) {
        return { lat: point.lat, lng: point.lng, progress: 0 };
    }

    let minDistance = Infinity;
    let snappedPoint = null;
    let segmentIndex = 0;
    let progress = 0;

    for (let i = 0; i < routePoints.length - 1; i++) {
        const segmentStart = routePoints[i];
        const segmentEnd = routePoints[i + 1];

        const snapped = snapToSegment(point, segmentStart, segmentEnd);
        const distance = getDistance(point, snapped);

        if (distance < minDistance) {
            minDistance = distance;
            snappedPoint = snapped;
            segmentIndex = i;
        }
    }

    // Calculate progress along route
    let distanceToSnapped = 0;
    for (let i = 0; i < segmentIndex; i++) {
        distanceToSnapped += getDistance(routePoints[i], routePoints[i + 1]);
    }
    distanceToSnapped += getDistance(routePoints[segmentIndex], snappedPoint);

    let totalDistance = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
        totalDistance += getDistance(routePoints[i], routePoints[i + 1]);
    }

    progress = totalDistance > 0 ? distanceToSnapped / totalDistance : 0;

    return {
        ...snappedPoint,
        progress,
        segmentIndex,
        distanceToRoute: minDistance * 1000 // Convert to meters
    };
};

/**
 * Snap point to line segment
 */
const snapToSegment = (point, segmentStart, segmentEnd) => {
    const A = segmentStart;
    const B = segmentEnd;
    const P = point;

    const AB = { lat: B.lat - A.lat, lng: B.lng - A.lng };
    const AP = { lat: P.lat - A.lat, lng: P.lng - A.lng };

    const ab2 = AB.lat * AB.lat + AB.lng * AB.lng;
    const ap_ab = AP.lat * AB.lat + AP.lng * AB.lng;

    const t = Math.max(0, Math.min(1, ap_ab / ab2));

    return {
        lat: A.lat + AB.lat * t,
        lng: A.lng + AB.lng * t
    };
};

/**
 * Calculate distance between two points in kilometers
 */
const getDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * ETA Countdown Component
 */
const ETACountdown = ({ eta, className = "" }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!eta) return;

        const updateCountdown = () => {
            const now = new Date().getTime();
            const etaTime = new Date(eta).getTime();
            const distance = etaTime - now;

            if (distance < 0) {
                setTimeLeft('Arriving now!');
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes}m ${seconds}s`);
        };

        const timer = setInterval(updateCountdown, 1000);
        updateCountdown();

        return () => clearInterval(timer);
    }, [eta]);

    return (
        <div className={`eta-countdown ${className}`}>
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-200">
                <div className="text-sm font-semibold text-gray-600 mb-1">
                    🚚 Estimated Arrival
                </div>
                <div className="text-2xl font-bold text-go7-red">
                    {timeLeft || 'Calculating...'}
                </div>
            </div>
        </div>
    );
};

/**
 * Status Card Component
 */
const StatusCard = ({ status, progress, className = "" }) => {
    const getStatusInfo = (status, progress) => {
        if (progress >= 0.95) return { text: 'Delivered! 🎉', color: 'text-green-600', bg: 'bg-green-50' };
        if (progress >= 0.7) return { text: 'Arriving Soon 📍', color: 'text-orange-600', bg: 'bg-orange-50' };
        if (progress >= 0.3) return { text: 'Picked Up ✅', color: 'text-blue-600', bg: 'bg-blue-50' };
        if (progress > 0) return { text: 'En Route to Pickup 🛵', color: 'text-purple-600', bg: 'bg-purple-50' };
        return { text: 'Rider Assigned 👋', color: 'text-gray-600', bg: 'bg-gray-50' };
    };

    const statusInfo = getStatusInfo(status, progress);

    return (
        <div className={`status-card ${className}`}>
            <div className={`${statusInfo.bg} rounded-lg shadow-lg p-4 border border-gray-200`}>
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full bg-current ${statusInfo.color}`} />
                    <div className={`font-semibold ${statusInfo.color}`}>
                        {statusInfo.text}
                    </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                    Progress: {Math.round(progress * 100)}%
                </div>
            </div>
        </div>
    );
};

export {
    animateMarker,
    createScooterMarker,
    snapToRoute,
    calculateBearing,
    ETACountdown,
    StatusCard
};