/**
 * Riders API service
 * 
 * This file contains functions to interact with the riders API
 */

// Base URL for the API
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Mock data for development
const MOCK_RIDERS = [
  {
    id: 'R1001',
    name: 'John Rider',
    phone: '08012345678',
    status: 'online',
    location: {
      latitude: 7.1475,
      longitude: 3.3619
    },
    rating: 4.8,
    totalTrips: 248,
    vehicle: {
      type: 'motorcycle',
      plateNumber: 'ABK-123XY'
    }
  },
  {
    id: 'R1002',
    name: 'Sarah Rider',
    phone: '08023456789',
    status: 'busy',
    location: {
      latitude: 7.1525,
      longitude: 3.3520
    },
    rating: 4.6,
    totalTrips: 183,
    vehicle: {
      type: 'motorcycle',
      plateNumber: 'ABK-456AB'
    }
  },
  {
    id: 'R1003',
    name: 'Mike Rider',
    phone: '08034567890',
    status: 'online',
    location: {
      latitude: 7.1400,
      longitude: 3.3700
    },
    rating: 4.9,
    totalTrips: 312,
    vehicle: {
      type: 'motorcycle',
      plateNumber: 'ABK-789CD'
    }
  },
  {
    id: 'R1004',
    name: 'Ada Rider',
    phone: '08045678901',
    status: 'offline',
    location: null,
    rating: 4.7,
    totalTrips: 156,
    vehicle: {
      type: 'motorcycle',
      plateNumber: 'ABK-234EF'
    }
  }
];

/**
 * Fetch all riders
 * @returns {Promise<Array>} Promise that resolves to an array of riders
 */
export const fetchRiders = async () => {
  // Check if we're in development mode (use mock data)
  if (import.meta.env.DEV) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(MOCK_RIDERS);
      }, 500);
    });
  }

  try {
    const response = await fetch(`${BASE_URL}/riders`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch riders: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching riders:', error);
    throw error;
  }
};

/**
 * Fetch a rider by ID
 * @param {string} riderId The ID of the rider to fetch
 * @returns {Promise<Object>} Promise that resolves to a rider object
 */
export const fetchRiderById = async (riderId) => {
  // Check if we're in development mode (use mock data)
  if (import.meta.env.DEV) {
    return new Promise(resolve => {
      setTimeout(() => {
        const rider = MOCK_RIDERS.find(r => r.id === riderId);
        if (rider) {
          resolve(rider);
        } else {
          throw new Error(`Rider with ID ${riderId} not found`);
        }
      }, 500);
    });
  }

  try {
    const response = await fetch(`${BASE_URL}/riders/${riderId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rider: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Error fetching rider ${riderId}:`, error);
    throw error;
  }
};

/**
 * Assign a booking to a rider
 * @param {string} bookingId The ID of the booking to assign
 * @param {string} riderId The ID of the rider to assign the booking to
 * @returns {Promise<Object>} Promise that resolves to the updated booking
 */
export const assignBookingToRider = async (bookingId, riderId) => {
  // Check if we're in development mode (use mock data)
  if (import.meta.env.DEV) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `Booking ${bookingId} assigned to rider ${riderId}`
        });
      }, 500);
    });
  }

  try {
    const response = await fetch(`${BASE_URL}/bookings/${bookingId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ riderId })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to assign booking: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error assigning booking to rider:', error);
    throw error;
  }
};

/**
 * Update rider status
 * @param {string} riderId The ID of the rider to update
 * @param {string} status The new status ('online', 'offline', 'busy')
 * @returns {Promise<Object>} Promise that resolves to the updated rider
 */
export const updateRiderStatus = async (riderId, status) => {
  // Check if we're in development mode (use mock data)
  if (import.meta.env.DEV) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `Rider ${riderId} status updated to ${status}`
        });
      }, 500);
    });
  }

  try {
    const response = await fetch(`${BASE_URL}/riders/${riderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update rider status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error updating rider status:', error);
    throw error;
  }
};
