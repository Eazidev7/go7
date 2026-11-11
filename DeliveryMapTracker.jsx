import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const DeliveryMapTracker = ({ 
    pickup = [3.3619, 7.1475], 
    dropoff = [3.3700, 7.1530], 
    fee = "₦1450",
    mapStyle = "https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/style.json?key=nRGZ9lGblbV9lFK2KclL"
}) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const riderMarker = useRef(null);
    const animationProgress = useRef(0);
    const animationDirection = useRef(1);
    const animationId = useRef(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Rider En Route');

    // Calculate route coordinates from props
    const route = [
        pickup,
        [(pickup[0] + dropoff[0]) / 2, (pickup[1] + dropoff[1]) / 2], // Midpoint
        dropoff
    ];

    // Create marker element using the same pattern as HTML version
    const createMarkerElement = (iconName, isRider = false) => {
        const img = document.createElement("img");
        img.src = `/public/icons/${iconName}`;
        img.style.width = isRider ? "45px" : "40px";
        img.style.height = isRider ? "45px" : "40px";
        img.style.borderRadius = "50%";
        img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        img.style.cursor = "pointer";
        img.style.transition = "transform 0.2s ease";
        
        // Special styling for rider
        if (isRider) {
            img.style.border = "3px solid #E30613";
            img.style.animation = "pulse 2s infinite";
        }
        
        // Error handling for images
        img.onerror = function() {
            console.warn(`⚠️ Failed to load /public/icons/${iconName}, using fallback`);
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFMzA2MTMiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
        };
        
        // Add hover effect
        img.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });
        
        img.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
        
        return img;
    };

    // Calculate point along the route for animation
    const getPointAlongRoute = (progress) => {
        progress = Math.max(0, Math.min(1, progress));
        
        const totalDistance = route.length - 1;
        const segmentProgress = progress * totalDistance;
        const segmentIndex = Math.floor(segmentProgress);
        const segmentFraction = segmentProgress - segmentIndex;
        
        if (segmentIndex >= route.length - 1) {
            return route[route.length - 1];
        }
        
        const start = route[segmentIndex];
        const end = route[segmentIndex + 1];
        
        const lng = start[0] + (end[0] - start[0]) * segmentFraction;
        const lat = start[1] + (end[1] - start[1]) * segmentFraction;
        
        return [lng, lat];
    };

    // Setup delivery route
    const setupDeliveryRoute = () => {
        console.log('🛣️ Adding delivery route...');
        
        map.current.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': route
                }
            }
        });

        map.current.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#E30613',
                'line-width': 4,
                'line-dasharray': [2, 2]
            }
        });
    };

    // Add markers
    const addMarkers = () => {
        console.log('📍 Adding markers...');
        
        // Add pickup marker - bag.png
        const pickupImg = createMarkerElement('bag.png');
        new maplibregl.Marker({ element: pickupImg })
            .setLngLat(pickup)
            .setPopup(new maplibregl.Popup({ offset: 25 })
                .setHTML('<strong>Pickup Location</strong>'))
            .addTo(map.current);

        // Add drop-off marker - shop.png
        const dropoffImg = createMarkerElement('shop.png');
        new maplibregl.Marker({ element: dropoffImg })
            .setLngLat(dropoff)
            .setPopup(new maplibregl.Popup({ offset: 25 })
                .setHTML('<strong>Drop-off Location</strong>'))
            .addTo(map.current);

        // Add landmark marker - olumo.png
        const landmarkImg = createMarkerElement('olumo.png');
        new maplibregl.Marker({ element: landmarkImg })
            .setLngLat([3.3480, 7.1600])
            .setPopup(new maplibregl.Popup({ offset: 25 })
                .setHTML('<strong>Olumo Rock</strong>'))
            .addTo(map.current);

        // Add rider marker - scooter.png (will be animated)
        const riderImg = createMarkerElement('scooter.png', true);
        riderMarker.current = new maplibregl.Marker({ element: riderImg })
            .setLngLat(pickup)
            .setPopup(new maplibregl.Popup({ offset: 25 })
                .setHTML('<strong>Rider En Route</strong>'))
            .addTo(map.current);
    };

    // Add delivery fee box
    const addDeliveryFeeBox = () => {
        console.log('💰 Adding delivery fee box...');
        
        // Calculate midpoint from pickup and dropoff coordinates
        const midpoint = [
            (pickup[0] + dropoff[0]) / 2,
            (pickup[1] + dropoff[1]) / 2
        ];
        
        // Create custom HTML marker element
        const feeEl = document.createElement('div');
        feeEl.style.background = '#E30613';
        feeEl.style.color = 'white';
        feeEl.style.fontWeight = 'bold';
        feeEl.style.padding = '6px 12px';
        feeEl.style.borderRadius = '12px';
        feeEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        feeEl.style.fontSize = '14px';
        feeEl.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        feeEl.style.textAlign = 'center';
        feeEl.style.whiteSpace = 'nowrap';
        feeEl.style.cursor = 'pointer';
        feeEl.innerHTML = fee; // Use fee from props
        
        // Add hover effect
        feeEl.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        feeEl.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
        
        // Place at calculated midpoint
        new maplibregl.Marker({ element: feeEl })
            .setLngLat(midpoint)
            .addTo(map.current);
    };

    // Start rider animation
    const startRiderAnimation = () => {
        console.log('🏍️ Starting rider animation...');
        
        const animate = () => {
            // Update progress
            animationProgress.current += 0.0001 * animationDirection.current;
            
            // Reverse direction at endpoints
            if (animationProgress.current >= 1) {
                animationProgress.current = 1;
                animationDirection.current = -1;
                setStatus('Heading to Pickup');
            } else if (animationProgress.current <= 0) {
                animationProgress.current = 0;
                animationDirection.current = 1;
                setStatus('Heading to Drop-off');
            }
            
            // Calculate new position
            const newPosition = getPointAlongRoute(animationProgress.current);
            
            // Update rider marker position
            if (riderMarker.current) {
                riderMarker.current.setLngLat(newPosition);
            }
            
            // Continue animation
            animationId.current = requestAnimationFrame(animate);
        };
        
        // Start the animation
        animate();
    };

    // Initialize map
    useEffect(() => {
        if (map.current) return; // Initialize map only once
        
        console.log('🗺️ Initializing MapLibre GL map...');
        console.log('📍 Using delivery props:', { pickup, dropoff, fee });
        console.log('🛤️ Generated route:', route);
        
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: mapStyle,
            center: pickup, // Center on pickup location
            zoom: 13,
            antialias: true
        });

        // Add navigation controls to top-right
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Map load event
        map.current.on('load', () => {
            console.log('✅ Map loaded successfully');
            setLoading(false);
            setupDeliveryRoute();
            addMarkers();
            addDeliveryFeeBox();
            startRiderAnimation();
        });

        // Map error handling
        map.current.on('error', (e) => {
            console.error('❌ Map error:', e);
            setLoading(false);
        });

        // Cleanup function
        return () => {
            if (animationId.current) {
                cancelAnimationFrame(animationId.current);
            }
            if (map.current) {
                map.current.remove();
            }
        };
    }, []);

    // Update map when props change
    useEffect(() => {
        if (!map.current) return;
        
        console.log('🔄 Updating map with new props:', { pickup, dropoff, fee });
        
        // Remove existing sources and layers
        if (map.current.getLayer('route')) {
            map.current.removeLayer('route');
        }
        if (map.current.getSource('route')) {
            map.current.removeSource('route');
        }
        
        // Re-setup everything with new props
        setupDeliveryRoute();
        // Note: For a full implementation, you'd also need to remove and re-add markers
        // This is a simplified version focusing on the route update
        
    }, [pickup, dropoff, fee]);

    return (
        <div style={{ width: '100%', height: '500px', position: 'relative' }}>
            {/* Loading indicator */}
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #f3f3f3',
                        borderTop: '4px solid #E30613',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 10px'
                    }}></div>
                    <div>Loading Go7 Delivery Map...</div>
                </div>
            )}

            {/* Status bar */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'white',
                padding: '10px 15px',
                borderRadius: '25px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 1000,
                fontWeight: 600,
                color: '#E30613'
            }}>
                <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    background: '#4CAF50',
                    borderRadius: '50%',
                    marginRight: '8px',
                    animation: 'blink 1.5s infinite'
                }}></span>
                <span>{status}</span>
            </div>

            {/* Map container */}
            <div 
                ref={mapContainer} 
                style={{ width: '100%', height: '100%' }}
            />

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0.3; }
                }
                @keyframes pulse {
                    0% { box-shadow: 0 2px 8px rgba(227, 6, 19, 0.3); }
                    50% { box-shadow: 0 2px 20px rgba(227, 6, 19, 0.8); }
                    100% { box-shadow: 0 2px 8px rgba(227, 6, 19, 0.3); }
                }
            `}</style>
        </div>
    );
};

export default DeliveryMapTracker;