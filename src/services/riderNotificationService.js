import { doc, updateDoc, serverTimestamp, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

/**
 * FCM Notification Service for Rider Assignments
 * Handles push notifications for GoBuy order assignments
 */

// Notification types
export const NOTIFICATION_TYPES = {
    ASSIGNMENT: 'assignment',
    REMINDER: 'reminder',
    CANCELLATION: 'cancellation',
    DELIVERY_UPDATE: 'delivery_update'
};

/**
 * Send assignment notification to rider
 */
export const sendAssignmentNotification = async (assignment, orderDetails) => {
    try {
        if (!assignment.deviceToken) {
            console.warn('No device token for rider, skipping notification');
            return { success: false, error: 'No device token' };
        }

        const notificationPayload = {
            to: assignment.deviceToken,
            notification: {
                title: '🛍️ New GoBuy Request!',
                body: `₦${assignment.estimatedPayout} payout! ${orderDetails.itemName} - Accept within 30 seconds`,
                icon: '/go7-logo.png',
                badge: '/go7-logo.png',
                sound: 'default',
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            data: {
                type: NOTIFICATION_TYPES.ASSIGNMENT,
                orderId: orderDetails.id,
                riderId: assignment.riderId,
                orderType: 'gobuy',
                itemName: orderDetails.itemName,
                customerAddress: orderDetails.customerAddress,
                estimatedPayout: assignment.estimatedPayout.toString(),
                distanceKm: assignment.distanceKm?.toString() || '0',
                timeout: '30', // 30 seconds to respond
                timestamp: Date.now().toString()
            },
            android: {
                priority: 'high',
                notification: {
                    channel_id: 'gobuy_assignments',
                    priority: 'high',
                    default_sound: true,
                    default_vibrate_pattern: true
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        alert: {
                            title: '🛍️ New GoBuy Request!',
                            body: `₦${assignment.estimatedPayout} payout! Accept within 30 seconds`
                        },
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };

        // Send via FCM (this would typically be done server-side)
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Authorization': `key=${process.env.REACT_APP_FCM_SERVER_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationPayload)
        });

        if (response.ok) {
            console.log('✅ Assignment notification sent successfully');

            // Log notification in database
            await logNotification({
                riderId: assignment.riderId,
                orderId: orderDetails.id,
                type: NOTIFICATION_TYPES.ASSIGNMENT,
                title: notificationPayload.notification.title,
                body: notificationPayload.notification.body,
                sentAt: serverTimestamp(),
                status: 'sent'
            });

            // Set timeout for auto-reassignment if no response
            setTimeout(async () => {
                await handleAssignmentTimeout(orderDetails.id, assignment.riderId);
            }, 30000); // 30 seconds

            return { success: true, messageId: response.headers.get('message-id') };
        } else {
            throw new Error(`FCM request failed: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error sending assignment notification:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Handle assignment timeout (no response from rider)
 */
export const handleAssignmentTimeout = async (orderId, riderId) => {
    try {
        console.log(`⏰ Assignment timeout for order ${orderId}, rider ${riderId}`);

        // Check if order is still in assigned state (not accepted/declined)
        const orderRef = doc(db, 'gobuy_orders', orderId);
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) return;

        const orderData = orderDoc.data();

        // Only trigger timeout if order is still assigned to this rider
        if (orderData.orderStatus === 'Assigned' && orderData.assignedRider === riderId) {
            console.log('🔄 Auto-reassigning due to timeout...');

            // Import fleetService to avoid circular dependency
            const { handleRiderAcceptance } = await import('./fleetService');

            // Handle as if rider declined
            await handleRiderAcceptance(orderId, riderId, false);

            // Send timeout notification to rider
            await sendTimeoutNotification(riderId, orderId);
        }
    } catch (error) {
        console.error('Error handling assignment timeout:', error);
    }
};

/**
 * Send timeout notification to rider
 */
export const sendTimeoutNotification = async (riderId, orderId) => {
    try {
        // Get rider device token from fleet collections
        const { FLEET_COLLECTIONS } = await import('./fleetService');
        let deviceToken = null;

        for (const fleet of [FLEET_COLLECTIONS.FOOT, FLEET_COLLECTIONS.BIKE]) {
            try {
                const riderDoc = await getDoc(doc(db, fleet, riderId));
                if (riderDoc.exists() && riderDoc.data().deviceToken) {
                    deviceToken = riderDoc.data().deviceToken;
                    break;
                }
            } catch (e) {
                // Continue to next fleet
            }
        }

        if (!deviceToken) return;

        const timeoutPayload = {
            to: deviceToken,
            notification: {
                title: '⏰ Assignment Expired',
                body: 'Order reassigned to another rider. Stay active for more opportunities!',
                icon: '/go7-logo.png'
            },
            data: {
                type: NOTIFICATION_TYPES.REMINDER,
                orderId,
                riderId,
                message: 'assignment_timeout'
            }
        };

        await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Authorization': `key=${process.env.REACT_APP_FCM_SERVER_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(timeoutPayload)
        });

        console.log('📨 Timeout notification sent to rider');
    } catch (error) {
        console.error('Error sending timeout notification:', error);
    }
};

/**
 * Send order update notification to customer
 */
export const sendCustomerUpdateNotification = async (customerId, orderUpdate) => {
    try {
        // This would send updates to customers about their GoBuy orders
        // Implementation depends on customer device token storage
        console.log('📱 Customer update notification:', orderUpdate);

        const updatePayload = {
            notification: {
                title: `🛍️ GoBuy Update: ${orderUpdate.status}`,
                body: orderUpdate.message,
                icon: '/go7-logo.png'
            },
            data: {
                type: NOTIFICATION_TYPES.DELIVERY_UPDATE,
                orderId: orderUpdate.orderId,
                status: orderUpdate.status,
                customerId
            }
        };

        // Send to customer (implementation would depend on customer token storage)
        console.log('Customer notification payload ready:', updatePayload);

        return { success: true };
    } catch (error) {
        console.error('Error sending customer notification:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Log notification in database for tracking
 */
export const logNotification = async (notificationData) => {
    try {
        await addDoc(collection(db, 'notifications'), {
            ...notificationData,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging notification:', error);
    }
};

/**
 * Handle notification responses (Accept/Decline buttons)
 */
export const handleNotificationResponse = async (response) => {
    try {
        const { orderId, riderId, action, data } = response;

        console.log(`📲 Notification response: ${action} for order ${orderId} by rider ${riderId}`);

        if (action === 'accept') {
            const { handleRiderAcceptance } = await import('./fleetService');
            await handleRiderAcceptance(orderId, riderId, true);

            return {
                success: true,
                message: 'Order accepted! Proceeding to shopping phase.',
                nextAction: 'navigate_to_order'
            };
        } else if (action === 'decline') {
            const { handleRiderAcceptance } = await import('./fleetService');
            await handleRiderAcceptance(orderId, riderId, false);

            return {
                success: true,
                message: 'Order declined. Looking for another rider.',
                nextAction: 'close_notification'
            };
        }

        return { success: false, error: 'Unknown action' };
    } catch (error) {
        console.error('Error handling notification response:', error);
        return { success: false, error: error.message };
    }
};

export default {
    sendAssignmentNotification,
    sendCustomerUpdateNotification,
    handleNotificationResponse,
    handleAssignmentTimeout,
    logNotification
};