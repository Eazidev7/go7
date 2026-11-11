import { doc, getDoc, getDocs, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Service for managing GoBuy order data and real-time updates
 */
export class GoBuyOrderService {

    /**
     * Get GoBuy order details by ID
     */
    static async getOrderById(orderId) {
        try {
            const orderRef = doc(db, 'gobuy_orders', orderId);
            const orderDoc = await getDoc(orderRef);

            if (orderDoc.exists()) {
                return { id: orderDoc.id, ...orderDoc.data() };
            } else {
                throw new Error('Order not found');
            }
        } catch (error) {
            console.error('Error fetching GoBuy order:', error);
            throw error;
        }
    }

    /**
     * Listen for real-time updates to a specific order
     */
    static subscribeToOrder(orderId, callback) {
        try {
            const orderRef = doc(db, 'gobuy_orders', orderId);

            const unsubscribe = onSnapshot(orderRef, (doc) => {
                if (doc.exists()) {
                    callback({ id: doc.id, ...doc.data() });
                } else {
                    callback(null);
                }
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error subscribing to GoBuy order:', error);
            throw error;
        }
    }

    /**
     * Get orders assigned to a specific rider
     */
    static async getRiderOrders(riderId, status = 'Assigned') {
        try {
            const ordersQuery = query(
                collection(db, 'gobuy_orders'),
                where('assignedRider', '==', riderId),
                where('orderStatus', '==', status),
                orderBy('assignedAt', 'desc'),
                limit(20)
            );

            const snapshot = await getDocs(ordersQuery);
            const orders = [];

            snapshot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            return orders;
        } catch (error) {
            console.error('Error fetching rider orders:', error);
            throw error;
        }
    }

    /**
     * Listen for real-time updates to rider's assigned orders
     */
    static subscribeToRiderOrders(riderId, callback, status = 'Assigned') {
        try {
            const ordersQuery = query(
                collection(db, 'gobuy_orders'),
                where('assignedRider', '==', riderId),
                where('orderStatus', '==', status),
                orderBy('assignedAt', 'desc')
            );

            const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
                const orders = [];
                snapshot.forEach(doc => {
                    orders.push({ id: doc.id, ...doc.data() });
                });
                callback(orders);
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error subscribing to rider orders:', error);
            throw error;
        }
    }

    /**
     * Get order history for analytics
     */
    static async getOrderHistory(riderId, limit = 50) {
        try {
            const ordersQuery = query(
                collection(db, 'gobuy_orders'),
                where('assignedRider', '==', riderId),
                where('orderStatus', 'in', ['Delivered', 'Cancelled', 'Failed']),
                orderBy('completedAt', 'desc'),
                limit(limit)
            );

            const snapshot = await getDocs(ordersQuery);
            const orders = [];

            snapshot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            return orders;
        } catch (error) {
            console.error('Error fetching order history:', error);
            throw error;
        }
    }

    /**
     * Calculate rider earnings from completed GoBuy orders
     */
    static async getRiderEarnings(riderId, timeFrame = 'week') {
        try {
            const now = new Date();
            let startDate;

            switch (timeFrame) {
                case 'day':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                default:
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            }

            const ordersQuery = query(
                collection(db, 'gobuy_orders'),
                where('assignedRider', '==', riderId),
                where('orderStatus', '==', 'Delivered'),
                where('completedAt', '>=', startDate),
                orderBy('completedAt', 'desc')
            );

            const snapshot = await getDocs(ordersQuery);
            let totalEarnings = 0;
            let orderCount = 0;
            const orders = [];

            snapshot.forEach(doc => {
                const order = { id: doc.id, ...doc.data() };
                orders.push(order);
                totalEarnings += order.estimatedPayout || 200;
                orderCount++;
            });

            return {
                totalEarnings,
                orderCount,
                averageEarnings: orderCount > 0 ? totalEarnings / orderCount : 0,
                orders,
                timeFrame
            };
        } catch (error) {
            console.error('Error calculating rider earnings:', error);
            throw error;
        }
    }

    /**
     * Get GoBuy order statistics
     */
    static async getOrderStats(riderId) {
        try {
            // Get all orders for this rider
            const allOrdersQuery = query(
                collection(db, 'gobuy_orders'),
                where('assignedRider', '==', riderId),
                orderBy('assignedAt', 'desc'),
                limit(100)
            );

            const snapshot = await getDocs(allOrdersQuery);
            const stats = {
                total: 0,
                delivered: 0,
                cancelled: 0,
                inProgress: 0,
                totalEarnings: 0,
                averageDistance: 0,
                averageRating: 0
            };

            let totalDistance = 0;
            let totalRatings = 0;
            let ratingCount = 0;

            snapshot.forEach(doc => {
                const order = doc.data();
                stats.total++;

                switch (order.orderStatus) {
                    case 'Delivered':
                        stats.delivered++;
                        stats.totalEarnings += order.estimatedPayout || 200;
                        if (order.riderRating) {
                            totalRatings += order.riderRating;
                            ratingCount++;
                        }
                        break;
                    case 'Cancelled':
                    case 'Failed':
                        stats.cancelled++;
                        break;
                    case 'Assigned':
                    case 'Accepted':
                    case 'InProgress':
                        stats.inProgress++;
                        break;
                }

                if (order.riderDistance) {
                    totalDistance += order.riderDistance;
                }
            });

            stats.averageDistance = stats.total > 0 ? totalDistance / stats.total : 0;
            stats.averageRating = ratingCount > 0 ? totalRatings / ratingCount : 0;
            stats.completionRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;

            return stats;
        } catch (error) {
            console.error('Error fetching order stats:', error);
            throw error;
        }
    }

    /**
     * Format order data for display
     */
    static formatOrderForDisplay(order) {
        return {
            ...order,
            formattedBudget: order.budget ? `₦${order.budget.toLocaleString()}` : 'N/A',
            formattedPayout: order.estimatedPayout ? `₦${order.estimatedPayout.toLocaleString()}` : '₦200',
            formattedDistance: order.riderDistance ? `${order.riderDistance.toFixed(1)}km` : 'N/A',
            formattedDate: order.assignedAt ? new Date(order.assignedAt.toDate()).toLocaleString() : 'N/A',
            statusColor: this.getStatusColor(order.orderStatus),
            timeAgo: order.assignedAt ? this.getTimeAgo(order.assignedAt.toDate()) : 'N/A'
        };
    }

    /**
     * Get status color for UI display
     */
    static getStatusColor(status) {
        const colors = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Assigned': 'bg-blue-100 text-blue-800',
            'Accepted': 'bg-green-100 text-green-800',
            'InProgress': 'bg-purple-100 text-purple-800',
            'Delivered': 'bg-emerald-100 text-emerald-800',
            'Cancelled': 'bg-red-100 text-red-800',
            'Failed': 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    /**
     * Calculate time ago from timestamp
     */
    static getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else {
            return `${days}d ago`;
        }
    }
}

export default GoBuyOrderService;