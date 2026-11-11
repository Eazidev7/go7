/**
 * Type definitions for Go7 Delivery App
 * JavaScript version - converted from TypeScript
 */

/**
 * Helper to create a DeliveryEvent
 */
export const createDeliveryEvent = (
  status,
  note,
  location
) => {
  return {
    ts: new Date(),
    status,
    note,
    location
  };
};

/**
 * Helper to add an event to a DeliveryLive object
 */
export const addDeliveryEvent = (
  delivery,
  event
) => {
  return {
    ...delivery,
    events: [...(delivery.events || []), event],
    status: event.status,
    updatedAt: new Date()
  };
};

// Export default for convenience
export default {
  createDeliveryEvent,
  addDeliveryEvent
};