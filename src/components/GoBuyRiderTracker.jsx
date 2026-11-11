import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Real-time rider tracking component for GoBuy orders
 */
const GoBuyRiderTracker = ({ orderId, assignedRider }) => {
    const [riderLocation, setRiderLocation] = useState(null);
    const [orderStatus, setOrderStatus] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        if (!assignedRider) return;

        // Listen for rider location updates
        let unsubscribeRider = null;

        try {
            // Check both foot and bike fleets for rider location
            const footFleetRef = doc(db, 'foot_fleet', assignedRider);
            const bikeFleetRef = doc(db, 'bike_fleet', assignedRider);

            // Try foot fleet first
            unsubscribeRider = onSnapshot(footFleetRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    updateRiderData(data);
                } else {
                    // Try bike fleet if not found in foot fleet
                    const unsubscribeBike = onSnapshot(bikeFleetRef, (bikeDoc) => {
                        if (bikeDoc.exists()) {
                            const data = bikeDoc.data();
                            updateRiderData(data);
                        }
                    });
                    return unsubscribeBike;
                }
            });
        } catch (error) {
            console.error('Error setting up rider tracking:', error);
        }

        return () => {
            if (unsubscribeRider) unsubscribeRider();
        };
    }, [assignedRider]);

    useEffect(() => {
        if (!orderId) return;

        // Listen for order status updates
        const orderRef = doc(db, 'gobuy_orders', orderId);
        const unsubscribeOrder = onSnapshot(orderRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setOrderStatus(data.orderStatus);
                setLastUpdate(new Date());
            }
        });

        return () => unsubscribeOrder();
    }, [orderId]);

    const updateRiderData = (data) => {
        if (data.location) {
            setRiderLocation(data.location);
        }
        setIsOnline(data.status === 'available' || data.status === 'busy');
        setLastUpdate(new Date());
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'Assigned': 'bg-blue-100 text-blue-800 border-blue-200',
            'Accepted': 'bg-green-100 text-green-800 border-green-200',
            'Shopping': 'bg-purple-100 text-purple-800 border-purple-200',
            'Purchased': 'bg-indigo-100 text-indigo-800 border-indigo-200',
            'InTransit': 'bg-orange-100 text-orange-800 border-orange-200',
            'Delivered': 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const formatTimeAgo = (date) => {
        if (!date) return 'Unknown';
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    if (!assignedRider) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <div className="text-2xl mb-2">⏳</div>
                        <p className="text-sm">Waiting for agent assignment...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Live Tracking</h3>
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-gray-600">
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            {/* Status */}
            {orderStatus && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(orderStatus)}`}>
                        {orderStatus}
                    </span>
                </div>
            )}

            {/* Location Info */}
            {riderLocation && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Agent Location:</span>
                        <button
                            onClick={() => {
                                const url = `https://www.google.com/maps?q=${riderLocation.lat},${riderLocation.lng}`;
                                window.open(url, '_blank');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                            View on Map
                        </button>
                    </div>
                    <div className="text-xs text-gray-500">
                        Lat: {riderLocation.lat?.toFixed(6)}, Lng: {riderLocation.lng?.toFixed(6)}
                    </div>
                </div>
            )}

            {/* Last Update */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>Last updated:</span>
                <span>{formatTimeAgo(lastUpdate)}</span>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2 pt-2">
                <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors">
                    📍 Track Live
                </button>
                <button className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded text-xs font-medium hover:bg-green-100 transition-colors">
                    💬 Message
                </button>
            </div>
        </div>
    );
};

export default GoBuyRiderTracker;