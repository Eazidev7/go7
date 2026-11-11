/**
 * Bookings API service for Go7
 * Provides mock API functionality to manage bookings
 */

// In-memory storage for bookings
const bookings = [];

// Status progression for deliveries
const STATUS_PROGRESSION = [
  'assigned',
  'enroute_pickup',
  'picked_up',
  'enroute_dropoff',
  'delivered'
];

// Generate a unique booking ID
const generateBookingId = () => {
  const timestamp = Date.now();
  return `GO7-${timestamp}`;
};

// Add a new booking
export const createBooking = (bookingData) => {
  const id = bookingData.id || generateBookingId();
  
  const booking = {
    id,
    jobId: id, // Ensure jobId matches id for consistency
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: bookingData.status || 'assigned',
    timeline: [
      {
        status: 'created',
        timestamp: new Date().toISOString(),
        description: 'Booking created'
      },
      {
        status: 'assigned',
        timestamp: new Date().toISOString(),
        description: `Assigned to ${bookingData.rider?.name || 'rider'}`
      }
    ],
    ...bookingData
  };
  
  // Add to bookings array
  bookings.push(booking);
  
  // Also store in localStorage for persistence
  localStorage.setItem('go7:bookings', JSON.stringify(bookings));
  
  return booking;
};

// Get a booking by ID
export const getBookingById = (id) => {
  // Check in-memory array first
  let booking = bookings.find(b => b.id === id || b.jobId === id);
  
  // If not found, try to load from localStorage
  if (!booking) {
    try {
      const storedBookings = localStorage.getItem('go7:bookings');
      if (storedBookings) {
        const parsedBookings = JSON.parse(storedBookings);
        booking = parsedBookings.find(b => b.id === id || b.jobId === id);
        
        // Update in-memory array if found
        if (booking && !bookings.some(b => b.id === booking.id)) {
          bookings.push(...parsedBookings);
        }
      }
    } catch (error) {
      console.error('Error loading bookings from localStorage:', error);
    }
  }
  
  return booking;
};

// Update a booking
export const updateBooking = (id, updatedData) => {
  const index = bookings.findIndex(b => b.id === id || b.jobId === id);
  
  if (index === -1) {
    return null;
  }
  
  bookings[index] = {
    ...bookings[index],
    ...updatedData,
    updatedAt: new Date().toISOString()
  };
  
  // Update localStorage
  localStorage.setItem('go7:bookings', JSON.stringify(bookings));
  
  return bookings[index];
};

/**
 * Update a booking's status to the next in progression (ping)
 * @param {string} id - The booking ID
 * @returns {Object|null} The updated booking or null if not found
 */
export const pingBookingStatus = (id) => {
  const booking = getBookingById(id);
  
  if (!booking) {
    return null;
  }
  
  // Find current status index
  const currentStatusIndex = STATUS_PROGRESSION.indexOf(booking.status);
  
  // If current status is the last one or not found, do nothing
  if (currentStatusIndex === -1 || currentStatusIndex === STATUS_PROGRESSION.length - 1) {
    return booking;
  }
  
  // Get the next status
  const nextStatus = STATUS_PROGRESSION[currentStatusIndex + 1];
  
  // Add to timeline
  const timeline = booking.timeline || [];
  timeline.push({
    status: nextStatus,
    timestamp: new Date().toISOString(),
    description: getStatusDescription(nextStatus, booking)
  });
  
  // Update booking with new status and timeline
  return updateBooking(id, { 
    status: nextStatus,
    timeline
  });
};

/**
 * Get a description for a status
 * @param {string} status - The status
 * @param {Object} booking - The booking object
 * @returns {string} A description of the status
 */
const getStatusDescription = (status, booking) => {
  const riderName = booking.rider?.name || 'Rider';
  
  switch (status) {
    case 'assigned':
      return `${riderName} has been assigned to your delivery`;
    case 'enroute_pickup':
      return `${riderName} is on the way to pickup location`;
    case 'picked_up':
      return `${riderName} has picked up your package from ${booking.pickup?.address || 'pickup location'}`;
    case 'enroute_dropoff':
      return `${riderName} is on the way to delivery location`;
    case 'delivered':
      return `${riderName} has delivered your package to ${booking.dropoff?.address || 'delivery location'}`;
    default:
      return `Status updated to ${status}`;
  }
};

// Get all bookings
export const getAllBookings = () => {
  // Try to load from localStorage first to ensure persistence
  try {
    const storedBookings = localStorage.getItem('go7:bookings');
    if (storedBookings) {
      const parsedBookings = JSON.parse(storedBookings);
      
      // Update in-memory array
      if (parsedBookings.length > bookings.length) {
        // Clear and re-populate to avoid duplicates
        bookings.length = 0;
        bookings.push(...parsedBookings);
      }
    }
  } catch (error) {
    console.error('Error loading bookings from localStorage:', error);
  }
  
  return bookings;
};

// Delete a booking
export const deleteBooking = (id) => {
  const index = bookings.findIndex(b => b.id === id || b.jobId === id);
  
  if (index === -1) {
    return false;
  }
  
  bookings.splice(index, 1);
  
  // Update localStorage
  localStorage.setItem('go7:bookings', JSON.stringify(bookings));
  
  return true;
};

// Initialize from localStorage on load
const init = () => {
  try {
    const storedBookings = localStorage.getItem('go7:bookings');
    if (storedBookings) {
      const parsedBookings = JSON.parse(storedBookings);
      bookings.push(...parsedBookings);
    }
  } catch (error) {
    console.error('Error initializing bookings from localStorage:', error);
  }
};

// Initialize on module load
init();

// Alias for getAllBookings for compatibility
export const fetchBookings = getAllBookings;

export default {
  createBooking,
  getBookingById,
  updateBooking,
  getAllBookings,
  fetchBookings,
  deleteBooking,
  pingBookingStatus
};
