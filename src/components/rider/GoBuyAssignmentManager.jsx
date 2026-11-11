import React, { useState, useEffect } from 'react';
import { useGoBuyAssignments } from '../../hooks/useGoBuyAssignments';
import GoBuyAssignmentSheet from './GoBuyAssignmentSheet';
import GoBuyOrderService from '../../services/goBuyOrderService';

/**
 * Main component for handling GoBuy assignment workflow
 * Integrates assignment notifications with order details
 */
const GoBuyAssignmentManager = ({ riderId, isActive = true }) => {
    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Use the GoBuy assignments hook
    const {
        currentAssignment,
        assignmentVisible,
        assignmentHistory,
        handleAccept,
        handleDecline,
        handleTimeout,
        dismissAssignment
    } = useGoBuyAssignments(riderId);

    // Fetch order details when new assignment is received
    useEffect(() => {
        if (currentAssignment && currentAssignment.orderId && !orderDetails) {
            fetchOrderDetails(currentAssignment.orderId);
        }
    }, [currentAssignment, orderDetails]);

    // Clear order details when assignment is dismissed
    useEffect(() => {
        if (!currentAssignment) {
            setOrderDetails(null);
            setError(null);
        }
    }, [currentAssignment]);

    const fetchOrderDetails = async (orderId) => {
        setLoading(true);
        setError(null);

        try {
            console.log('📦 Fetching GoBuy order details:', orderId);
            const order = await GoBuyOrderService.getOrderById(orderId);
            const formattedOrder = GoBuyOrderService.formatOrderForDisplay(order);

            setOrderDetails(formattedOrder);
            console.log('✅ Order details loaded:', formattedOrder);

        } catch (error) {
            console.error('❌ Error fetching order details:', error);
            setError('Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    // Enhanced accept handler with order validation
    const handleAcceptAssignment = async (assignment) => {
        try {
            if (!orderDetails) {
                throw new Error('Order details not available');
            }

            // Validate order is still assignable
            if (orderDetails.orderStatus !== 'Assigned') {
                throw new Error('Order is no longer available');
            }

            console.log('✅ Accepting GoBuy assignment with order details');
            await handleAccept(assignment);

        } catch (error) {
            console.error('Error accepting assignment:', error);
            alert(`Failed to accept assignment: ${error.message}`);
        }
    };

    // Enhanced decline handler
    const handleDeclineAssignment = async (assignment) => {
        try {
            console.log('❌ Declining GoBuy assignment');
            await handleDecline(assignment);

        } catch (error) {
            console.error('Error declining assignment:', error);
            alert(`Failed to decline assignment: ${error.message}`);
        }
    };

    // Enhanced timeout handler
    const handleTimeoutAssignment = async () => {
        try {
            console.log('⏰ GoBuy assignment timed out');
            await handleTimeout();

        } catch (error) {
            console.error('Error handling timeout:', error);
        }
    };

    // Don't render if rider is not active
    if (!isActive || !riderId) {
        return null;
    }

    // Show loading state
    if (currentAssignment && assignmentVisible && loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white rounded-xl p-6 shadow-2xl">
                    <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-700 font-medium">Loading order details...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (currentAssignment && assignmentVisible && error) {
        return (
            <div className="fixed inset-0 z-50 flex items-end">
                <div className="absolute inset-0 bg-black bg-opacity-50" />
                <div className="relative w-full bg-white rounded-t-3xl shadow-2xl p-6">
                    <div className="text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Assignment</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => fetchOrderDetails(currentAssignment.orderId)}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                            >
                                Retry
                            </button>
                            <button
                                onClick={dismissAssignment}
                                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Main Assignment Sheet */}
            {currentAssignment && assignmentVisible && orderDetails && (
                <GoBuyAssignmentSheet
                    assignment={currentAssignment}
                    order={orderDetails}
                    onAccept={handleAcceptAssignment}
                    onDecline={handleDeclineAssignment}
                    onTimeout={handleTimeoutAssignment}
                    isVisible={assignmentVisible}
                />
            )}

            {/* Assignment History Badge (Optional - for debugging) */}
            {process.env.NODE_ENV === 'development' && assignmentHistory.length > 0 && (
                <div className="fixed top-4 left-4 z-40 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                    GoBuy: {assignmentHistory.length} received
                </div>
            )}
        </>
    );
};

export default GoBuyAssignmentManager;