/**
 * Delivery Status Service with Chat Integration
 * Handles delivery status updates and automatic chat notifications
 */

import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { enhancedChatService } from './enhancedChatService';

export class DeliveryStatusService {
  constructor() {
    this.statusTransitions = {
      'pending': ['assigned', 'cancelled'],
      'assigned': ['picked_up', 'cancelled'],
      'picked_up': ['in_transit', 'cancelled'],
      'in_transit': ['nearby', 'arrived', 'cancelled'],
      'nearby': ['arrived', 'cancelled'],
      'arrived': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };
  }

  /**
   * Update delivery status with automatic chat notification
   * @param {string} deliveryId - The delivery ID
   * @param {string} newStatus - New delivery status
   * @param {Object} statusData - Additional status data
   * @param {Object} location - Current location data
   * @returns {Promise<boolean>} Success status
   */
  async updateDeliveryStatus(deliveryId, newStatus, statusData = {}, location = null) {
    try {
      // Get current delivery data
      const deliveryRef = doc(db, 'deliveries', deliveryId);
      const deliveryDoc = await getDoc(deliveryRef);
      
      if (!deliveryDoc.exists()) {
        throw new Error('Delivery not found');
      }

      const currentDelivery = deliveryDoc.data();
      const currentStatus = currentDelivery.status;

      // Validate status transition
      if (!this.isValidStatusTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }

      // Prepare update data
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        statusHistory: [
          ...(currentDelivery.statusHistory || []),
          {
            status: newStatus,
            timestamp: serverTimestamp(),
            data: statusData
          }
        ]
      };

      // Add location if provided
      if (location) {
        updateData.currentLocation = location;
      }

      // Add status-specific data
      switch (newStatus) {
        case 'assigned':
          updateData.assignedAt = serverTimestamp();
          break;
        case 'picked_up':
          updateData.pickedUpAt = serverTimestamp();
          break;
        case 'in_transit':
          updateData.inTransitAt = serverTimestamp();
          break;
        case 'delivered':
          updateData.deliveredAt = serverTimestamp();
          if (statusData.proofOfDelivery) {
            updateData.proofOfDelivery = statusData.proofOfDelivery;
          }
          break;
        case 'cancelled':
          updateData.cancelledAt = serverTimestamp();
          updateData.cancellationReason = statusData.reason || 'No reason provided';
          break;
      }

      // Update delivery document
      await updateDoc(deliveryRef, updateData);

      // Send chat notification
      await this.sendStatusNotification(deliveryId, newStatus, statusData, location);

      console.log(`✅ Delivery ${deliveryId} status updated to: ${newStatus}`);
      return true;

    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Send status notification to chat
   * @param {string} deliveryId - The delivery ID
   * @param {string} status - New status
   * @param {Object} statusData - Status data
   * @param {Object} location - Location data
   */
  async sendStatusNotification(deliveryId, status, statusData = {}, location = null) {
    try {
      // Prepare enhanced status data
      const enhancedStatusData = {
        ...statusData,
        timestamp: new Date().toISOString()
      };

      // Add location info if available
      if (location) {
        enhancedStatusData.location = location;
      }

      // Add ETA if available
      if (statusData.estimatedArrival) {
        enhancedStatusData.estimatedArrival = statusData.estimatedArrival;
      }

      // Send status update to chat
      await enhancedChatService.sendDeliveryStatusUpdate(
        deliveryId,
        status,
        enhancedStatusData
      );

    } catch (error) {
      console.error('Error sending status notification:', error);
      // Don't throw here - status update should succeed even if chat fails
    }
  }

  /**
   * Validate status transition
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @returns {boolean} Is transition valid
   */
  isValidStatusTransition(currentStatus, newStatus) {
    if (!currentStatus) return newStatus === 'pending' || newStatus === 'assigned';
    
    const allowedTransitions = this.statusTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get next possible statuses
   * @param {string} currentStatus - Current status
   * @returns {Array<string>} Possible next statuses
   */
  getNextPossibleStatuses(currentStatus) {
    return this.statusTransitions[currentStatus] || [];
  }

  /**
   * Update rider location and notify if nearby
   * @param {string} deliveryId - The delivery ID
   * @param {Object} location - Rider location {lat, lng, address}
   * @param {string} riderId - Rider ID
   */
  async updateRiderLocation(deliveryId, location, riderId) {
    try {
      // Get delivery data
      const deliveryRef = doc(db, 'deliveries', deliveryId);
      const deliveryDoc = await getDoc(deliveryRef);
      
      if (!deliveryDoc.exists()) {
        throw new Error('Delivery not found');
      }

      const delivery = deliveryDoc.data();

      // Verify rider is assigned to this delivery
      if (delivery.riderId !== riderId) {
        throw new Error('Rider not assigned to this delivery');
      }

      // Update rider location
      await updateDoc(deliveryRef, {
        riderLocation: location,
        lastLocationUpdate: serverTimestamp()
      });

      // Check if rider is nearby (within 1km)
      if (delivery.deliveryAddress && location.lat && location.lng) {
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          delivery.deliveryAddress.lat,
          delivery.deliveryAddress.lng
        );

        // If nearby and status allows, update to nearby
        if (distance <= 1.0 && delivery.status === 'in_transit') {
          await this.updateDeliveryStatus(
            deliveryId,
            'nearby',
            {
              distance: distance,
              estimatedArrival: '2-5 minutes'
            },
            location
          );
        }
      }

    } catch (error) {
      console.error('Error updating rider location:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} Radians
   */
  degToRad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Send proof of delivery with image
   * @param {string} deliveryId - The delivery ID
   * @param {Object} proofData - Proof of delivery data
   */
  async submitProofOfDelivery(deliveryId, proofData) {
    try {
      await this.updateDeliveryStatus(
        deliveryId,
        'delivered',
        {
          proofOfDelivery: {
            timestamp: new Date().toISOString(),
            ...proofData
          }
        }
      );

      // Send confirmation message to chat
      await enhancedChatService.sendMessage(
        deliveryId,
        '📸 Proof of delivery submitted. Thank you for choosing GO7!',
        'system', // This would need to be updated based on your participant logic
        {
          messageType: 'system',
          systemMessageType: 'proof_of_delivery'
        }
      );

    } catch (error) {
      console.error('Error submitting proof of delivery:', error);
      throw error;
    }
  }

  /**
   * Get delivery status history
   * @param {string} deliveryId - The delivery ID
   * @returns {Promise<Array>} Status history
   */
  async getStatusHistory(deliveryId) {
    try {
      const deliveryRef = doc(db, 'deliveries', deliveryId);
      const deliveryDoc = await getDoc(deliveryRef);
      
      if (!deliveryDoc.exists()) {
        throw new Error('Delivery not found');
      }

      return deliveryDoc.data().statusHistory || [];
    } catch (error) {
      console.error('Error getting status history:', error);
      return [];
    }
  }

  /**
   * Cancel delivery with reason
   * @param {string} deliveryId - The delivery ID
   * @param {string} reason - Cancellation reason
   * @param {string} cancelledBy - Who cancelled (customer, rider, admin)
   */
  async cancelDelivery(deliveryId, reason, cancelledBy) {
    try {
      await this.updateDeliveryStatus(
        deliveryId,
        'cancelled',
        {
          reason: reason,
          cancelledBy: cancelledBy,
          timestamp: new Date().toISOString()
        }
      );

      console.log(`❌ Delivery ${deliveryId} cancelled by ${cancelledBy}: ${reason}`);
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const deliveryStatusService = new DeliveryStatusService();