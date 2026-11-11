/**
 * 🕒 VENDOR AVAILABILITY SERVICE
 * Check if vendor is available based on days, hours, and temporary closure
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Check if vendor is currently available
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<{available: boolean, reason?: string, nextAvailable?: string}>}
 */
export const checkVendorAvailability = async (vendorId) => {
  try {
    const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
    
    if (!vendorDoc.exists()) {
      return {
        available: false,
        reason: 'Vendor not found'
      };
    }

    const vendor = vendorDoc.data();

    // 1. Check if vendor is temporarily closed
    if (vendor.isTemporarilyClosed) {
      return {
        available: false,
        reason: 'Vendor is temporarily closed'
      };
    }

    // 2. Check if vendor is online
    if (!vendor.isOnline) {
      return {
        available: false,
        reason: 'Vendor is currently offline'
      };
    }

    // 3. Check day availability
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    const availableDays = vendor.availableDays || [];
    if (!availableDays.includes(currentDay)) {
      const nextDay = getNextAvailableDay(availableDays, currentDay);
      return {
        available: false,
        reason: `Vendor is closed on ${currentDay}`,
        nextAvailable: nextDay
      };
    }

    // 4. Check time availability
    const availableHours = vendor.availableHours || { start: '00:00', end: '23:59' };
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    if (currentTime < availableHours.start || currentTime > availableHours.end) {
      return {
        available: false,
        reason: `Vendor operates ${availableHours.start} - ${availableHours.end}`,
        nextAvailable: availableHours.start
      };
    }

    // All checks passed - vendor is available
    return {
      available: true
    };

  } catch (error) {
    console.error('❌ Error checking vendor availability:', error);
    return {
      available: false,
      reason: 'Error checking availability'
    };
  }
};

/**
 * Get next available day for a vendor
 * @param {Array<string>} availableDays - Array of available day names
 * @param {string} currentDay - Current day name
 * @returns {string} Next available day
 */
const getNextAvailableDay = (availableDays, currentDay) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentIndex = daysOfWeek.indexOf(currentDay);
  
  for (let i = 1; i <= 7; i++) {
    const nextIndex = (currentIndex + i) % 7;
    const nextDay = daysOfWeek[nextIndex];
    if (availableDays.includes(nextDay)) {
      return nextDay;
    }
  }
  
  return 'Not available';
};

/**
 * Check if current time is within vendor hours
 * @param {Object} availableHours - {start: 'HH:MM', end: 'HH:MM'}
 * @returns {boolean}
 */
export const isWithinVendorHours = (availableHours) => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  
  return currentTime >= availableHours.start && currentTime <= availableHours.end;
};

/**
 * Format availability hours for display
 * @param {Object} availableHours - {start: 'HH:MM', end: 'HH:MM'}
 * @returns {string} Formatted time range
 */
export const formatAvailabilityHours = (availableHours) => {
  if (!availableHours) return '24/7';
  
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return `${formatTime(availableHours.start)} - ${formatTime(availableHours.end)}`;
};

/**
 * Get vendor availability status text
 * @param {Object} vendor - Vendor document data
 * @returns {string} Status text
 */
export const getVendorStatusText = (vendor) => {
  if (vendor.isTemporarilyClosed) {
    return 'Temporarily Closed';
  }
  
  if (!vendor.isOnline) {
    return 'Offline';
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.toTimeString().slice(0, 5);
  
  const availableDays = vendor.availableDays || [];
  const availableHours = vendor.availableHours || { start: '00:00', end: '23:59' };
  
  if (!availableDays.includes(currentDay)) {
    return `Closed today (${currentDay})`;
  }
  
  if (currentTime < availableHours.start) {
    return `Opens at ${formatAvailabilityHours({ start: availableHours.start, end: availableHours.start }).split(' - ')[0]}`;
  }
  
  if (currentTime > availableHours.end) {
    return `Closed for today`;
  }
  
  return 'Open Now';
};

/**
 * Validate availability hours
 * @param {string} start - Start time HH:MM
 * @param {string} end - End time HH:MM
 * @returns {boolean}
 */
export const validateAvailabilityHours = (start, end) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(start) || !timeRegex.test(end)) {
    return false;
  }
  
  return start < end;
};

export default {
  checkVendorAvailability,
  isWithinVendorHours,
  formatAvailabilityHours,
  getVendorStatusText,
  validateAvailabilityHours
};
