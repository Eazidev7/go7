import React, { useState, useEffect } from 'react';
import { useLiveLocation } from '../../rider/useLiveLocation';
import { sounds } from '../../lib/audio';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';

const GoBuyAssignmentSheet = ({
    assignment,
    order,
    onAccept,
    onDecline,
    onTimeout,
    isVisible
}) => {
    const [countdown, setCountdown] = useState(30); // 30 seconds for GoBuy
    const [isAccepting, setIsAccepting] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);

    // Initialize live location tracking when assignment is visible
    const {
        isTracking,
        accuracy,
        error: locationError,
        startTracking,
        stopTracking
    } = useLiveLocation({
        onLocationUpdate: (position) => {
            console.log('📍 GoBuy rider location updated:', position);
        },
        onError: (error) => {
            console.error('📍 GoBuy location error:', error);
        },
        highAccuracy: true,
        trackingInterval: 10000 // Update every 10 seconds
    });

    // Start location tracking when assignment becomes visible
    useEffect(() => {
        if (isVisible && assignment) {
            console.log('📍 Starting location tracking for GoBuy assignment');
            startTracking();
        } else if (!isVisible) {
            console.log('📍 Stopping GoBuy location tracking');
            stopTracking();
        }

        return () => stopTracking();
    }, [isVisible, assignment, startTracking, stopTracking]);

    // Countdown timer - 30 seconds for GoBuy
    useEffect(() => {
        if (!isVisible || !assignment) return;

        // Play notification sound when assignment appears
        sounds.notification?.play?.();

        // Reset countdown to 30 seconds
        setCountdown(30);

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isVisible, assignment]);

    const handleTimeout = () => {
        console.log('⏰ GoBuy assignment timed out');
        onTimeout();
    };

    const handleAccept = async () => {
        if (isAccepting) return;

        setIsAccepting(true);
        try {
            console.log('✅ Accepting GoBuy assignment:', assignment.orderId);

            // Make sure location tracking is active
            if (!isTracking) {
                await startTracking();
            }

            // Call Firebase Function to handle acceptance
            const handleRiderResponse = httpsCallable(functions, 'handleRiderResponse');
            const result = await handleRiderResponse({
                orderId: assignment.orderId,
                riderId: assignment.riderId,
                action: 'accept'
            });

            if (result.data.success) {
                console.log('✅ GoBuy assignment accepted successfully');
                onAccept(assignment);
            } else {
                throw new Error(result.data.error);
            }

        } catch (error) {
            console.error('❌ Error accepting GoBuy assignment:', error);
            alert('Failed to accept assignment. Please try again.');
        } finally {
            setIsAccepting(false);
        }
    };

    const handleDecline = async () => {
        if (isDeclining) return;

        setIsDeclining(true);
        try {
            console.log('❌ Declining GoBuy assignment:', assignment.orderId);

            // Call Firebase Function to handle decline
            const handleRiderResponse = httpsCallable(functions, 'handleRiderResponse');
            const result = await handleRiderResponse({
                orderId: assignment.orderId,
                riderId: assignment.riderId,
                action: 'decline'
            });

            if (result.data.success) {
                console.log('✅ GoBuy assignment declined successfully');
                // Stop location tracking
                stopTracking();
                onDecline(assignment);
            } else {
                throw new Error(result.data.error);
            }

        } catch (error) {
            console.error('❌ Error declining GoBuy assignment:', error);
            alert('Failed to decline assignment. Please try again.');
        } finally {
            setIsDeclining(false);
        }
    };

    const openNavigation = () => {
        if (!order?.customerLat || !order?.customerLng) return;

        const destination = encodeURIComponent(
            order.customerAddress || `${order.customerLat},${order.customerLng}`
        );

        // Try Google Maps first, fallback to browser maps
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

        try {
            window.open(googleMapsUrl, '_blank');
        } catch (error) {
            console.error('Failed to open GoBuy navigation:', error);
        }
    };

    if (!isVisible || !assignment || !order) {
        return null;
    }

    const isExpired = countdown <= 0;

    return (
        <div className="fixed inset-0 z-50 flex items-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-50" />

            {/* Bottom Sheet */}
            <div className="relative w-full bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out translate-y-0">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Content */}
                <div className="px-6 pb-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl">🛍️</span>
                            <h2 className="text-xl font-bold text-gray-900">
                                New GoBuy Request
                            </h2>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${isExpired
                                ? 'bg-red-100 text-red-800'
                                : countdown <= 5
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-blue-100 text-blue-800'
                            }`}>
                            {isExpired ? 'Expired' : `${countdown}s`}
                        </div>
                    </div>

                    {/* Item Details */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4 border border-purple-100">
                        <div className="flex items-start space-x-3">
                            <div className="w-3 h-3 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">Item to Purchase</p>
                                <p className="text-purple-700 font-semibold text-lg leading-relaxed">
                                    {order.itemName || 'Item not specified'}
                                </p>
                                {order.itemDescription && (
                                    <p className="text-gray-600 text-sm mt-1">
                                        {order.itemDescription}
                                    </p>
                                )}
                                {order.budget && (
                                    <p className="text-green-600 font-medium text-sm mt-2">
                                        Budget: ₦{order.budget.toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Store/Pickup Details */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <div className="flex items-start space-x-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">
                                    {order.storeName ? 'Store Location' : 'Pickup Area'}
                                </p>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {order.storeName || order.storeAddress || 'Store location to be determined'}
                                </p>
                                {order.storeAddress && order.storeName && (
                                    <p className="text-gray-500 text-xs mt-1">
                                        {order.storeAddress}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Customer Details */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <div className="flex items-start space-x-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">Delivery Address</p>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {order.customerAddress || 'Address not available'}
                                </p>
                                {order.customerName && (
                                    <p className="text-gray-500 text-xs mt-1">
                                        Customer: {order.customerName}
                                    </p>
                                )}
                                {order.customerPhone && (
                                    <p className="text-gray-500 text-xs">
                                        Phone: {order.customerPhone}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Distance and Earnings */}
                    <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-6 border border-green-100">
                        <div className="text-center">
                            <p className="text-blue-600 font-semibold text-lg">
                                {assignment.distanceKm ? `${assignment.distanceKm.toFixed(1)}km` : 'N/A'}
                            </p>
                            <p className="text-blue-500 text-xs">Distance</p>
                        </div>
                        <div className="text-center">
                            <p className="text-blue-600 font-semibold text-lg">
                                {assignment.distanceKm ? `${Math.round(assignment.distanceKm * 5)}min` : 'N/A'}
                            </p>
                            <p className="text-blue-500 text-xs">Est. Time</p>
                        </div>
                        <div className="text-center">
                            <p className="text-green-600 font-bold text-xl">
                                ₦{assignment.estimatedPayout || '200'}
                            </p>
                            <p className="text-green-500 text-xs font-medium">Earnings</p>
                        </div>
                    </div>

                    {/* Fleet Mode Indicator */}
                    <div className="flex justify-center mb-4">
                        <div className={`px-4 py-2 rounded-full text-sm font-medium ${assignment.riderMode === 'foot'
                                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                            {assignment.riderMode === 'foot' ? '🚶‍♂️ Foot Fleet' : '🚴‍♂️ Bike Fleet'}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button
                            onClick={handleDecline}
                            disabled={isExpired || isDeclining || isAccepting}
                            className={`flex-1 py-4 rounded-xl font-semibold text-center transition-colors ${isExpired || isDeclining || isAccepting
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                }`}
                        >
                            {isDeclining ? 'Declining...' : 'Decline'}
                        </button>

                        <button
                            onClick={handleAccept}
                            disabled={isExpired || isAccepting || isDeclining}
                            className={`flex-1 py-4 rounded-xl font-semibold text-center transition-colors ${isExpired || isAccepting || isDeclining
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 active:from-purple-800 active:to-pink-800'
                                }`}
                        >
                            {isAccepting ? 'Accepting...' : 'Accept GoBuy Order'}
                        </button>
                    </div>

                    {/* Navigation Button */}
                    {order.customerLat && order.customerLng && (
                        <button
                            onClick={openNavigation}
                            className="w-full mt-3 py-3 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors"
                        >
                            📍 Navigate to Customer
                        </button>
                    )}

                    {/* Special Instructions */}
                    {order.specialInstructions && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800 font-medium text-sm mb-1">Special Instructions:</p>
                            <p className="text-yellow-700 text-sm">
                                {order.specialInstructions}
                            </p>
                        </div>
                    )}

                    {/* Location Status */}
                    {isVisible && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Location Tracking:</span>
                                <span className={`font-medium ${isTracking ? 'text-green-600' : 'text-gray-500'}`}>
                                    {isTracking ? '🟢 Active' : '🔴 Inactive'}
                                </span>
                            </div>
                            {accuracy && (
                                <div className="flex items-center justify-between text-sm mt-1">
                                    <span className="text-gray-600">GPS Accuracy:</span>
                                    <span className="text-gray-800 font-medium">±{Math.round(accuracy)}m</span>
                                </div>
                            )}
                            {locationError && (
                                <p className="text-red-600 text-xs mt-2">
                                    Location Error: {locationError}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoBuyAssignmentSheet;