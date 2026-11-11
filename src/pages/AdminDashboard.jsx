import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import { soundService } from '../services/soundService.js';
import trackingService from '../services/TrackingDataService';
import notificationService from '../services/NotificationService';
import realtimeTrackingService from '../services/realtimeTracking';
import FirebaseStatusIndicator from '../components/FirebaseStatusIndicator';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const riderMarkersRef = useRef({});

    // State management
    const [activeOrders, setActiveOrders] = useState([]);
    const [activeRiders, setActiveRiders] = useState([]);
    const [deliveryStats, setDeliveryStats] = useState({
        total: 0,
        delivered: 0,
        pending: 0,
        inProgress: 0,
        totalRevenue: 0
    });
    const [previousOrdersCount, setPreviousOrdersCount] = useState(0);
    // New-order alert tone is played via the shared sound service below — it owns
    // the file path, the browser autoplay unlock and the mute preference. (This
    // previously constructed an Audio against /assets/sounds/ — a path that does
    // not exist, so it always failed silently.)
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedRider, setSelectedRider] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [mapInitialized, setMapInitialized] = useState(false);

    // Initialize dashboard
    useEffect(() => {
        initializeDashboard();
        initializeMap();
        
        // Request notification permissions
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }

        // Set up auto-refresh every 30 seconds
        const interval = setInterval(() => {
            refreshData();
        }, 30000);
        setRefreshInterval(interval);

        return () => {
            if (interval) clearInterval(interval);
            trackingService.stopAllListeners();
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Initialize map
    const initializeMap = () => {
        if (!mapRef.current || mapInstanceRef.current) return;

        try {
            // Create map instance centered on Abeokuta
            mapInstanceRef.current = L.map(mapRef.current).setView([7.160427, 3.347663], 13);

            // Add tile layer
            L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=nRGZ9lGblbV9lFK2KclL', {
                attribution: '© MapTiler © Go7 Admin',
                maxZoom: 18,
            }).addTo(mapInstanceRef.current);

            // Custom styles for markers
            const style = document.createElement('style');
            style.textContent = `
                .leaflet-container {
                    font-family: 'Inter', sans-serif;
                    border-radius: 12px;
                }
                .rider-marker-online {
                    background: linear-gradient(135deg, #10b981, #34d399);
                    animation: pulse 2s ease-in-out infinite;
                }
                .rider-marker-busy {
                    background: linear-gradient(135deg, #f59e0b, #fbbf24);
                    animation: pulse 2s ease-in-out infinite;
                }
                .rider-marker-offline {
                    background: linear-gradient(135deg, #6b7280, #9ca3af);
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);

            setMapInitialized(true);
            console.log('🗺️ Map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    };

    // Update rider markers on map
    useEffect(() => {
        if (!mapInstanceRef.current || !mapInitialized) return;

        updateRiderMarkers();
    }, [activeRiders, mapInitialized]);

    const updateRiderMarkers = () => {
        if (!mapInstanceRef.current) return;

        // Clear existing markers
        Object.values(riderMarkersRef.current).forEach(marker => {
            mapInstanceRef.current.removeLayer(marker);
        });
        riderMarkersRef.current = {};

        // Add rider markers
        activeRiders.forEach(rider => {
            if (rider.location && rider.location.latitude && rider.location.longitude) {
                const statusClass = `rider-marker-${rider.status || 'offline'}`;
                const statusEmoji = rider.status === 'online' ? '🟢' : rider.status === 'busy' ? '🔶' : '🔴';

                const riderIcon = L.divIcon({
                    className: `${statusClass} border-2 border-white rounded-full shadow-lg`,
                    html: `
                        <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg relative">
                            🛵
                            <div class="absolute -top-1 -right-1 text-xs">${statusEmoji}</div>
                        </div>
                    `,
                    iconSize: [48, 48],
                    iconAnchor: [24, 24]
                });

                const marker = L.marker([rider.location.latitude, rider.location.longitude], {
                    icon: riderIcon
                })
                    .addTo(mapInstanceRef.current)
                    .bindPopup(`
                    <div class="text-center p-2">
                        <strong>🛵 ${rider.name || 'Unknown Rider'}</strong><br/>
                        <span class="text-sm text-gray-600">${rider.vehicle || 'Vehicle'} (${rider.plateNumber || 'N/A'})</span><br/>
                        <span class="text-xs text-gray-500">Status: ${(rider.status || 'offline').toUpperCase()}</span><br/>
                        <span class="text-xs text-gray-500">Rating: ⭐ ${rider.rating || '4.8'}</span><br/>
                        <button onclick="window.selectRider('${rider.id}')" class="mt-2 bg-red-600 text-white px-2 py-1 rounded text-xs">
                            View Details
                        </button>
                    </div>
                `, {
                        className: 'go7-popup',
                        closeButton: true
                    });

                riderMarkersRef.current[rider.id] = marker;
            }
        });

        // Make selectRider function globally available
        window.selectRider = (riderId) => {
            const rider = activeRiders.find(r => r.id === riderId);
            if (rider) {
                setSelectedRider(rider);
            }
        };
    };

    const initializeDashboard = async () => {
        try {
            setIsLoading(true);

            // Initialize tracking service
            trackingService.initialize();

            // Set up real-time listeners
            setupRealTimeListeners();

            // Connect to real-time Firebase if available
            if (realtimeTrackingService.isFirebaseOnline()) {
                console.log('🔥 Admin Dashboard: Connecting to real-time Firebase...');

                // Subscribe to real-time rider locations
                const unsubscribeRiders = realtimeTrackingService.subscribeToActiveRiders((riders) => {
                    console.log('📡 Real-time riders update:', riders.length);
                    setActiveRiders(riders);
                    setDeliveryStats(prev => ({
                        ...prev,
                        totalRiders: riders.length,
                        onlineRiders: riders.filter(r => r.status === 'online').length
                    }));
                });

                // Store cleanup function for later use
                window.adminDashboardCleanup = unsubscribeRiders;
            } else {
                console.log('🔄 Admin Dashboard: Using demo data - Firebase not available');
            }

            // Load initial data
            await loadDeliveryStats();

            setIsLoading(false);
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            notificationService.showErrorNotification(
                'Dashboard Error',
                'Failed to initialize dashboard. Please refresh the page.'
            );
            setIsLoading(false);
        }
    };

    const setupRealTimeListeners = () => {
        // Listen to all active orders
        trackingService.listenToAllActiveOrders(
            (orders) => {
                // Check for new orders
                const pendingOrders = orders.filter(order => order.status === 'pending');
                
                if (previousOrdersCount > 0 && pendingOrders.length > previousOrdersCount) {
                    // New orders detected
                    const newOrdersCount = pendingOrders.length - previousOrdersCount;
                    
                    // Play notification sound
                    try {
                        soundService.play('notification');
                    } catch (err) {
                        console.log('Sound play error:', err);
                    }
                    
                    // Show SweetAlert notification
                    Swal.fire({
                        title: `${newOrdersCount} New ${newOrdersCount === 1 ? 'Order' : 'Orders'} Received!`,
                        text: 'You have new pending orders waiting for processing.',
                        icon: 'success',
                        confirmButtonText: 'View Orders',
                        showCancelButton: true,
                        cancelButtonText: 'Dismiss',
                        background: '#f8f9fa',
                        iconColor: '#4caf50',
                        customClass: {
                            confirmButton: 'btn btn-success',
                            cancelButton: 'btn btn-secondary'
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // Scroll to orders section or filter to show only pending
                            const ordersSection = document.getElementById('orders-section');
                            if (ordersSection) ordersSection.scrollIntoView({ behavior: 'smooth' });
                            
                            // Highlight new orders
                            const newOrderElements = document.querySelectorAll('.new-order');
                            newOrderElements.forEach(el => {
                                el.classList.add('highlight-animation');
                                setTimeout(() => {
                                    el.classList.remove('highlight-animation');
                                }, 3000);
                            });
                        }
                    });
                    
                    // Show browser notification if user granted permission
                    if (Notification.permission === 'granted') {
                        const notification = new Notification('New Order Alert', {
                            body: `${newOrdersCount} new ${newOrdersCount === 1 ? 'order has' : 'orders have'} been received.`,
                            icon: '/logo192.png'
                        });
                        
                        notification.onclick = () => {
                            window.focus();
                            notification.close();
                        };
                    }
                }
                
                // Update orders state and previous count
                setActiveOrders(orders);
                setPreviousOrdersCount(pendingOrders.length);
            },
            (error) => {
                console.error('Error listening to orders:', error);
                notificationService.showErrorNotification(
                    'Connection Error',
                    'Lost connection to orders. Trying to reconnect...'
                );
            }
        );

        // Listen to all active riders
        trackingService.listenToAllActiveRiders(
            (riders) => {
                setActiveRiders(riders);
            },
            (error) => {
                console.error('Error listening to riders:', error);
            }
        );
    };

    const loadDeliveryStats = async () => {
        try {
            const stats = await trackingService.getDeliveryStats(7); // Last 7 days
            setDeliveryStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const refreshData = async () => {
        await loadDeliveryStats();
        console.log('📊 Dashboard data refreshed');
    };

    const assignRiderToOrder = async (orderId, riderId) => {
        try {
            notificationService.showLoadingNotification('Assigning Rider', 'Please wait...');

            await trackingService.updateOrderStatus(orderId, 'assigned', {
                riderId: riderId,
                assignedAt: new Date()
            });

            await trackingService.updateRiderStatus(riderId, 'busy', {
                currentOrderId: orderId
            });

            notificationService.closeLoadingNotification();
            notificationService.showSuccessNotification(
                'Rider Assigned',
                'Order has been assigned to the rider successfully.'
            );

            setSelectedOrder(null);
            setSelectedRider(null);
        } catch (error) {
            console.error('Error assigning rider:', error);
            notificationService.closeLoadingNotification();
            notificationService.showErrorNotification(
                'Assignment Failed',
                'Failed to assign rider to order. Please try again.'
            );
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            notificationService.showLoadingNotification('Updating Status', 'Please wait...');

            await trackingService.updateOrderStatus(orderId, newStatus);

            notificationService.closeLoadingNotification();
            notificationService.showSuccessNotification(
                'Status Updated',
                `Order status updated to ${newStatus}`
            );
        } catch (error) {
            console.error('Error updating status:', error);
            notificationService.closeLoadingNotification();
            notificationService.showErrorNotification(
                'Update Failed',
                'Failed to update order status. Please try again.'
            );
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-500',
            assigned: 'bg-blue-500',
            pickup: 'bg-orange-500',
            enroute: 'bg-purple-500',
            delivered: 'bg-green-500',
            cancelled: 'bg-red-500'
        };
        return colors[status] || 'bg-gray-500';
    };

    const getRiderStatusColor = (status) => {
        const colors = {
            online: 'bg-green-500',
            busy: 'bg-orange-500',
            offline: 'bg-gray-500'
        };
        return colors[status] || 'bg-gray-500';
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(amount || 0);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-red-600 font-semibold">Loading Admin Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                                <span className="text-red-600 font-bold text-2xl">G7</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                                <p className="text-red-100 text-sm">Real-time delivery monitoring and management</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <FirebaseStatusIndicator className="text-white" />
                            <button
                                onClick={refreshData}
                                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Refresh</span>
                            </button>
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
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                                <p className="text-3xl font-bold text-gray-900">{deliveryStats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">📦</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Delivered</p>
                                <p className="text-3xl font-bold text-green-600">{deliveryStats.delivered}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">In Progress</p>
                                <p className="text-3xl font-bold text-orange-600">{deliveryStats.inProgress}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">🚚</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-3xl font-bold text-yellow-600">{deliveryStats.pending}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">⏳</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Revenue</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(deliveryStats.totalRevenue)}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">💰</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map and Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                    {/* Live Map Section */}
                    <div className="xl:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4">
                                <h2 className="text-lg font-bold text-blue-800 flex items-center space-x-2">
                                    <span>🗺️</span>
                                    <span>Live Rider Locations</span>
                                </h2>
                                <p className="text-blue-600 text-sm mt-1">Real-time GPS tracking of all active riders</p>
                            </div>
                            <div className="h-96 relative">
                                <div ref={mapRef} className="w-full h-full"></div>
                                {!mapInitialized && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                            <p className="text-gray-600 text-sm">Loading map...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Riders Summary */}
                    <div className="bg-white rounded-2xl shadow-xl">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-4">
                            <h2 className="text-lg font-bold text-green-800 flex items-center space-x-2">
                                <span>🛵</span>
                                <span>Active Riders ({activeRiders.length})</span>
                            </h2>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            {activeRiders.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-2">🛵</div>
                                    <p className="text-gray-600">No active riders</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeRiders.map((rider) => (
                                        <div
                                            key={rider.id}
                                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedRider?.id === rider.id
                                                    ? 'border-red-500 bg-red-50'
                                                    : 'border-gray-200 hover:border-red-300'
                                                }`}
                                            onClick={() => setSelectedRider(rider)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-3 h-3 rounded-full ${getRiderStatusColor(rider.status || 'offline')}`}></div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{rider.name || 'Unknown Rider'}</p>
                                                        <p className="text-xs text-gray-500">{rider.vehicle || 'Vehicle'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">⭐ {rider.rating || '4.8'}</p>
                                                    <p className="text-xs font-medium text-gray-700">{(rider.status || 'offline').toUpperCase()}</p>
                                                </div>
                                            </div>
                                            {rider.currentOrderId && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <p className="text-xs text-blue-600">📦 Order #{rider.currentOrderId.slice(-8)}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Active Orders */}
                    <div id="orders-section" className="bg-white rounded-2xl shadow-xl">
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 p-6">
                            <h2 className="text-xl font-bold text-red-800 flex items-center space-x-2">
                                <span>📋</span>
                                <span>Active Orders ({activeOrders.length})</span>
                                {activeOrders.filter(order => order.status === 'pending' || order.orderStatus === 'pending').length > 0 && (
                                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                                        {activeOrders.filter(order => order.status === 'pending' || order.orderStatus === 'pending').length} Pending
                                    </span>
                                )}
                            </h2>
                        </div>
                        <div className="p-6 max-h-96 overflow-y-auto">
                            {activeOrders.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-2">📦</div>
                                    <p className="text-gray-600">No active orders</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeOrders.map((order) => (
                                        <div 
                                            key={order.id} 
                                            className={`border ${(order.status === 'pending' || order.orderStatus === 'pending') 
                                                ? 'border-red-300 bg-red-50 new-order' 
                                                : 'border-gray-200'
                                            } rounded-lg p-4 hover:shadow-md transition-shadow ${(order.status === 'pending' || order.orderStatus === 'pending') ? 'shadow-md' : ''}`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="font-semibold text-gray-900">#{order.id.slice(-8)}</p>
                                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(order.orderStatus)}`}>
                                                        {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-red-600">{formatCurrency(order.total)}</p>
                                                    <p className="text-xs text-gray-500">{formatTime(order.createdAt)}</p>
                                                </div>
                                            </div>

                                            <div className="text-sm space-y-1 mb-3">
                                                <p><span className="font-medium">📍 From:</span> {order.pickupAddress}</p>
                                                <p><span className="font-medium">🏁 To:</span> {order.dropoffAddress}</p>
                                                {order.riderId && <p><span className="font-medium">👤 Rider:</span> {order.riderId}</p>}
                                            </div>

                                            <div className="flex gap-2">
                                                {order.orderStatus === 'pending' && (
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="flex-1 bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors hover:bg-blue-700"
                                                    >
                                                        Assign Rider
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                                    className="bg-red-600 text-white text-xs py-1 px-2 rounded transition-colors hover:bg-red-700"
                                                >
                                                    Cancel
                                                </button>

                                                <button
                                                    onClick={() => navigate(`/track?orderId=${order.id}`)}
                                                    className="bg-gray-600 text-white text-xs py-1 px-2 rounded transition-colors hover:bg-gray-700"
                                                >
                                                    Track
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Riders */}
                    <div className="bg-white rounded-2xl shadow-xl">
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 p-6">
                            <h2 className="text-xl font-bold text-red-800 flex items-center space-x-2">
                                <span>🏍️</span>
                                <span>Active Riders ({activeRiders.length})</span>
                            </h2>
                        </div>
                        <div className="p-6 max-h-96 overflow-y-auto">
                            {activeRiders.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-2">🏍️</div>
                                    <p className="text-gray-600">No active riders</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeRiders.map((rider) => (
                                        <div key={rider.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                        🏍️
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{rider.name || rider.id}</p>
                                                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getRiderStatusColor(rider.status)}`}>
                                                            {rider.status?.charAt(0).toUpperCase() + rider.status?.slice(1)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs text-gray-500">
                                                    <p>⭐ {rider.rating || '4.8'}</p>
                                                    <p>{formatTime(rider.lastUpdated)}</p>
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-600 mb-3">
                                                {rider.currentOrderId ? (
                                                    <p><span className="font-medium">📦 Current Order:</span> #{rider.currentOrderId.slice(-8)}</p>
                                                ) : (
                                                    <p className="text-green-600 font-medium">✅ Available for orders</p>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                {rider.status === 'online' && !rider.currentOrderId && selectedOrder && (
                                                    <button
                                                        onClick={() => assignRiderToOrder(selectedOrder.id, rider.id)}
                                                        className="flex-1 bg-green-600 text-white text-xs py-1 px-2 rounded transition-colors hover:bg-green-700"
                                                    >
                                                        Assign Order
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => window.open(`tel:${rider.phone}`, '_self')}
                                                    className="bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors hover:bg-blue-700"
                                                >
                                                    Call
                                                </button>

                                                {rider.currentOrderId && (
                                                    <button
                                                        onClick={() => navigate(`/track?orderId=${rider.currentOrderId}`)}
                                                        className="bg-purple-600 text-white text-xs py-1 px-2 rounded transition-colors hover:bg-purple-700"
                                                    >
                                                        Track
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Assignment Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Rider to Order</h3>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Order: #{selectedOrder.id.slice(-8)}</p>
                            <p className="text-sm text-gray-600 mb-2">Amount: {formatCurrency(selectedOrder.total)}</p>
                            <p className="text-sm text-gray-600">Available Riders: {activeRiders.filter(r => r.status === 'online' && !r.currentOrderId).length}</p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const availableRider = activeRiders.find(r => r.status === 'online' && !r.currentOrderId);
                                    if (availableRider) {
                                        assignRiderToOrder(selectedOrder.id, availableRider.id);
                                    } else {
                                        notificationService.showErrorNotification('No Available Riders', 'No riders are currently available for assignment.');
                                    }
                                }}
                                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg transition-colors hover:bg-red-700"
                            >
                                Auto Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rider Details Modal */}
            {selectedRider && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Rider Details</h3>
                            <button
                                onClick={() => setSelectedRider(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl">
                                    🛵
                                </div>
                                <h4 className="font-bold text-gray-900">{selectedRider.name || 'Unknown Rider'}</h4>
                                <p className="text-gray-600">{selectedRider.phone || 'No phone number'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-gray-600">Vehicle</p>
                                    <p className="font-medium">{selectedRider.vehicle || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-gray-600">Plate Number</p>
                                    <p className="font-medium">{selectedRider.plateNumber || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-gray-600">Rating</p>
                                    <p className="font-medium">⭐ {selectedRider.rating || '4.8'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-gray-600">Status</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getRiderStatusColor(selectedRider.status || 'offline')}`}>
                                        {(selectedRider.status || 'offline').toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {selectedRider.location && (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-blue-600 font-medium mb-2">📍 Current Location</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-600">Lat:</span>
                                            <span className="ml-1 font-mono">{selectedRider.location.latitude.toFixed(6)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Lng:</span>
                                            <span className="ml-1 font-mono">{selectedRider.location.longitude.toFixed(6)}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Last updated: {selectedRider.lastUpdated ? formatTime(selectedRider.lastUpdated) : 'N/A'}
                                    </p>
                                </div>
                            )}

                            {selectedRider.currentOrderId && (
                                <div className="bg-yellow-50 p-3 rounded-lg">
                                    <p className="text-yellow-600 font-medium mb-1">📦 Current Order</p>
                                    <p className="text-sm">Order #{selectedRider.currentOrderId.slice(-8)}</p>
                                    <button
                                        onClick={() => {
                                            navigate(`/track?orderId=${selectedRider.currentOrderId}`);
                                            setSelectedRider(null);
                                        }}
                                        className="mt-2 text-xs bg-yellow-600 text-white px-2 py-1 rounded"
                                    >
                                        Track Order
                                    </button>
                                </div>
                            )}

                            <div className="flex space-x-3">
                                {selectedRider.phone && (
                                    <button
                                        onClick={() => window.open(`tel:${selectedRider.phone}`)}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                                    >
                                        📞 Call Rider
                                    </button>
                                )}
                                {selectedRider.location && (
                                    <button
                                        onClick={() => {
                                            if (mapInstanceRef.current) {
                                                mapInstanceRef.current.setView([
                                                    selectedRider.location.latitude,
                                                    selectedRider.location.longitude
                                                ], 16);
                                                setSelectedRider(null);
                                            }
                                        }}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                                    >
                                        🗺️ Locate
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    // Add CSS for animations and notifications
    const animationStyles = `
        @keyframes highlightPulse {
            0% { background-color: #FEF2F2; }
            50% { background-color: #FEE2E2; }
            100% { background-color: #FEF2F2; }
        }
        
        @keyframes borderPulse {
            0% { border-color: #F87171; }
            50% { border-color: #EF4444; }
            100% { border-color: #F87171; }
        }
        
        .highlight-animation {
            animation: highlightPulse 1.5s ease-in-out infinite, borderPulse 1.5s ease-in-out infinite;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
        }
        
        /* Additional styles for notifications */
        .notification-counter {
            position: absolute;
            top: -8px;
            right: -8px;
            background-color: #EF4444;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }
    `;

    return (
        <div className="min-h-screen bg-gray-100">
            <style>{animationStyles}</style>
            {/* Existing JSX */}
        </div>
    );
};

export default AdminDashboard;