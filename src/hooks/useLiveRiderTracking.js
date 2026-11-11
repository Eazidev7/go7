import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../services/firebase';
import {
    showRiderPickedUp,
    showRiderStarted,
    showRiderEnroute,
    showRiderArriving,
    showOrderDelivered,
    showReconnecting
} from '../utils/notifications';
import Swal from 'sweetalert2';

/**
 * Custom hook for live rider tracking with Firebase + Leaflet integration
 * 
 * Features:
 * - Real-time Firebase listener for rider location
 * - Smooth marker animation with rotation
 * - SweetAlert2 notifications for status changes
 * - ETA and distance calculations
 * - Connection monitoring and fallback
 * 
 * @param {Object} mapInstance - Leaflet map instance
 * @param {Object} riderMarkerRef - React ref to rider marker
 * @param {string} riderId - Unique rider identifier (default: 'demoRider')
 * @param {Object} destination - Destination coordinates {lat, lng}
 * @returns {Object} { riderPosition, riderStatus, eta, distance, isConnected }
 */
export const useLiveRiderTracking = (mapInstance, riderMarkerRef, riderId = 'demoRider', destination = null) => {
    // State management
    const [riderPosition, setRiderPosition] = useState(null);
    const [riderStatus, setRiderStatus] = useState('assigned');
    const [eta, setEta] = useState(null);
    const [distance, setDistance] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

    // Refs for tracking
    const previousPositionRef = useRef(null);
    const previousStatusRef = useRef('assigned');
    const connectionTimeoutRef = useRef(null);
    const animationFrameRef = useRef(null);

    /**
     * Calculate bearing between two points for marker rotation
     */
    const calculateBearing = useCallback((lat1, lng1, lat2, lng2) => {
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;

        const y = Math.sin(dLng) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }, []);

    /**
     * Calculate distance between two points using Haversine formula
     */
    const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }, []);

    /**
     * Smooth marker animation using requestAnimationFrame
     */
    const animateMarker = useCallback((marker, startPos, endPos, duration = 2000) => {
        if (!marker || !startPos || !endPos) return;

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
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [calculateBearing]);

    /**
     * Calculate ETA based on distance and average speed
     */
    const calculateETA = useCallback((distanceKm, speedKmh = 25) => {
        if (!distanceKm) return null;

        const timeHours = distanceKm / speedKmh;
        const timeMinutes = timeHours * 60;
        const arrivalTime = new Date(Date.now() + timeMinutes * 60 * 1000);

        return arrivalTime;
    }, []);

    /**
     * Handle status change notifications
     */
    const handleStatusChange = useCallback((newStatus, oldStatus) => {
        if (newStatus === oldStatus) return;

        console.log(`🔄 Status changed: ${oldStatus} → ${newStatus}`);

        switch (newStatus) {
            case 'picked_up':
                showRiderPickedUp();
                break;
            case 'enroute':
                if (oldStatus === 'assigned') {
                    showRiderStarted();
                } else {
                    showRiderEnroute();
                }
                break;
            case 'arriving':
                showRiderArriving();
                break;
            case 'delivered':
                showOrderDelivered();
                break;
            default:
                break;
        }
    }, []);

    /**
     * Handle reconnection notification
     */
    const showReconnectingToast = useCallback(() => {
        showReconnecting();
    }, []);

    /**
     * Fallback to demo coordinates when Firebase fails
     */
    const startDemoMode = useCallback(() => {
        console.log('🎭 Starting demo mode with simulated coordinates');

        // Abeokuta center coordinates for demo
        const demoStartPosition = { lat: 7.1516, lng: 3.3467 };
        let currentPos = { ...demoStartPosition };

        const demoInterval = setInterval(() => {
            // Simulate small movements
            currentPos.lat += (Math.random() - 0.5) * 0.001;
            currentPos.lng += (Math.random() - 0.5) * 0.001;

            const simulatedData = {
                lat: currentPos.lat,
                lng: currentPos.lng,
                status: Math.random() > 0.8 ? 'enroute' : 'assigned', // Occasional status change
                timestamp: Date.now()
            };

            // Update position
            setRiderPosition(simulatedData);
            setLastUpdateTime(Date.now());
            setIsConnected(true);

        }, 5000); // Update every 5 seconds

        return () => clearInterval(demoInterval);
    }, []);

    /**
     * Main Firebase listener effect
     */
    useEffect(() => {
        if (!database) {
            console.log('🚨 Firebase not available, starting demo mode');
            return startDemoMode();
        }

        console.log(`🔗 Setting up Firebase listener for rider: ${riderId}`);

        const riderRef = ref(database, `riders/${riderId}`);

        const unsubscribe = onValue(riderRef, (snapshot) => {
            try {
                const data = snapshot.val();

                if (data && data.lat && data.lng) {
                    console.log('📍 Received rider update:', data);

                    setRiderPosition(data);
                    setLastUpdateTime(Date.now());
                    setIsConnected(true);

                    // Handle status changes
                    if (data.status !== previousStatusRef.current) {
                        handleStatusChange(data.status, previousStatusRef.current);
                        previousStatusRef.current = data.status;
                        setRiderStatus(data.status);
                    }

                } else {
                    console.log('⚠️ Invalid or empty rider data received');
                }

            } catch (error) {
                console.error('🚨 Error processing rider data:', error);
                setIsConnected(false);
            }
        }, (error) => {
            console.error('🚨 Firebase listener error:', error);
            setIsConnected(false);
            // Start demo mode as fallback
            startDemoMode();
        });

        // Cleanup
        return () => {
            off(riderRef);
            if (unsubscribe) unsubscribe();
        };
    }, [riderId, handleStatusChange, startDemoMode]);

    /**
     * Connection timeout monitoring
     */
    useEffect(() => {
        // Clear existing timeout
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
        }

        // Set new timeout for 15 seconds
        connectionTimeoutRef.current = setTimeout(() => {
            const timeSinceLastUpdate = Date.now() - lastUpdateTime;

            if (timeSinceLastUpdate > 15000) { // 15 seconds
                console.log('⏰ No updates for 15+ seconds, showing reconnection toast');
                setIsConnected(false);
                showReconnectingToast();
            }
        }, 15000);

        return () => {
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
            }
        };
    }, [lastUpdateTime, showReconnectingToast]);

    /**
     * Marker animation and map updates
     */
    useEffect(() => {
        if (!riderPosition || !mapInstance || !riderMarkerRef.current) return;

        const newPosition = [riderPosition.lat, riderPosition.lng];
        const marker = riderMarkerRef.current;

        // Animate marker to new position
        if (previousPositionRef.current) {
            animateMarker(marker, previousPositionRef.current, newPosition);
        } else {
            // First position update
            marker.setLatLng(newPosition);
        }

        // Keep map centered on rider (optional - can be toggled)
        if (mapInstance.getZoom() > 15) {
            mapInstance.panTo(newPosition, { animate: true, duration: 1 });
        }

        previousPositionRef.current = newPosition;

    }, [riderPosition, mapInstance, animateMarker]);

    /**
     * Distance and ETA calculations
     */
    useEffect(() => {
        if (!riderPosition || !destination) return;

        const distanceKm = calculateDistance(
            riderPosition.lat,
            riderPosition.lng,
            destination.lat,
            destination.lng
        );

        setDistance(distanceKm);
        setEta(calculateETA(distanceKm));

    }, [riderPosition, destination, calculateDistance, calculateETA]);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
            }
        };
    }, []);

    // Return hook values
    return {
        riderPosition,      // Current rider coordinates {lat, lng, status, timestamp}
        riderStatus,        // Current status string
        eta,               // Estimated arrival time (Date object)
        distance,          // Distance to destination in kilometers
        isConnected,       // Connection status boolean
        lastUpdateTime     // Timestamp of last update
    };
};

export default useLiveRiderTracking;