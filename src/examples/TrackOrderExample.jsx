// Example integration for TrackOrder.tsx
// This shows how to use the useLiveRiderTracking hook

import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useLiveRiderTracking from '../hooks/useLiveRiderTracking';
import LiveRiderCard from '../components/LiveRiderCard';

const TrackOrderExample = () => {
    const { orderId } = useParams();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const riderMarkerRef = useRef(null);

    // Sample destination coordinates (replace with actual order destination)
    const [destination] = useState({ lat: 7.1315, lng: 3.3622 });

    // Use the live rider tracking hook
    const {
        riderPosition,
        riderStatus,
        eta,
        distance,
        isConnected
    } = useLiveRiderTracking(
        mapInstanceRef.current,  // Leaflet map instance
        riderMarkerRef,          // Rider marker ref
        'demoRider',             // Rider ID (or use orderId)
        destination              // Destination coordinates
    );

    /**
     * Initialize Leaflet map
     */
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        console.log('🗺️ Initializing Leaflet map');

        // Create map centered on Abeokuta
        const map = L.map(mapRef.current).setView([7.1475, 3.3619], 13);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add destination marker
        if (destination) {
            L.marker([destination.lat, destination.lng], {
                icon: L.icon({
                    iconUrl: '/destination-icon.png',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32]
                })
            })
                .addTo(map)
                .bindPopup('📍 Delivery Destination');
        }

        // Create rider marker (initially hidden)
        const riderIcon = L.divIcon({
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
                    transition: transform 0.3s ease;
                ">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#E30613">
                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                    </svg>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        riderMarkerRef.current = L.marker([7.1516, 3.3467], {
            icon: riderIcon,
            rotationAngle: 0,
            rotationOrigin: 'center center'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Cleanup on unmount
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [destination]);

    /**
     * Update map view when rider position changes
     */
    useEffect(() => {
        if (!mapInstanceRef.current || !riderPosition || !destination) return;

        // Fit map to show both rider and destination
        const bounds = L.latLngBounds([
            [riderPosition.lat, riderPosition.lng],
            [destination.lat, destination.lng]
        ]);

        mapInstanceRef.current.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 16
        });
    }, [riderPosition, destination]);

    return (
        <div className="relative w-full h-screen">
            {/* Map Container */}
            <div
                ref={mapRef}
                className="w-full h-full"
                style={{ zIndex: 1 }}
            />

            {/* Floating Rider Status Card */}
            <LiveRiderCard
                riderStatus={riderStatus}
                eta={eta}
                distance={distance}
                isConnected={isConnected}
                className="absolute bottom-4 left-4 z-10"
            />

            {/* Debug Info (remove in production) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded text-xs z-10">
                    <div>🔗 Connected: {isConnected ? '✅' : '❌'}</div>
                    <div>📍 Position: {riderPosition ?
                        `${riderPosition.lat.toFixed(4)}, ${riderPosition.lng.toFixed(4)}` :
                        'Unknown'
                    }</div>
                    <div>📊 Status: {riderStatus}</div>
                    <div>⏱️ ETA: {eta ? eta.toLocaleTimeString() : 'Calculating...'}</div>
                    <div>📏 Distance: {distance.toFixed(2)} km</div>
                </div>
            )}
        </div>
    );
};

export default TrackOrderExample;