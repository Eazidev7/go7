import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * GoBuy Orders List - Shows all user orders
 */
const GoBuyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    // Status color mapping
    const statusColors = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Assigned': 'bg-blue-100 text-blue-800',
        'Shopping': 'bg-purple-100 text-purple-800',
        'Purchased': 'bg-indigo-100 text-indigo-800',
        'InTransit': 'bg-orange-100 text-orange-800',
        'Delivered': 'bg-green-100 text-green-800',
        'Cancelled': 'bg-red-100 text-red-800'
    };

    // Status icons
    const statusIcons = {
        'Pending': '⏳',
        'Assigned': '👤',
        'Shopping': '🛒',
        'Purchased': '✅',
        'InTransit': '🚚',
        'Delivered': '🎉',
        'Cancelled': '❌'
    };

    useEffect(() => {
        // Set up real-time listener for orders
        let q = query(
            collection(db, 'gobuy_orders'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        // Add filter if not 'all'
        if (filter !== 'all') {
            q = query(
                collection(db, 'gobuy_orders'),
                where('orderStatus', '==', filter),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const ordersData = [];
                querySnapshot.forEach((doc) => {
                    ordersData.push({ id: doc.id, ...doc.data() });
                });
                setOrders(ordersData);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching orders:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [filter]);

    const formatCurrency = (amount) => {
        return `₦${parseFloat(amount).toLocaleString()}`;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';

        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return new Intl.DateTimeFormat('en-NG', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch (e) {
            return 'Invalid date';
        }
    };

    const getActiveOrders = () => {
        return orders.filter(order =>
            !['Delivered', 'Cancelled'].includes(order.orderStatus)
        );
    };

    const getCompletedOrders = () => {
        return orders.filter(order =>
            ['Delivered', 'Cancelled'].includes(order.orderStatus)
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                🛍️ <span className="ml-2">My GoBuy Orders</span>
                            </h1>
                            <p className="text-gray-600 text-sm mt-1">
                                Track all your personal shopping orders
                            </p>
                        </div>
                        <Link
                            to="/gobuy"
                            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            + New Order
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <span className="text-2xl">🔄</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Active Orders</p>
                                <p className="text-2xl font-bold text-gray-900">{getActiveOrders().length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <span className="text-2xl">✅</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Completed</p>
                                <p className="text-2xl font-bold text-gray-900">{getCompletedOrders().length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <span className="text-2xl">📦</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-lg shadow-sm border p-2 mb-6">
                    <div className="flex flex-wrap gap-1">
                        {[
                            { key: 'all', label: 'All Orders', icon: '📋' },
                            { key: 'Pending', label: 'Pending', icon: '⏳' },
                            { key: 'InTransit', label: 'In Transit', icon: '🚚' },
                            { key: 'Delivered', label: 'Delivered', icon: '🎉' }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === tab.key
                                        ? 'bg-red-600 text-white'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="mr-1">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Orders List */}
                {orders.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                        <div className="text-6xl mb-4">🛍️</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                        <p className="text-gray-600 mb-6">
                            Start shopping! Place your first GoBuy order and we'll handle the rest.
                        </p>
                        <Link
                            to="/gobuy"
                            className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors inline-block"
                        >
                            Place Your First Order
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900 mr-3">
                                                    {order.itemName}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.orderStatus]}`}>
                                                    {statusIcons[order.orderStatus]} {order.orderStatus}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <span className="font-medium mr-2">📍 Delivery:</span>
                                                    <span className="truncate">{order.customerAddress}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="font-medium mr-2">💰 Total:</span>
                                                    <span className="font-semibold text-red-600">
                                                        {formatCurrency(order.totalPaid)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="font-medium mr-2">📅 Ordered:</span>
                                                    <span>{formatDate(order.createdAt)}</span>
                                                </div>
                                            </div>

                                            {order.specialInstructions && (
                                                <div className="mt-3 p-2 bg-gray-50 rounded-md">
                                                    <span className="text-sm text-gray-600">
                                                        <strong>Note:</strong> {order.specialInstructions}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="ml-6 flex flex-col space-y-2">
                                            <Link
                                                to={`/gobuy-tracker/${order.id}`}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm text-center"
                                            >
                                                Track Order
                                            </Link>

                                            {!['Delivered', 'Cancelled'].includes(order.orderStatus) && (
                                                <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                                                    Cancel Order
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Order Progress Bar */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                            <span>Order Progress</span>
                                            <span>
                                                {order.orderStatus === 'Delivered' ? '100%' :
                                                    order.orderStatus === 'InTransit' ? '80%' :
                                                        order.orderStatus === 'Purchased' ? '60%' :
                                                            order.orderStatus === 'Shopping' ? '40%' :
                                                                order.orderStatus === 'Assigned' ? '20%' : '10%'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${order.orderStatus === 'Delivered' ? 'bg-green-500 w-full' :
                                                        order.orderStatus === 'InTransit' ? 'bg-orange-500 w-4/5' :
                                                            order.orderStatus === 'Purchased' ? 'bg-indigo-500 w-3/5' :
                                                                order.orderStatus === 'Shopping' ? 'bg-purple-500 w-2/5' :
                                                                    order.orderStatus === 'Assigned' ? 'bg-blue-500 w-1/5' : 'bg-yellow-500 w-1/12'
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoBuyOrders;