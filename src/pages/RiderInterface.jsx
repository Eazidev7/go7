import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    setDoc,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import Swal from 'sweetalert2';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const RiderInterface = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const riderId = searchParams.get('riderId') || 'rider123';
    const watchIdRef = useRef(null);
    const locationIntervalRef = useRef(null);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    // Enhanced state management
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [activeOrder, setActiveOrder] = useState(null);
    const [isTrackingLocation, setIsTrackingLocation] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [riderStatus, setRiderStatus] = useState('offline'); // offline, online, busy
    const [locationError, setLocationError] = useState(null);
    const [riderInfo] = useState({
        id: riderId,
        name: 'Adebayo Okonkwo',
        phone: '+234-813-456-7890',
        rating: 4.8,
        vehicle: 'Honda CB125F',
        plateNumber: 'ABJ-123-KF',
        photo: '/rider-avatar.png'
    });

    // Demo order for testing
    const demoOrder = {
        id: 'demo-order-123',
        customerName: 'John Doe',
        customerPhone: '+234-802-123-4567',
        pickupAddress: 'Kuto Market, Abeokuta',
        dropoffAddress: 'FUNAAB, Abeokuta',
        pickupCoords: { lat: 7.1500, lng: 3.3450 },
        dropoffCoords: { lat: 7.2200, lng: 3.4400 },
        orderStatus: 'assigned',
        estimatedFare: 1850,
        items: ['Documents', 'Small Package'],
        notes: 'Handle with care - important documents',
        createdAt: new Date(),
        riderId: riderId
    };

    // Get current location
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date()
                    };
                    resolve(location);
                },
                (error) => {
                    setLocationError(error.message);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    };

    // Start location tracking
    const startLocationTracking = async () => {
        try {
            setLocationError(null);

            // Get initial location
            const location = await getCurrentLocation();
            setCurrentLocation(location);

            // Update location in Firestore
            await updateLocationInFirestore(location);

            // Start continuous tracking
            if (navigator.geolocation) {
                watchIdRef.current = navigator.geolocation.watchPosition(
                    async (position) => {
                        const newLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: new Date()
                        };

                        setCurrentLocation(newLocation);
                        await updateLocationInFirestore(newLocation);
                    },
                    (error) => {
                        console.error('Location tracking error:', error);
                        setLocationError(error.message);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 30000
                    }
                );

                // Also send location every 2 seconds as backup
                locationIntervalRef.current = setInterval(async () => {
                    try {
                        const location = await getCurrentLocation();
                        setCurrentLocation(location);
                        await updateLocationInFirestore(location);
                    } catch (error) {
                        console.error('Interval location update failed:', error);
                    }
                }, 2000);

                setIsTrackingLocation(true);

                Swal.fire({
                    title: 'Location Tracking Started',
                    text: 'Your location is now being shared with customers',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        } catch (error) {
            console.error('Failed to start location tracking:', error);
            Swal.fire({
                title: 'Location Access Denied',
                text: 'Please enable location access to start deliveries',
                icon: 'error'
            });
        }
    };

    // Stop location tracking
    const stopLocationTracking = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        if (locationIntervalRef.current) {
            clearInterval(locationIntervalRef.current);
            locationIntervalRef.current = null;
        }

        setIsTrackingLocation(false);

        Swal.fire({
            title: 'Location Tracking Stopped',
            text: 'Your location is no longer being shared',
            icon: 'info',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    };

    // Update location in Firestore
    const updateLocationInFirestore = async (location) => {
        try {
            const locationRef = doc(db, 'riders', riderId, 'location', 'current');
            await setDoc(locationRef, {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                timestamp: serverTimestamp(),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error('Failed to update location in Firestore:', error);
        }
    };

    // Start trip
    const startTrip = async (order) => {
        try {
            if (!isTrackingLocation) {
                await startLocationTracking();
            }

            // Update order status to 'pickup'
            const orderRef = doc(db, 'bookings', order.id);
            await updateDoc(orderRef, {
                orderStatus: 'pickup',
                statusUpdatedAt: serverTimestamp(),
                riderStartedAt: serverTimestamp()
            });

            setActiveOrder({ ...order, orderStatus: 'pickup' });
            setRiderStatus('busy');

            Swal.fire({
                title: 'Trip Started!',
                text: `Heading to pickup: ${order.pickupAddress}`,
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Failed to start trip:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to start trip. Please try again.',
                icon: 'error'
            });
        }
    };

    // Mark as picked up
    const markPickedUp = async (order) => {
        try {
            const orderRef = doc(db, 'bookings', order.id);
            await updateDoc(orderRef, {
                orderStatus: 'enroute',
                pickedUpAt: serverTimestamp(),
                statusUpdatedAt: serverTimestamp()
            });

            setActiveOrder({ ...order, orderStatus: 'enroute' });

            Swal.fire({
                title: 'Package Picked Up!',
                text: `Now heading to: ${order.dropoffAddress}`,
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Failed to mark as picked up:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to update status. Please try again.',
                icon: 'error'
            });
        }
    };

    // Complete delivery
    const completeDelivery = async (order) => {
        try {
            const result = await Swal.fire({
                title: 'Complete Delivery?',
                text: 'Confirm that the package has been delivered successfully',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#ef4444',
                confirmButtonText: 'Yes, Delivered!',
                cancelButtonText: 'Cancel'
            });

            if (result.isConfirmed) {
                const orderRef = doc(db, 'bookings', order.id);
                await updateDoc(orderRef, {
                    orderStatus: 'delivered',
                    deliveredAt: serverTimestamp(),
                    statusUpdatedAt: serverTimestamp(),
                    completedBy: riderId
                });

                setActiveOrder(null);
                setRiderStatus('online');

                // Remove from assigned orders
                setAssignedOrders(prev => prev.filter(o => o.id !== order.id));

                Swal.fire({
                    title: 'Delivery Completed!',
                    text: 'Great job! Ready for next delivery.',
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Failed to complete delivery:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to complete delivery. Please try again.',
                icon: 'error'
            });
        }
    };
    setAssignedOrders(orders);

    // Set active order (most recent assigned)
    if (orders.length > 0 && !activeOrder) {
        setActiveOrder(orders[0]);
    }
});

        return () => unsubscribe();
    }, [riderId, activeOrder]);

// Start location tracking
const startLocationTracking = () => {
    if (!navigator.geolocation) {
        Swal.fire({
            icon: 'error',
            title: 'GPS Not Available',
            text: 'Your device does not support location services.'
        });
        return;
    }

    setIsTrackingLocation(true);
    setRiderStatus('online');

    // Get initial position
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: new Date(),
                accuracy: position.coords.accuracy,
                speed: position.coords.speed || 0
            };

            setCurrentLocation(location);
            updateLocationInFirestore(location);
        },
        (error) => {
            console.error('Location error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Location Error',
                text: 'Unable to get your current location. Please enable GPS.'
            });
            setIsTrackingLocation(false);
            setRiderStatus('offline');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: new Date(),
                accuracy: position.coords.accuracy,
                speed: position.coords.speed || 0
            };

            setCurrentLocation(location);
            updateLocationInFirestore(location);
        },
        (error) => {
            console.error('Watch position error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000
        }
    );

    // Send location updates every 2 seconds
    locationIntervalRef.current = setInterval(() => {
        if (currentLocation) {
            updateLocationInFirestore(currentLocation);
        }
    }, 2000);

    Swal.fire({
        icon: 'success',
        title: 'Location Tracking Started',
        text: 'You are now online and sharing your location.',
        timer: 2000,
        showConfirmButton: false
    });
};

// Stop location tracking
const stopLocationTracking = () => {
    setIsTrackingLocation(false);
    setRiderStatus('offline');

    if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
    }

    if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
    }

    Swal.fire({
        icon: 'info',
        title: 'Gone Offline',
        text: 'Location tracking stopped. You are now offline.',
        timer: 2000,
        showConfirmButton: false
    });
};

// Update location in Firestore
const updateLocationInFirestore = async (location) => {
    try {
        await setDoc(doc(db, 'riders', riderId, 'location', 'current'), {
            ...location,
            lastUpdated: serverTimestamp(),
            status: riderStatus
        });
    } catch (error) {
        console.error('Error updating location:', error);
    }
};

// Update order status
const updateOrderStatus = async (orderId, newStatus) => {
    try {
        await updateDoc(doc(db, 'bookings', orderId), {
            orderStatus: newStatus,
            updatedAt: serverTimestamp(),
            [`${newStatus}Time`]: serverTimestamp()
        });

        Swal.fire({
            icon: 'success',
            title: 'Status Updated',
            text: `Order marked as ${newStatus}`,
            timer: 1500,
            showConfirmButton: false
        });

        // Auto-progress to next status after certain actions
        if (newStatus === 'pickup') {
            setTimeout(() => {
                updateOrderStatus(orderId, 'enroute');
            }, 1000);
        }

    } catch (error) {
        console.error('Error updating order status:', error);
        Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: 'Failed to update order status. Please try again.'
        });
    }
};

// Handle order completion
const completeDelivery = async (orderId) => {
    const result = await Swal.fire({
        title: 'Complete Delivery?',
        text: 'Mark this delivery as completed?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Yes, Complete',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        await updateOrderStatus(orderId, 'delivered');
        setActiveOrder(null);
        setRiderStatus('online');

        Swal.fire({
            icon: 'success',
            title: '🎉 Delivery Completed!',
            text: 'Great job! You can now accept new orders.',
            confirmButtonColor: '#E30613'
        });
    }
};

// Calculate distance to location
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Cleanup on unmount
useEffect(() => {
    return () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }
        if (locationIntervalRef.current) {
            clearInterval(locationIntervalRef.current);
        }
    };
}, []);

