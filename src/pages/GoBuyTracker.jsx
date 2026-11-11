import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import GoBuyRiderTracker from '../components/GoBuyRiderTracker';

/**
 * GoBuy Order Tracker - Shows status of shopping orders
 */
const GoBuyTracker = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Order status steps - enhanced for GoBuy workflow
    const statusSteps = [
        { key: 'Pending', label: 'Order Received', icon: '📋', description: 'We received your order and are finding the best agent' },
        { key: 'Assigned', label: 'Agent Assigned', icon: '👤', description: 'A Go7 agent has been assigned and notified' },
        { key: 'Accepted', label: 'Agent Confirmed', icon: '✅', description: 'Agent accepted the order and is heading to the store' },
        { key: 'Shopping', label: 'Shopping in Progress', icon: '🛒', description: 'Agent is at the store purchasing your item' },
        { key: 'Purchased', label: 'Item Purchased', icon: '💳', description: 'Item bought successfully and payment confirmed' },
        { key: 'InTransit', label: 'Out for Delivery', icon: '🚚', description: 'Your item is on the way to your location' },
        { key: 'Delivered', label: 'Delivered', icon: '🎉', description: 'Order completed successfully!' }
    ];

    useEffect(() => {
        if (!orderId) {
            setError('No order ID provided');
            setLoading(false);
            return;
        }

        // Set up real-time listener for order updates
        const orderRef = doc(db, 'gobuy_orders', orderId);

        const unsubscribe = onSnapshot(
            orderRef,
            (doc) => {
                if (doc.exists()) {
                    const orderData = { id: doc.id, ...doc.data() };
                    setOrder(orderData);
                } else {
                    setError('Order not found');
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching order:', error);
                setError('Failed to load order details');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [orderId]);

    const getCurrentStepIndex = () => {
        if (!order) return 0;
        return statusSteps.findIndex(step => step.key === order.orderStatus);
    };

    const formatCurrency = (amount) => {
        return `₦${parseFloat(amount).toLocaleString()}`;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';

        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return new Intl.DateTimeFormat('en-NG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch (e) {
            return 'Invalid date';
        }
    };

    const getStepTimestamp = (stepKey) => {
        if (!order) return null;

        switch (stepKey) {
            case 'Pending':
                return order.createdAt;
            case 'Assigned':
                return order.assignedAt;
            case 'Accepted':
                return order.acceptedAt;
            case 'Shopping':
                return order.shoppingStartedAt;
            case 'Purchased':
                return order.itemPurchasedAt;
            case 'InTransit':
                return order.inTransitAt;
            case 'Delivered':
                return order.deliveredAt;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your order...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">😞</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const currentStepIndex = getCurrentStepIndex();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                🛍️ <span className="ml-2">Order Tracking</span>
                            </h1>
                            <p className="text-gray-600 text-sm mt-1">
                                Order ID: {orderId}
                            </p>
                        </div>
                        <button
                            onClick={() => window.history.back()}
                            className="text-gray-500 hover:text-gray-700 flex items-center"
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Assigned Rider Card */}
                {order.assignedRider && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                <span className="text-2xl mr-2">
                                    {order.deliveryMode === 'foot' ? '🚶‍♂️' : '🚴‍♂️'}
                                </span>
                                Your Go7 Agent
                            </h2>
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-green-600 font-medium text-sm">Active</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div>
                                    <p className="text-gray-600 text-sm mb-1">Agent Name</p>
                                    <p className="font-semibold text-gray-900">{order.assignedRiderName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm mb-1">Contact</p>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-gray-900">{order.assignedRiderPhone}</span>
                                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                                            📞 Call
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm mb-1">Delivery Mode</p>
                                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                        {order.deliveryMode === 'foot' ? '🚶‍♂️ Foot Fleet' : '🚴‍♂️ Bike Fleet'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-gray-600 text-sm mb-1">Assigned</p>
                                    <p className="text-gray-900">{formatDate(order.assignedAt)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm mb-1">Distance to You</p>
                                    <p className="text-gray-900">{order.riderDistance?.toFixed(1) || 'N/A'} km</p>
                                </div>
                                {order.estimatedPayout && (
                                    <div>
                                        <p className="text-gray-600 text-sm mb-1">Agent Earning</p>
                                        <p className="text-green-600 font-semibold">₦{order.estimatedPayout.toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                                📞 Call Agent
                            </button>
                            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                💬 Send Message
                            </button>
                            <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                                📍 Track Location
                            </button>
                        </div>
                    </div>
                )}

                {/* Real-time Rider Tracker */}
                {order.assignedRider && (
                    <div className="mb-6">
                        <GoBuyRiderTracker
                            orderId={orderId}
                            assignedRider={order.assignedRider}
                        />
                    </div>
                )}

                {/* Order Details Card */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-medium text-gray-700 mb-2">🛒 Item Requested</h3>
                            <p className="text-gray-900 mb-2 text-lg font-semibold">{order.itemName}</p>
                            {order.itemDescription && (
                                <p className="text-gray-600 text-sm mb-4">{order.itemDescription}</p>
                            )}

                            {order.storeName && (
                                <div className="mb-4">
                                    <h3 className="font-medium text-gray-700 mb-2">🏪 Store Information</h3>
                                    <p className="text-gray-900">{order.storeName}</p>
                                    {order.storeAddress && (
                                        <p className="text-gray-600 text-sm">{order.storeAddress}</p>
                                    )}
                                </div>
                            )}

                            <h3 className="font-medium text-gray-700 mb-2">📍 Delivery Address</h3>
                            <p className="text-gray-900 mb-4">{order.customerAddress}</p>

                            <h3 className="font-medium text-gray-700 mb-2">📅 Order Date</h3>
                            <p className="text-gray-900">{formatDate(order.createdAt)}</p>
                        </div>

                        <div>
                            <h3 className="font-medium text-gray-700 mb-2">💰 Payment Breakdown</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Item Budget:</span>
                                    <span>{formatCurrency(order.budget || order.itemBudget || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Service Fee:</span>
                                    <span>{formatCurrency(order.serviceFee || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Delivery Fee:</span>
                                    <span>{formatCurrency(order.deliveryFee || 0)}</span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between font-bold text-red-600">
                                    <span>Total Paid:</span>
                                    <span>{formatCurrency(order.totalPaid || order.totalAmount || 0)}</span>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Distance:</span>
                                        <span>{order.distanceKm?.toFixed(1) || 'N/A'} km</span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span>Delivery Mode:</span>
                                        <span className="capitalize">
                                            {order.deliveryMode === 'foot' ? '🚶 On Foot' : order.deliveryMode === 'bike' ? '🚴 Bike' : order.mode === 'foot' ? '🚶 On Foot' : '🚴 Bike'}
                                        </span>
                                    </div>
                                    {order.specialInstructions && (
                                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                            <p className="text-xs text-yellow-800 font-medium">Special Instructions:</p>
                                            <p className="text-xs text-yellow-700 mt-1">{order.specialInstructions}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Timeline */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Progress</h2>

                    <div className="relative">
                        {statusSteps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;

                            return (
                                <div key={step.key} className="flex items-start mb-8 last:mb-0">
                                    {/* Timeline line */}
                                    {index < statusSteps.length - 1 && (
                                        <div className={`absolute left-6 top-12 w-0.5 h-16 ${index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                                            }`} />
                                    )}

                                    {/* Status icon */}
                                    <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${isCompleted
                                            ? isCurrent
                                                ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                                                : 'bg-green-500 border-green-500 text-white'
                                            : 'bg-white border-gray-300 text-gray-400'
                                        }`}>
                                        {isCompleted ? (
                                            isCurrent ? step.icon : '✓'
                                        ) : (
                                            step.icon
                                        )}
                                    </div>

                                    {/* Status content */}
                                    <div className="ml-4 flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className={`font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-500'
                                                }`}>
                                                {step.label}
                                            </h3>

                                            {/* Timestamp */}
                                            {isCompleted && getStepTimestamp(step.key) && (
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(getStepTimestamp(step.key))}
                                                </span>
                                            )}
                                        </div>

                                        <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-600' : 'text-gray-400'
                                            }`}>
                                            {step.description}
                                        </p>

                                        {/* Enhanced status details */}
                                        {isCompleted && step.key === 'Assigned' && order.assignedRider && (
                                            <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                                <p className="text-sm text-blue-800">
                                                    <strong>{order.assignedRiderName}</strong> has been assigned
                                                </p>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    {order.deliveryMode === 'foot' ? '🚶‍♂️ Walking' : '🚴‍♂️ Cycling'} •
                                                    {order.riderDistance?.toFixed(1) || 'N/A'} km away
                                                </p>
                                            </div>
                                        )}

                                        {isCurrent && (
                                            <div className="mt-2 flex items-center space-x-2">
                                                <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full inline-flex items-center">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                                                    In Progress
                                                </div>
                                                {step.key === 'Shopping' && (
                                                    <div className="text-xs text-gray-600">
                                                        Agent is at the store
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Special status messages */}
                                        {step.key === 'Pending' && order.declinedRiders && order.declinedRiders.length > 0 && (
                                            <div className="mt-2 text-xs text-orange-600">
                                                {order.declinedRiders.length} agent(s) declined - finding alternative
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Support Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
                    <p className="text-blue-700 mb-4">
                        Our customer support team is here to assist you with your order.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            📞 Call Support
                        </button>
                        <button className="bg-white text-blue-600 border border-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                            💬 Live Chat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoBuyTracker;