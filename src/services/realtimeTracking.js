import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    runTransaction,
    writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

class RealtimeTrackingService {
    constructor() {
        this.listeners = new Map();
        this.isOnline = !!db;
        console.log('🔥 Real-time Tracking Service initialized:', this.isOnline ? 'ONLINE' : 'OFFLINE');
    }

    // Real-time rider location tracking
    async updateRiderLocation(riderId, location) {
        if (!this.isOnline) {
            console.log('📍 Mock: Rider location updated locally');
            return;
        }

        try {
            const riderLocationRef = doc(db, 'rider-locations', riderId);
            await updateDoc(riderLocationRef, {
                location,
                lastUpdated: serverTimestamp(),
                isActive: true
            });
            console.log('📍 Rider location updated in Firebase:', riderId);
        } catch (error) {
            console.error('❌ Error updating rider location:', error);
        }
    }

    // Listen to real-time rider locations
    subscribeToRiderLocations(callback) {
        if (!this.isOnline) {
            console.log('📡 Mock: Simulating rider locations');
            // Simulate real-time updates for demo
            const mockData = [
                {
                    id: 'rider123',
                    location: { latitude: 7.1600, longitude: 3.3500 },
                    lastUpdated: new Date(),
                    isActive: true
                }
            ];
            callback(mockData);
            return () => { }; // Cleanup function
        }

        const q = query(
            collection(db, 'rider-locations'),
            where('isActive', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const riders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(riders);
        });

        this.listeners.set('rider-locations', unsubscribe);
        return unsubscribe;
    }

    // Real-time order tracking
    async updateOrderStatus(orderId, status, data = {}) {
        if (!this.isOnline) {
            console.log('📦 Mock: Order status updated locally:', status);
            return;
        }

        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                status,
                ...data,
                lastUpdated: serverTimestamp()
            });
            console.log('📦 Order status updated:', orderId, status);
        } catch (error) {
            console.error('❌ Error updating order status:', error);
        }
    }

    // Subscribe to order tracking
    subscribeToOrder(orderId, callback) {
        if (!this.isOnline) {
            console.log('📡 Mock: Simulating order tracking');
            // Simulate order updates
            const mockOrder = {
                id: orderId,
                status: 'pickup',
                riderId: 'rider123',
                lastUpdated: new Date()
            };
            callback(mockOrder);
            return () => { };
        }

        const orderRef = doc(db, 'orders', orderId);
        const unsubscribe = onSnapshot(orderRef, (doc) => {
            if (doc.exists()) {
                callback({ id: doc.id, ...doc.data() });
            }
        });

        this.listeners.set(`order-${orderId}`, unsubscribe);
        return unsubscribe;
    }

    // Real-time delivery booking
    async createDeliveryBooking(bookingData) {
        if (!this.isOnline) {
            const mockId = 'booking_' + Date.now();
            console.log('📝 Mock: Delivery booking created locally:', mockId);
            return mockId;
        }

        try {
            const docRef = await addDoc(collection(db, 'bookings'), {
                ...bookingData,
                createdAt: serverTimestamp(),
                status: 'pending'
            });
            console.log('📝 Delivery booking created in Firebase:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('❌ Error creating booking:', error);
            throw error;
        }
    }

    // Listen to all active riders (Admin Dashboard)
    subscribeToActiveRiders(callback) {
        if (!this.isOnline) {
            console.log('📡 Mock: Simulating active riders');
            const mockRiders = [
                {
                    id: 'rider123',
                    name: 'Adebayo Okonkwo',
                    status: 'online',
                    location: { latitude: 7.1600, longitude: 3.3500 },
                    vehicle: 'Honda CB125F',
                    rating: 4.8
                },
                {
                    id: 'rider456',
                    name: 'Fatima Ahmed',
                    status: 'busy',
                    location: { latitude: 7.1700, longitude: 3.3600 },
                    vehicle: 'Bajaj Boxer',
                    rating: 4.9
                }
            ];
            callback(mockRiders);
            return () => { };
        }

        const q = query(
            collection(db, 'riders'),
            where('status', 'in', ['online', 'busy']),
            orderBy('lastActive', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const riders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(riders);
        });

        this.listeners.set('active-riders', unsubscribe);
        return unsubscribe;
    }

    // Real-time customer tracking updates
    async updateCustomerTracking(orderId, trackingData) {
        if (!this.isOnline) {
            console.log('👤 Mock: Customer tracking updated locally');
            return;
        }

        try {
            const trackingRef = doc(db, 'customer-tracking', orderId);
            await updateDoc(trackingRef, {
                ...trackingData,
                lastUpdated: serverTimestamp()
            });
            console.log('👤 Customer tracking updated:', orderId);
        } catch (error) {
            console.error('❌ Error updating customer tracking:', error);
        }
    }

    // Batch update for performance
    async batchUpdate(updates) {
        if (!this.isOnline) {
            console.log('📊 Mock: Batch update completed locally');
            return;
        }

        try {
            const batch = writeBatch(db);

            updates.forEach(({ collection: collectionName, id, data }) => {
                const docRef = doc(db, collectionName, id);
                batch.update(docRef, {
                    ...data,
                    lastUpdated: serverTimestamp()
                });
            });

            await batch.commit();
            console.log('📊 Batch update completed');
        } catch (error) {
            console.error('❌ Batch update failed:', error);
        }
    }

    // Clean up all listeners
    cleanup() {
        this.listeners.forEach((unsubscribe, key) => {
            unsubscribe();
            console.log('🧹 Cleaned up listener:', key);
        });
        this.listeners.clear();
    }

    // Check if Firebase is online
    isFirebaseOnline() {
        return this.isOnline;
    }

    // Get Firebase status for debugging
    getStatus() {
        return {
            online: this.isOnline,
            listeners: this.listeners.size,
            project: db?.app?.options?.projectId || 'Not connected'
        };
    }
}

// Create singleton instance
const realtimeTrackingService = new RealtimeTrackingService();

export default realtimeTrackingService;