const getStatusColor = (status) => {
    const colors = {
        offline: 'bg-gray-500',
        online: 'bg-green-500',
        busy: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
};

const getOrderStatusColor = (status) => {
    const colors = {
        assigned: 'bg-blue-500',
        pickup: 'bg-orange-500',
        enroute: 'bg-purple-500',
        delivered: 'bg-green-500'
    };
    return colors[status] || 'bg-gray-500';
};

return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <span className="text-red-600 font-bold text-xl">G7</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Rider Dashboard</h1>
                            <p className="text-red-100 text-sm">Welcome, {riderInfo.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(riderStatus)}`}>
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            <span className="text-sm font-medium text-white capitalize">{riderStatus}</span>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="text-white hover:text-red-100 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="lg:col-span-1">
                    <div className="space-y-6">
                        {/* Status Controls */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Status Controls</h2>

                            {!isTrackingLocation ? (
                                <button
                                    onClick={startLocationTracking}
                                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>Go Online</span>
                                </button>
                            ) : (
                                <button
                                    onClick={stopLocationTracking}
                                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                                    </svg>
                                    <span>Go Offline</span>
                                </button>
                            )}

                            {currentLocation && (
                                <div className="mt-4 bg-green-50 rounded-lg p-3">
                                    <p className="text-sm text-green-600 font-medium">📍 Location Active</p>
                                    <p className="text-xs text-green-700">
                                        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                                    </p>
                                    <p className="text-xs text-green-600">
                                        Accuracy: {currentLocation.accuracy?.toFixed(0)}m
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Rider Info */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Rider Info</h2>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                        🏍️
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{riderInfo.name}</p>
                                        <p className="text-sm text-gray-600">⭐ {riderInfo.rating} • Pro Rider</p>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>📱 {riderInfo.phone}</p>
                                    <p>🏍️ {riderInfo.vehicle}</p>
                                    <p>🔢 {riderInfo.plateNumber}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Orders */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 p-6">
                            <h2 className="text-xl font-bold text-red-800 flex items-center space-x-2">
                                <span>📋</span>
                                <span>Active Orders ({assignedOrders.length})</span>
                            </h2>
                            <p className="text-red-600 text-sm mt-1">Manage your delivery assignments</p>
                        </div>

                        <div className="p-6">
                            {assignedOrders.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📦</div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Orders</h3>
                                    <p className="text-gray-600">
                                        {riderStatus === 'offline'
                                            ? 'Go online to receive delivery assignments'
                                            : 'Waiting for new delivery assignments...'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {assignedOrders.map((order) => (
                                        <div key={order.id} className="border-2 border-red-100 rounded-xl p-6 bg-gradient-to-r from-red-50 to-orange-50">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-8)}</h3>
                                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getOrderStatusColor(order.orderStatus)}`}>
                                                        {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-red-600">₦{order.total?.toLocaleString()}</p>
                                                    {currentLocation && order.pickupCoords && (
                                                        <p className="text-xs text-gray-600">
                                                            {calculateDistance(
                                                                currentLocation.lat, currentLocation.lng,
                                                                order.pickupCoords.lat, order.pickupCoords.lng
                                                            ).toFixed(1)}km away
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-white rounded-lg p-3">
                                                    <p className="text-sm text-gray-600 font-medium">📍 Pickup</p>
                                                    <p className="text-sm text-gray-900">{order.pickupAddress}</p>
                                                </div>
                                                <div className="bg-white rounded-lg p-3">
                                                    <p className="text-sm text-gray-600 font-medium">🏁 Dropoff</p>
                                                    <p className="text-sm text-gray-900">{order.dropoffAddress}</p>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-lg p-3 mb-4">
                                                <p className="text-sm text-gray-600 font-medium">📞 Customer</p>
                                                <p className="text-sm text-gray-900">{order.senderPhone || 'N/A'}</p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap gap-3">
                                                {order.orderStatus === 'assigned' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, 'pickup')}
                                                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                                                    >
                                                        📦 Mark Picked Up
                                                    </button>
                                                )}

                                                {order.orderStatus === 'enroute' && (
                                                    <button
                                                        onClick={() => completeDelivery(order.id)}
                                                        className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                                                    >
                                                        ✅ Complete Delivery
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => window.open(`tel:${order.senderPhone}`, '_self')}
                                                    className="bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                                                >
                                                    📞 Call Customer
                                                </button>

                                                <button
                                                    onClick={() => window.open(`https://maps.google.com/maps?q=${order.pickupCoords?.lat},${order.pickupCoords?.lng}`, '_blank')}
                                                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                                                >
                                                    🗺️ Navigate
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
};

export default RiderInterface;