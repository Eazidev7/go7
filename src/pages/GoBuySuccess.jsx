import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

/**
 * GoBuy Success Page - Shows order confirmation and next steps
 */
const GoBuySuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [orderDetails, setOrderDetails] = useState(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown

    useEffect(() => {
        // Get order details from navigation state
        if (location.state?.orderDetails) {
            setOrderDetails(location.state.orderDetails);

            // Celebrate with confetti
            setTimeout(() => {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#E53935', '#8B5A2B', '#FFA726', '#66BB6A']
                });
            }, 500);
        } else {
            // Redirect if no order details
            navigate('/gobuy');
        }
    }, [location.state, navigate]);

    // Countdown timer
    useEffect(() => {
        if (!orderDetails) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [orderDetails]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatCurrency = (amount) => {
        return `₦${parseFloat(amount).toLocaleString()}`;
    };

    if (!orderDetails) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-3xl font-bold mb-2">Order Placed Successfully!</h1>
                    <p className="text-green-100 text-lg">
                        Your GoBuy order has been confirmed and we're finding an agent to help you.
                    </p>
                    <div className="mt-6 inline-flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <span className="text-sm font-medium">Order ID: </span>
                        <span className="ml-2 font-mono font-bold">{orderDetails.orderId}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Order Summary Card */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            🛍️ <span className="ml-2">Order Summary</span>
                        </h2>

                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{orderDetails.itemName}</h3>
                                    {orderDetails.itemDescription && (
                                        <p className="text-sm text-gray-600 mt-1">{orderDetails.itemDescription}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-gray-900">
                                        {formatCurrency(orderDetails.itemBudget)}
                                    </span>
                                    <p className="text-xs text-gray-500">Budget</p>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Service Fee (5%):</span>
                                        <span>{formatCurrency(orderDetails.serviceFee)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Delivery Fee:</span>
                                        <span>{formatCurrency(orderDetails.deliveryFee)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
                                        <span>Total Paid:</span>
                                        <span className="text-red-600">{formatCurrency(orderDetails.totalPaid)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-700 mb-2">📍 Delivery Address</h4>
                                <p className="text-gray-900">{orderDetails.customerAddress}</p>
                                {orderDetails.phoneNumber && (
                                    <p className="text-sm text-gray-600 mt-1">📱 {orderDetails.phoneNumber}</p>
                                )}
                            </div>

                            {orderDetails.specialInstructions && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-medium text-blue-900 mb-2">📝 Special Instructions</h4>
                                    <p className="text-blue-800">{orderDetails.specialInstructions}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Next Steps Card */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            ⏱️ <span className="ml-2">What's Next?</span>
                        </h2>

                        {/* Agent Assignment Timer */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-yellow-900">Finding an Agent</h3>
                                    <p className="text-sm text-yellow-700">We're matching you with the best available agent</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-yellow-900">{formatTime(timeLeft)}</div>
                                    <div className="text-xs text-yellow-700">Expected wait time</div>
                                </div>
                            </div>
                            <div className="w-full bg-yellow-200 rounded-full h-2 mt-3">
                                <div
                                    className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.max(0, ((300 - timeLeft) / 300) * 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Process Steps */}
                        <div className="space-y-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    ✓
                                </div>
                                <div className="ml-4">
                                    <h4 className="font-medium text-gray-900">Order Received</h4>
                                    <p className="text-sm text-gray-600">Your order has been confirmed and payment processed</p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold animate-pulse">
                                    2
                                </div>
                                <div className="ml-4">
                                    <h4 className="font-medium text-gray-900">Agent Assignment</h4>
                                    <p className="text-sm text-gray-600">We're finding the best agent near the store location</p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    3
                                </div>
                                <div className="ml-4">
                                    <h4 className="font-medium text-gray-500">Shopping</h4>
                                    <p className="text-sm text-gray-400">Agent will go to the store and purchase your item</p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    4
                                </div>
                                <div className="ml-4">
                                    <h4 className="font-medium text-gray-500">Delivery</h4>
                                    <p className="text-sm text-gray-400">Your item will be delivered to your specified address</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 mt-8">
                            <Link
                                to={`/gobuy-tracker/${orderDetails.orderId}`}
                                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors text-center"
                            >
                                🔍 Track This Order
                            </Link>

                            <Link
                                to="/gobuy-orders"
                                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
                            >
                                📋 View All Orders
                            </Link>

                            <Link
                                to="/gobuy"
                                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-center"
                            >
                                🛍️ Place Another Order
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Important Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
                    <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center">
                        ℹ️ <span className="ml-2">Important Information</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h4 className="font-semibold text-blue-800 mb-2">Payment & Refunds</h4>
                            <ul className="space-y-1 text-blue-700">
                                <li>• Payment has been securely processed</li>
                                <li>• If the item is unavailable, you'll get a full refund</li>
                                <li>• Price differences will be handled transparently</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-blue-800 mb-2">Communication</h4>
                            <ul className="space-y-1 text-blue-700">
                                <li>• You'll receive SMS updates on order progress</li>
                                <li>• Agent may call for clarifications or alternatives</li>
                                <li>• Live tracking available once agent is assigned</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Support Contact */}
                <div className="bg-white rounded-xl shadow-lg p-6 mt-8 text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Need Help?</h3>
                    <p className="text-gray-600 mb-4">
                        Our customer support team is available 24/7 to assist you with your order.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                            📞 Call Support: +234-XXX-XXXX
                        </button>
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            💬 Live Chat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoBuySuccess;