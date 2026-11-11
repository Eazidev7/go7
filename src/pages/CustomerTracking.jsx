import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import realtimeTrackingService from '../services/realtimeTracking';
import { soundService } from '../services/soundService.js';

const CustomerTracking = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId') || 'demo-order-123';
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const riderMarkerRef = useRef(null);
    const pickupMarkerRef = useRef(null);
    const dropoffMarkerRef = useRef(null);
    const routeRef = useRef(null);
    const animationRef = useRef(null);

    // Enhanced state management
    const [orderData, setOrderData] = useState({
        id: orderId,
        customerName: 'John Doe',
        pickupAddress: 'Kuto Market, Abeokuta',
        dropoffAddress: 'FUNAAB, Abeokuta',
        pickupCoords: [7.1500, 3.3450],
        dropoffCoords: [7.2200, 3.4400],
        orderStatus: 'assigned',
        estimatedFare: 1850,
        createdAt: new Date()
    });
    const [riderLocation, setRiderLocation] = useState([7.1600, 3.3500]); // Start near pickup
    const [orderStatus, setOrderStatus] = useState('assigned');
    const [eta, setEta] = useState('12 mins');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [distance, setDistance] = useState('2.5 km');
    const [lastLocationUpdate, setLastLocationUpdate] = useState(new Date());
    const [riderInfo, setRiderInfo] = useState({
        name: 'Adebayo Rider',
        phone: '+234-813-456-7890',
        rating: 4.8,
        photo: '/rider-avatar.png',
        vehicle: 'Honda CB125F',
        plateNumber: 'ABJ-123-KF'
    });

    // Sound notification system — the shared service owns the file path, the
    // browser autoplay unlock and the mute preference. (This previously pointed
    // at /notification.mp3 at the domain root, which does not exist.)
    const playNotificationSound = () => {
        soundService.play('notification');
    };

    // Enhanced status messages
    const getStatusInfo = (status) => {
        const statusMap = {
            'assigned': {
                text: 'Rider Assigned',
                subtext: 'Your rider is on the way to pickup location',
                color: 'bg-yellow-500',
                icon: '👨‍🏍️'
            },
            'pickup': {
                text: 'At Pickup Location',
                subtext: 'Rider has arrived to collect your package',
                color: 'bg-blue-500',
                icon: '📦'
            },
            'enroute': {
                text: 'Package In Transit',
                subtext: 'Your package is on the way to destination',
                color: 'bg-green-500',
                icon: '🚛'
            },
            'delivered': {
                text: 'Delivered Successfully',
                subtext: 'Your package has been delivered!',
                color: 'bg-green-600',
                icon: '✅'
            }
        };
        return statusMap[status] || statusMap['assigned'];
    };

    // Initialize map with enhanced styling
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Create map instance centered on Abeokuta
        mapInstanceRef.current = L.map(mapRef.current).setView([7.160427, 3.347663], 13);

        // Add Go7 branded tile layer
        L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=nRGZ9lGblbV9lFK2KclL', {
            attribution: '© MapTiler © Go7 Delivery',
            maxZoom: 18,
        }).addTo(mapInstanceRef.current);

        // Custom map styles for Go7 branding
        const style = document.createElement('style');
        style.textContent = `
            .leaflet-container {
                font-family: 'Inter', sans-serif;
                border-radius: 16px;
                box-shadow: 0 10px 25px rgba(227, 6, 19, 0.1);
            }
            .leaflet-popup-content-wrapper {
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            }
            .leaflet-popup-content {
                margin: 16px 20px;
                font-family: 'Inter', sans-serif;
            }
        `;
        document.head.appendChild(style);

        // Add pickup and dropoff markers
        addRouteMarkers();

        // Fit map to show route
        if (orderData.pickupCoords && orderData.dropoffCoords) {
            const bounds = L.latLngBounds([
                orderData.pickupCoords,
                orderData.dropoffCoords
            ]);
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }

        setLoading(false);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Add pickup and dropoff markers
    const addRouteMarkers = () => {
        if (!mapInstanceRef.current) return;

        // Pickup marker
        const pickupIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg">📦</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        pickupMarkerRef.current = L.marker(orderData.pickupCoords, { icon: pickupIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`<strong>📦 Pickup Location</strong><br/>${orderData.pickupAddress}`, {
                className: 'go7-popup'
            });

        // Dropoff marker  
        const dropoffIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg">🎯</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        dropoffMarkerRef.current = L.marker(orderData.dropoffCoords, { icon: dropoffIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`<strong>🎯 Delivery Location</strong><br/>${orderData.dropoffAddress}`, {
                className: 'go7-popup'
            });
    };

    // Smooth scooter animation
    const animateRiderMarker = (fromLatLng, toLatLng) => {
        if (!mapInstanceRef.current || !riderMarkerRef.current) return;

        const start = Date.now();
        const duration = 2000; // 2 seconds for smooth animation

        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth movement
            const easeInOut = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const easedProgress = easeInOut(progress);

            const lat = fromLatLng.lat + (toLatLng.lat - fromLatLng.lat) * easedProgress;
            const lng = fromLatLng.lng + (toLatLng.lng - fromLatLng.lng) * easedProgress;

            riderMarkerRef.current.setLatLng([lat, lng]);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(animate);
        // Update rider marker position with smooth animation
        const updateRiderMarker = (newLocation) => {
            if (!mapInstanceRef.current) return;

            const currentLatLng = riderMarkerRef.current?.getLatLng();
            const newLatLng = { lat: newLocation[0], lng: newLocation[1] };

            // Create or update rider marker
            if (!riderMarkerRef.current) {
                const riderIcon = L.divIcon({
                    className: 'rider-marker',
                    html: `
                    <div class="relative">
                        <div class="bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white">
                            🛵
                        </div>
                        <div class="absolute -top-2 -right-2 bg-green-400 rounded-full w-4 h-4 border-2 border-white pulse-animation"></div>
                    </div>
                `,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });

                riderMarkerRef.current = L.marker(newLatLng, { icon: riderIcon })
                    .addTo(mapInstanceRef.current)
                    .bindPopup(`
                    <div class="text-center">
                        <strong>🛵 ${riderInfo.name}</strong><br/>
                        <span class="text-sm text-gray-600">${riderInfo.vehicle}</span><br/>
                        <span class="text-xs text-gray-500">Last updated: ${new Date().toLocaleTimeString()}</span>
                    </div>
                `, { className: 'go7-popup' });
            } else if (currentLatLng) {
                // Animate smooth movement
                animateRiderMarker(currentLatLng, newLatLng);
            } else {
                riderMarkerRef.current.setLatLng(newLatLng);
            }
        };

        // Calculate ETA based on distance
        const calculateETA = (riderLoc) => {
            if (!riderLoc || !orderData.dropoffCoords) return;

            const distance = calculateDistance(riderLoc, orderData.dropoffCoords);
            const avgSpeed = 25; // km/h average speed for scooter in city
            const etaMinutes = Math.round((distance / avgSpeed) * 60);

            setEta(etaMinutes > 60 ? `${Math.round(etaMinutes / 60)}h ${etaMinutes % 60}m` : `${etaMinutes} mins`);
            setDistance(`${distance.toFixed(1)} km`);
        };

        // Haversine distance calculation
        const calculateDistance = (coord1, coord2) => {
            const R = 6371; // Earth's radius in km
            const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
            const dLng = (coord2[1] - coord1[1]) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        // Demo mode - simulate rider movement for testing
        useEffect(() => {
            if (orderId === 'demo-order-123') {
                const interval = setInterval(() => {
                    setRiderLocation(prev => {
                        if (!prev) return [7.1600, 3.3500];

                        // Simulate movement towards destination
                        const newLat = prev[0] + (Math.random() - 0.5) * 0.001;
                        const newLng = prev[1] + (Math.random() - 0.5) * 0.001;
                        const newLocation = [newLat, newLng];

                        updateRiderMarker(newLocation);
                        calculateETA(newLocation);
                        setLastLocationUpdate(new Date());

                        return newLocation;
                    });
                }, 3000); // Update every 3 seconds in demo mode

                return () => clearInterval(interval);
            }
        }, [orderId]);

        // Enhanced real-time order tracking
        useEffect(() => {
            if (!orderId) return;

            let orderUnsubscribe, riderUnsubscribe;

            // Listen to order status changes
            const orderDocRef = doc(db, 'bookings', orderId);
            orderUnsubscribe = onSnapshot(orderDocRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    setOrderData(prev => ({ ...prev, ...data }));

                    // Check for status changes
                    if (data.orderStatus !== orderStatus) {
                        const statusInfo = getStatusInfo(data.orderStatus);

                        // Show notification
                        Swal.fire({
                            title: statusInfo.text,
                            text: statusInfo.subtext,
                            icon: 'success',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 4000,
                            background: '#fff',
                            color: '#374151',
                            iconColor: '#10b981'
                        });

                        playNotificationSound();
                        setOrderStatus(data.orderStatus);
                    }
                }
            }, (error) => {
                console.error('Order tracking error:', error);
                setError('Failed to track order');
            });

            // Listen to rider location updates
            if (orderData.riderId) {
                const riderLocationRef = doc(db, 'riders', orderData.riderId, 'location', 'current');
                riderUnsubscribe = onSnapshot(riderLocationRef, (doc) => {
                    if (doc.exists()) {
                        const locationData = doc.data();
                        const newLocation = [locationData.latitude, locationData.longitude];

                        setRiderLocation(newLocation);
                        setLastLocationUpdate(new Date(locationData.timestamp?.toDate()));
                        updateRiderMarker(newLocation);

                        // Calculate new ETA
                        calculateETA(newLocation);
                    }
                });
            }

            return () => {
                if (orderUnsubscribe) orderUnsubscribe();
                if (riderUnsubscribe) riderUnsubscribe();
            };
        }, [orderId, orderData.riderId, orderStatus]);

    // Cleanup map on unmount
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Listen to order updates
    useEffect(() => {
        if (!orderId) return;

        const orderRef = doc(db, 'bookings', orderId);
        const unsubscribeOrder = onSnapshot(orderRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setOrderData(data);
                setOrderStatus(data.orderStatus || 'pending');

                // Initialize map with pickup/dropoff if not already done
                if (mapInstanceRef.current && data.pickupCoords && data.dropoffCoords) {
                    initializeRoute(data);
                }
            } else {
                setError('Order not found');
            }
            setLoading(false);
        }, (error) => {
            console.error('Error listening to order:', error);
            setError('Failed to load order data');
            setLoading(false);
        });

        return () => unsubscribeOrder();
    }, [orderId]);

    // Listen to rider location updates
    useEffect(() => {
        if (!orderData?.riderId) return;

        const riderRef = doc(db, 'riders', orderData.riderId, 'location', 'current');
        const unsubscribeRider = onSnapshot(riderRef, (doc) => {
            if (doc.exists()) {
                const location = doc.data();
                setRiderLocation(location);
                updateRiderMarker(location);
                calculateETA(location);
            }
        });

        return () => unsubscribeRider();
    }, [orderData?.riderId]);

    // Initialize route on map
    const initializeRoute = (data) => {
        if (!mapInstanceRef.current) return;

        const { pickupCoords, dropoffCoords } = data;

        // Add pickup marker
        const pickupIcon = L.divIcon({
            className: 'go7-pickup-marker',
            html: '<div style="background: #E30613; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 8px rgba(227, 6, 19, 0.3);">P</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const dropoffIcon = L.divIcon({
            className: 'go7-dropoff-marker',
            html: '<div style="background: #10B981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">D</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        L.marker([pickupCoords.lat, pickupCoords.lng], { icon: pickupIcon }).addTo(mapInstanceRef.current);
        L.marker([dropoffCoords.lat, dropoffCoords.lng], { icon: dropoffIcon }).addTo(mapInstanceRef.current);

        // Draw route line
        const routeCoords = [[pickupCoords.lat, pickupCoords.lng], [dropoffCoords.lat, dropoffCoords.lng]];
        routeRef.current = L.polyline(routeCoords, {
            color: '#E30613',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 5'
        }).addTo(mapInstanceRef.current);

        // Fit map to show route
        const bounds = L.latLngBounds(routeCoords);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    };

    // Update rider marker position - DUPLICATE COMMENTED OUT
    /* const updateRiderMarker = (location) => {
        if (!mapInstanceRef.current || !location) return;

        // Remove existing rider marker
        if (riderMarkerRef.current) {
            mapInstanceRef.current.removeLayer(riderMarkerRef.current);
        }

        // Create animated rider marker
        const riderIcon = L.divIcon({
            className: 'go7-rider-marker',
            html: '<div style="background: linear-gradient(135deg, #E30613, #FF4757); color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 4px 15px rgba(227, 6, 19, 0.4);">🏍️</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        riderMarkerRef.current = L.marker([location.lat, location.lng], {
            icon: riderIcon,
            zIndexOffset: 1000
        }).addTo(mapInstanceRef.current);

        // Smooth animation to rider location
        if (location.lat && location.lng) {
            mapInstanceRef.current.panTo([location.lat, location.lng], {
                animate: true,
                duration: 1.5
            });
        }
    }; */

    // Calculate ETA based on rider location - DUPLICATE COMMENTED OUT
    /* const calculateETA = (riderLocation) => {
        if (!orderData || !riderLocation) return;

        const targetCoords = orderStatus === 'assigned' || orderStatus === 'pickup'
            ? orderData.pickupCoords
            : orderData.dropoffCoords;

        if (!targetCoords) return;

        // Calculate distance (rough estimate)
        const distance = calculateDistance(
            riderLocation.lat, riderLocation.lng,
            targetCoords.lat, targetCoords.lng
        );

        // Estimate ETA (assuming 25 km/h average speed)
        const timeInHours = distance / 25;
        const timeInMinutes = Math.round(timeInHours * 60);

        setEta(Math.max(1, timeInMinutes)); // Minimum 1 minute
    }; */

    // Calculate distance between two points - DUPLICATE COMMENTED OUT
    /* const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }; */

    // Status change notifications
    useEffect(() => {
        if (!orderStatus) return;

        const statusMessages = {
            assigned: {
                icon: 'info',
                title: '🏍️ Rider Assigned!',
                text: 'Your Go7 rider is on the way to pickup location.'
            },
            pickup: {
                icon: 'success',
                title: '📦 Item Picked Up!',
                text: 'Your rider has collected the item and is heading to destination.'
            },
            enroute: {
                icon: 'info',
                title: '🚚 En Route!',
                text: 'Your delivery is on the way to the destination.'
            },
            delivered: {
                icon: 'success',
                title: '✅ Delivered!',
                text: 'Your item has been successfully delivered. Thank you for using Go7!'
            }
        };

        const message = statusMessages[orderStatus];
        if (message) {
            Swal.fire({
                ...message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                background: '#fff',
                color: '#333'
            });

            // Play notification sound (shared service)
            soundService.play('status-update');
        }
    }, [orderStatus]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-red-800 font-medium">Loading your delivery...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-xl p-8 max-w-md mx-4 text-center">
                    <div className="text-red-600 text-5xl mb-4">❌</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-500',
            assigned: 'bg-blue-500',
            pickup: 'bg-orange-500',
            enroute: 'bg-purple-500',
            delivered: 'bg-green-500'
        };
        return colors[status] || 'bg-gray-500';
    };

    const getStatusText = (status) => {
        const texts = {
            pending: 'Finding Rider',
            assigned: 'Rider Assigned',
            pickup: 'Pickup Complete',
            enroute: 'En Route',
            delivered: 'Delivered'
        };
        return texts[status] || 'Unknown';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => navigate('/')}
                                className="text-white hover:text-red-100 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                <span className="text-red-600 font-bold text-xl">G7</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Track Delivery</h1>
                                <p className="text-red-100 text-sm">Order #{orderId?.slice(-8)}</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(orderStatus)}`}>
                            {getStatusText(orderStatus)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Map Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4">
                                <h2 className="text-lg font-bold text-blue-800 flex items-center space-x-2">
                                    <span>🗺️</span>
                                    <span>Live Tracking</span>
                                </h2>
                                <p className="text-blue-600 text-sm mt-1">Real-time delivery progress</p>
                            </div>
                            <div
                                ref={mapRef}
                                className="h-96 lg:h-[500px] bg-gray-100"
                            />
                        </div>
                    </div>

                    {/* Info Panel */}
                    <div className="space-y-6">
                        {/* Rider Info */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Go7 Rider</h3>
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                    🏍️
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{riderInfo.name}</p>
                                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                                        <span>⭐</span>
                                        <span>{riderInfo.rating}</span>
                                        <span>•</span>
                                        <span>Pro Rider</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{riderInfo.phone}</p>
                                </div>
                            </div>

                            {eta && (
                                <div className="mt-4 bg-red-50 rounded-lg p-3 text-center">
                                    <p className="text-sm text-red-600 font-medium">Estimated Arrival</p>
                                    <p className="text-xl font-bold text-red-800">{eta} min</p>
                                </div>
                            )}
                        </div>

                        {/* Order Progress */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Delivery Progress</h3>
                            <div className="space-y-4">
                                {[
                                    { key: 'pending', label: 'Order Confirmed', icon: '✅' },
                                    { key: 'assigned', label: 'Rider Assigned', icon: '🏍️' },
                                    { key: 'pickup', label: 'Item Picked Up', icon: '📦' },
                                    { key: 'enroute', label: 'En Route', icon: '🚚' },
                                    { key: 'delivered', label: 'Delivered', icon: '🎉' }
                                ].map((step, index) => {
                                    const isCompleted = ['pending', 'assigned', 'pickup', 'enroute', 'delivered'].indexOf(orderStatus) >= index;
                                    const isCurrent = ['pending', 'assigned', 'pickup', 'enroute', 'delivered'].indexOf(orderStatus) === index;

                                    return (
                                        <div key={step.key} className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${isCompleted ? 'bg-green-500 text-white' :
                                                isCurrent ? 'bg-red-500 text-white animate-pulse' :
                                                    'bg-gray-200 text-gray-500'
                                                }`}>
                                                {isCompleted ? '✓' : index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-medium ${isCompleted ? 'text-green-600' : isCurrent ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {step.icon} {step.label}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Order Details */}
                        {orderData && (
                            <div className="bg-white rounded-2xl shadow-xl p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Order Details</h3>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-gray-600">From</p>
                                        <p className="font-medium">{orderData.pickupAddress}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">To</p>
                                        <p className="font-medium">{orderData.dropoffAddress}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Total</p>
                                        <p className="font-bold text-red-600">₦{orderData.total?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerTracking;