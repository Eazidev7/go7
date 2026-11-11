import { db } from '../config/firebase';
import { doc, updateDoc, serverTimestamp, getDoc, collection, query, where, onSnapshot, setDoc } from 'firebase/firestore';
import { publishRiderLocation, seedRiderTrackingForOrder } from '../utils/publishRiderLocation';

/**
 * RiderLocationSync - Service for handling rider location tracking and synchronization
 * Provides methods for updating rider locations, changing rider status, and 
 * subscribing to rider location changes.
 */
class RiderLocationSync {
    constructor() {
        this.updateIntervals = {}; // Store interval IDs for each rider
        this.activeSubscriptions = {}; // Store subscription unsubscribe functions
        this.locationBuffer = {}; // Buffer locations between updates to reduce writes
        this.UPDATE_FREQUENCY = 10000; // 10 seconds
        this.listeners = {
            riderLocationChanged: [],
            riderStatusChanged: [],
            riderAdded: [],
            riderRemoved: []
        };
    }

    /**
     * Initialize the sync service with global options
     * @param {Object} options - Configuration options
     * @param {number} options.updateFrequency - How often to sync location in ms (default 10000ms)
     */
    initialize(options = {}) {
        if (options.updateFrequency) {
            this.UPDATE_FREQUENCY = options.updateFrequency;
        }
        console.log(`🔄 RiderLocationSync initialized with ${this.UPDATE_FREQUENCY}ms update frequency`);
    }

    /**
     * Update a rider's location in Firestore
     * Buffers updates and only writes to Firestore every UPDATE_FREQUENCY ms
     * @param {string} riderId - The rider's ID
     * @param {Object} location - The rider's location {latitude, longitude}
     * @returns {Promise} - Promise that resolves when buffer is updated (not when Firestore write completes)
     */
    async updateRiderLocation(riderId, location, orderId = null) {
        if (!riderId || !location?.latitude || !location?.longitude) {
            console.error('Invalid rider ID or location data', { riderId, location });
            return Promise.reject(new Error('Invalid rider ID or location data'));
        }

        this.locationBuffer[riderId] = {
            ...location,
            orderId: orderId || this.locationBuffer[riderId]?.orderId || null,
            timestamp: Date.now(),
        };

        if (!this.updateIntervals[riderId]) {
            this.updateIntervals[riderId] = setInterval(async () => {
                try {
                    if (this.locationBuffer[riderId]) {
                        const buffered = this.locationBuffer[riderId];
                        const activeOrderId = buffered.orderId || null;

                        await publishRiderLocation({
                            riderId,
                            orderId: activeOrderId,
                            location: buffered,
                            status: 'delivering',
                        });

                        this._notifyListeners('riderLocationChanged', {
                            riderId,
                            location: buffered,
                            orderId: activeOrderId,
                        });

                        delete this.locationBuffer[riderId];
                    }
                } catch (error) {
                    console.error('Failed to update rider location:', error);
                }
            }, this.UPDATE_FREQUENCY);
        }

        return Promise.resolve();
    }

    /**
     * Update a rider's status in Firestore
     * @param {string} riderId - The rider's ID
     * @param {string} status - The rider's new status ('active', 'offline', 'delivering', 'on_break')
     * @param {Object} additionalData - Additional data to update (optional)
     * @returns {Promise} - Promise that resolves when the update is complete
     */
    async updateRiderStatus(riderId, status, additionalData = {}) {
        if (!riderId || !status) {
            console.error('Invalid rider ID or status', { riderId, status });
            return Promise.reject(new Error('Invalid rider ID or status'));
        }

        try {
            const riderRef = doc(db, 'riders', riderId);
            
            // Check if the rider exists
            const riderDoc = await getDoc(riderRef);
            if (!riderDoc.exists()) {
                return Promise.reject(new Error(`Rider ${riderId} not found`));
            }

            // Update in Firestore
            await updateDoc(riderRef, {
                status,
                lastStatusUpdate: serverTimestamp(),
                ...additionalData
            });
            
            // Notify listeners
            this._notifyListeners('riderStatusChanged', {
                riderId,
                status,
                previousStatus: riderDoc.data().status,
                timestamp: new Date()
            });
            
            return Promise.resolve();
        } catch (error) {
            console.error('Failed to update rider status:', error);
            return Promise.reject(error);
        }
    }

    /**
     * Assign an order to a rider
     * @param {string} orderId - The order ID
     * @param {string} riderId - The rider's ID
     * @returns {Promise} - Promise that resolves when the assignment is complete
     */
    async assignOrderToRider(orderId, riderId) {
        if (!orderId || !riderId) {
            return Promise.reject(new Error('Order ID and rider ID are required'));
        }

        try {
            const orderRef = doc(db, 'orders', orderId);
            await setDoc(orderRef, {
                riderId,
                status: 'assigned',
                assignedAt: serverTimestamp(),
            }, { merge: true });

            await setDoc(doc(db, 'bookings', orderId), {
                riderId,
                status: 'assigned',
                assignedAt: serverTimestamp(),
            }, { merge: true });

            const riderRef = doc(db, 'riders', riderId);
            await updateDoc(riderRef, {
                currentOrderId: orderId,
                currentOrder: orderId,
                status: 'delivering',
                lastStatusUpdate: serverTimestamp(),
            });

            await seedRiderTrackingForOrder({ riderId, orderId, status: 'assigned' });

            return Promise.resolve();
        } catch (error) {
            console.error('Failed to assign order to rider:', error);
            return Promise.reject(error);
        }
    }

    /**
     * Start tracking a rider's location
     * @param {string} riderId - The rider's ID to track
     * @param {Function} callback - Function to call when location updates
     * @returns {Function} - Unsubscribe function to stop tracking
     */
    trackRiderLocation(riderId, callback) {
        if (!riderId) {
            console.error('Rider ID is required for tracking');
            return () => {};
        }

        // Check if we're already tracking this rider
        if (this.activeSubscriptions[riderId]) {
            console.warn(`Already tracking rider ${riderId}`);
            return this.activeSubscriptions[riderId];
        }

        try {
            const riderRef = doc(db, 'riders', riderId);
            const unsubscribe = onSnapshot(riderRef, (doc) => {
                if (doc.exists()) {
                    const riderData = doc.data();
                    if (riderData.currentLocation) {
                        callback({
                            id: riderId,
                            location: riderData.currentLocation,
                            status: riderData.status,
                            lastUpdated: riderData.lastUpdated,
                            ...riderData
                        });
                    }
                }
            }, (error) => {
                console.error(`Error tracking rider ${riderId}:`, error);
            });

            // Store the unsubscribe function
            this.activeSubscriptions[riderId] = unsubscribe;
            return unsubscribe;
        } catch (error) {
            console.error('Error setting up rider tracking:', error);
            return () => {};
        }
    }

    /**
     * Start tracking all active riders
     * @param {Function} callback - Function called with array of all active rider data
     * @returns {Function} - Unsubscribe function to stop tracking
     */
    trackAllActiveRiders(callback) {
        try {
            const ridersQuery = query(
                collection(db, 'riders'),
                where('status', '!=', 'offline')
            );

            const unsubscribe = onSnapshot(ridersQuery, (snapshot) => {
                const riders = [];
                snapshot.forEach((doc) => {
                    riders.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                callback(riders);
            }, (error) => {
                console.error('Error tracking active riders:', error);
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error setting up active riders tracking:', error);
            return () => {};
        }
    }

    /**
     * Stop tracking a specific rider
     * @param {string} riderId - The rider's ID to stop tracking
     */
    stopTrackingRider(riderId) {
        if (this.activeSubscriptions[riderId]) {
            this.activeSubscriptions[riderId]();
            delete this.activeSubscriptions[riderId];
        }
        
        // Also clear any update intervals
        if (this.updateIntervals[riderId]) {
            clearInterval(this.updateIntervals[riderId]);
            delete this.updateIntervals[riderId];
            delete this.locationBuffer[riderId];
        }
    }

    /**
     * Stop tracking all riders
     */
    stopTrackingAllRiders() {
        // Clear all subscriptions
        Object.keys(this.activeSubscriptions).forEach(riderId => {
            this.stopTrackingRider(riderId);
        });
    }

    /**
     * Register a listener for rider events
     * @param {string} event - Event type ('riderLocationChanged', 'riderStatusChanged', etc.)
     * @param {Function} listener - Callback function
     */
    addEventListener(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    /**
     * Remove a listener for rider events
     * @param {string} event - Event type
     * @param {Function} listener - Listener to remove
     */
    removeEventListener(event, listener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== listener);
        }
    }

    /**
     * Notify all listeners of an event
     * @private
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    _notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Error in rider ${event} listener:`, error);
                }
            });
        }
    }
}

// Singleton instance
const riderLocationSync = new RiderLocationSync();

export default riderLocationSync;