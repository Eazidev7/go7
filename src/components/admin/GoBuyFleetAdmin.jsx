import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import GoBuyOrderService from '../../services/goBuyOrderService';

/**
 * Admin Dashboard for GoBuy Fleet Management
 */
const GoBuyFleetAdmin = () => {
    const [activeRiders, setActiveRiders] = useState([]);
    const [recentAssignments, setRecentAssignments] = useState([]);
    const [orderStats, setOrderStats] = useState({});
    const [fleetStats, setFleetStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('overview');

    useEffect(() => {
        loadDashboardData();

        // Set up real-time listeners
        const unsubscribers = [];

        // Listen for assignment updates
        const assignmentsRef = query(
            collection(db, 'assignments'),
            where('riderMode', 'in', ['foot', 'bike']),
            orderBy('timestamp', 'desc'),
            limit(10)
        );

        const unsubAssignments = onSnapshot(assignmentsRef, (snapshot) => {
            const assignments = [];
            snapshot.forEach(doc => {
                assignments.push({ id: doc.id, ...doc.data() });
            });
            setRecentAssignments(assignments);
        });

        unsubscribers.push(unsubAssignments);

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Load fleet data
            await Promise.all([
                loadFleetData(),
                loadOrderStats(),
                loadAssignments()
            ]);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadFleetData = async () => {
        try {
            // Get foot fleet
            const footFleetQuery = query(collection(db, 'foot_fleet'), orderBy('lastActive', 'desc'));
            const footFleetSnapshot = await getDocs(footFleetQuery);

            // Get bike fleet
            const bikeFleetQuery = query(collection(db, 'bike_fleet'), orderBy('lastActive', 'desc'));
            const bikeFleetSnapshot = await getDocs(bikeFleetQuery);

            const footRiders = [];
            const bikeRiders = [];

            footFleetSnapshot.forEach(doc => {
                footRiders.push({ id: doc.id, mode: 'foot', ...doc.data() });
            });

            bikeFleetSnapshot.forEach(doc => {
                bikeRiders.push({ id: doc.id, mode: 'bike', ...doc.data() });
            });

            const allRiders = [...footRiders, ...bikeRiders];
            setActiveRiders(allRiders);

            // Calculate fleet stats
            const stats = {
                totalRiders: allRiders.length,
                footRiders: footRiders.length,
                bikeRiders: bikeRiders.length,
                availableRiders: allRiders.filter(r => r.status === 'available').length,
                busyRiders: allRiders.filter(r => r.status === 'busy').length,
                offlineRiders: allRiders.filter(r => r.status === 'offline').length
            };

            setFleetStats(stats);

        } catch (error) {
            console.error('Error loading fleet data:', error);
        }
    };

    const loadOrderStats = async () => {
        try {
            const ordersQuery = query(
                collection(db, 'gobuy_orders'),
                orderBy('createdAt', 'desc'),
                limit(100)
            );

            const snapshot = await getDocs(ordersQuery);
            const orders = [];
            snapshot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            const stats = {
                total: orders.length,
                pending: orders.filter(o => o.orderStatus === 'Pending').length,
                assigned: orders.filter(o => o.orderStatus === 'Assigned').length,
                accepted: orders.filter(o => o.orderStatus === 'Accepted').length,
                inProgress: orders.filter(o => ['Shopping', 'Purchased', 'InTransit'].includes(o.orderStatus)).length,
                delivered: orders.filter(o => o.orderStatus === 'Delivered').length,
                cancelled: orders.filter(o => o.orderStatus === 'Cancelled').length,
                totalRevenue: orders
                    .filter(o => o.orderStatus === 'Delivered')
                    .reduce((sum, o) => sum + (o.estimatedPayout || 200), 0)
            };

            setOrderStats(stats);

        } catch (error) {
            console.error('Error loading order stats:', error);
        }
    };

    const loadAssignments = async () => {
        try {
            const assignmentsQuery = query(
                collection(db, 'assignments'),
                orderBy('timestamp', 'desc'),
                limit(20)
            );

            const snapshot = await getDocs(assignmentsQuery);
            const assignments = [];
            snapshot.forEach(doc => {
                assignments.push({ id: doc.id, ...doc.data() });
            });

            setRecentAssignments(assignments);

        } catch (error) {
            console.error('Error loading assignments:', error);
        }
    };

    const formatCurrency = (amount) => {
        return `₦${parseFloat(amount || 0).toLocaleString()}`;
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Unknown';

        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);

            if (minutes < 60) return `${minutes}m ago`;

            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;

            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        } catch (e) {
            return 'Unknown';
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'available': 'bg-green-100 text-green-800',
            'busy': 'bg-blue-100 text-blue-800',
            'offline': 'bg-gray-100 text-gray-800',
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Assigned': 'bg-blue-100 text-blue-800',
            'Accepted': 'bg-green-100 text-green-800',
            'Delivered': 'bg-emerald-100 text-emerald-800',
            'Cancelled': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading GoBuy Fleet Data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        🛍️ <span className="ml-2">GoBuy Fleet Management</span>
                    </h1>
                    <p className="text-gray-600 mt-1">Monitor assignments, fleet performance, and order analytics</p>
                </div>
                <button
                    onClick={loadDashboardData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900">{orderStats.total || 0}</p>
                        </div>
                        <div className="text-blue-500 text-2xl">📦</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Active Riders</p>
                            <p className="text-2xl font-bold text-gray-900">{fleetStats.availableRiders + fleetStats.busyRiders || 0}</p>
                        </div>
                        <div className="text-green-500 text-2xl">👥</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Pending Orders</p>
                            <p className="text-2xl font-bold text-gray-900">{orderStats.pending || 0}</p>
                        </div>
                        <div className="text-yellow-500 text-2xl">⏳</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(orderStats.totalRevenue)}</p>
                        </div>
                        <div className="text-green-500 text-2xl">💰</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        {[
                            { id: 'overview', name: 'Overview', icon: '📊' },
                            { id: 'fleet', name: 'Fleet Status', icon: '👥' },
                            { id: 'assignments', name: 'Recent Assignments', icon: '📋' },
                            { id: 'analytics', name: 'Analytics', icon: '📈' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedTab(tab.id)}
                                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${selectedTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.icon} {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {selectedTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Order Status Overview */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Breakdown</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Pending', count: orderStats.pending, color: 'bg-yellow-500' },
                                        { label: 'Assigned', count: orderStats.assigned, color: 'bg-blue-500' },
                                        { label: 'In Progress', count: orderStats.inProgress, color: 'bg-purple-500' },
                                        { label: 'Delivered', count: orderStats.delivered, color: 'bg-green-500' },
                                        { label: 'Cancelled', count: orderStats.cancelled, color: 'bg-red-500' }
                                    ].map(item => (
                                        <div key={item.label} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                                                <span className="text-gray-700">{item.label}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{item.count || 0}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Fleet Status Overview */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fleet Status</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <span className="text-gray-700">Available Riders</span>
                                        </div>
                                        <span className="font-semibold text-gray-900">{fleetStats.availableRiders || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            <span className="text-gray-700">Busy Riders</span>
                                        </div>
                                        <span className="font-semibold text-gray-900">{fleetStats.busyRiders || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                                            <span className="text-gray-700">Offline Riders</span>
                                        </div>
                                        <span className="font-semibold text-gray-900">{fleetStats.offlineRiders || 0}</span>
                                    </div>
                                    <div className="pt-2 border-t">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-700">🚶‍♂️ Foot Fleet</span>
                                            <span className="font-semibold text-gray-900">{fleetStats.footRiders || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-gray-700">🚴‍♂️ Bike Fleet</span>
                                            <span className="font-semibold text-gray-900">{fleetStats.bikeRiders || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedTab === 'fleet' && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fleet Status</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rider
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Fleet
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Current Order
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Earnings Today
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Last Active
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {activeRiders.slice(0, 20).map(rider => (
                                            <tr key={rider.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{rider.name}</div>
                                                        <div className="text-sm text-gray-500">{rider.phone}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-900">
                                                        {rider.mode === 'foot' ? '🚶‍♂️ Foot' : '🚴‍♂️ Bike'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(rider.status)}`}>
                                                        {rider.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {rider.currentOrder || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatCurrency(rider.dailyEarnings || 0)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatTimeAgo(rider.lastActive)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedTab === 'assignments' && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Assignments</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Order ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rider
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Fleet
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Distance
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Payout
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Assigned
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {recentAssignments.map(assignment => (
                                            <tr key={assignment.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-blue-600">
                                                        {assignment.orderId?.substring(0, 8)}...
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{assignment.riderName}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-900">
                                                        {assignment.riderMode === 'foot' ? '🚶‍♂️ Foot' : '🚴‍♂️ Bike'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {assignment.distanceKm?.toFixed(1)} km
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatCurrency(assignment.estimatedPayout)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                                                        {assignment.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatTimeAgo(assignment.timestamp)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedTab === 'analytics' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">Average Assignment Time</span>
                                        <span className="font-semibold text-gray-900">2.3 min</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">Assignment Success Rate</span>
                                        <span className="font-semibold text-gray-900">94.2%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">Average Delivery Time</span>
                                        <span className="font-semibold text-gray-900">28 min</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">Customer Satisfaction</span>
                                        <span className="font-semibold text-gray-900">4.7/5</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Fleet Utilization</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">Foot Fleet Utilization</span>
                                        <span className="font-semibold text-gray-900">78%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">Bike Fleet Utilization</span>
                                        <span className="font-semibold text-gray-900">65%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">Peak Hours</span>
                                        <span className="font-semibold text-gray-900">12PM - 6PM</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-700">Orders per Hour (Peak)</span>
                                        <span className="font-semibold text-gray-900">24</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoBuyFleetAdmin;