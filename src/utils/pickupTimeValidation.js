// Pickup Time Validation Utility
// Validates scheduled pickup times according to business rules

/**
 * Validate pickup time according to business requirements:
 * - Must be >= current time
 * - Must not exceed 48 hours into the future
 * - Reject invalid times with clear error messages
 */
export function validatePickupTime(pickupTimeInput) {
  const now = new Date();
  const maxFutureTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now
  
  try {
    // Convert input to Date object
    const pickupTime = new Date(pickupTimeInput);
    
    // Check if the date is valid
    if (isNaN(pickupTime.getTime())) {
      return {
        isValid: false,
        error: 'Invalid date format. Please provide a valid date and time.'
      };
    }
    
    // Check if pickup time is in the past
    if (pickupTime < now) {
      return {
        isValid: false,
        error: 'Pickup time cannot be in the past. Please select a future time.'
      };
    }
    
    // Check if pickup time exceeds 48 hours
    if (pickupTime > maxFutureTime) {
      return {
        isValid: false,
        error: 'Pickup time cannot be more than 48 hours in the future. Please select an earlier time.'
      };
    }
    
    // Additional business rule: minimum 30 minutes from now for operational reasons
    const minTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    if (pickupTime < minTime) {
      return {
        isValid: false,
        error: 'Pickup time must be at least 30 minutes from now to allow for processing.'
      };
    }
    
    return {
      isValid: true,
      validatedTime: pickupTime
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: 'Error processing pickup time. Please check the date format.'
    };
  }
}

/**
 * Get human-readable time constraints for UI display
 */
export function getPickupTimeConstraints() {
  const now = new Date();
  const minTime = new Date(now.getTime() + 30 * 60 * 1000);
  const maxTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  return {
    earliest: minTime.toISOString().slice(0, 16), // Format for datetime-local input
    latest: maxTime.toISOString().slice(0, 16),
    description: 'Pickup time must be between 30 minutes from now and 48 hours in the future'
  };
}

/**
 * Format pickup time validation error for user display
 */
export function formatPickupTimeError(error) {
  const errorMessages = {
    past: '⏰ Pickup time cannot be in the past',
    tooFar: '📅 Pickup time cannot be more than 48 hours away',
    tooSoon: '🕐 Pickup time must be at least 30 minutes from now',
    invalid: '❌ Invalid date format'
  };
  
  if (error.includes('past')) return errorMessages.past;
  if (error.includes('48 hours')) return errorMessages.tooFar;
  if (error.includes('30 minutes')) return errorMessages.tooSoon;
  if (error.includes('Invalid date')) return errorMessages.invalid;
  
  return error; // Return original error if no match
}