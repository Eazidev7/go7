/**
 * Rider API functions for order management
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// Get callable functions
const riderRespond = httpsCallable(functions, 'riderRespond');

/**
 * Accept an assigned order
 * @param {string} orderId 
 * @param {string} riderId 
 * @returns {Promise<Object>} Response data
 */
export async function accept(orderId, riderId) {
  try {
    console.log(`Accepting order ${orderId} for rider ${riderId}`);
    
    const result = await riderRespond({
      orderId,
      riderId,
      action: 'accept'
    });

    console.log('Accept response:', result.data);
    return result.data;
  } catch (error) {
    console.error('Failed to accept order:', error);
    throw new Error(error.message || 'Failed to accept order');
  }
}

/**
 * Decline an assigned order
 * @param {string} orderId 
 * @param {string} riderId 
 * @param {string} reason - 'declined', 'timeout', etc.
 * @returns {Promise<Object>} Response data
 */
export async function decline(orderId, riderId, reason = 'declined') {
  try {
    console.log(`Declining order ${orderId} for rider ${riderId}, reason: ${reason}`);
    
    const result = await riderRespond({
      orderId,
      riderId,
      action: 'reject',
      reason
    });

    console.log('Decline response:', result.data);
    return result.data;
  } catch (error) {
    console.error('Failed to decline order:', error);
    throw new Error(error.message || 'Failed to decline order');
  }
}

/**
 * Update rider status to busy/completed
 * @param {string} orderId 
 * @param {string} riderId 
 * @param {string} status - 'picked_up', 'delivered', etc.
 * @returns {Promise<Object>} Response data
 */
export async function updateOrderStatus(orderId, riderId, status) {
  try {
    console.log(`Updating order ${orderId} status to ${status}`);
    
    const result = await riderRespond({
      orderId,
      riderId,
      action: 'update_status',
      status
    });

    console.log('Status update response:', result.data);
    return result.data;
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw new Error(error.message || 'Failed to update order status');
  }
}

// Aliases for compatibility
export const acceptOrder = accept;
export const declineOrder = decline;
