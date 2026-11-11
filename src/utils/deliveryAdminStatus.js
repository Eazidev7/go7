/**
 * Admin labels for delivery statuses written by the GO7 rider app.
 * Keeps dispatch, orders, and bookings tabs in sync with customer tracking.
 */

export const ADMIN_STATUS_LABELS = {
  pending: 'Pending',
  searching_rider: 'Finding Rider',
  pending_dispatch: 'Pending Dispatch',
  assigned: 'Rider Assigned',
  accepted: 'Accepted',
  preparing: 'Preparing',
  enroute_pickup: 'En Route to Pickup',
  en_route_pickup: 'En Route to Pickup',
  heading_to_pickup: 'En Route to Pickup',
  at_pickup: 'At Pickup',
  arrived_at_pickup: 'At Pickup',
  picked_up: 'Picked Up',
  'picked-up': 'Picked Up',
  in_progress: 'On The Way',
  'in-progress': 'On The Way',
  in_transit: 'On The Way',
  'in-transit': 'On The Way',
  enroute: 'On The Way',
  enroute_dropoff: 'On The Way',
  on_the_way: 'On The Way',
  nearby: 'At Delivery',
  at_delivery: 'At Delivery',
  arriving: 'At Delivery',
  delivered: 'Delivered',
  completed: 'Delivered',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const ADMIN_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  searching_rider: 'bg-amber-100 text-amber-800',
  pending_dispatch: 'bg-amber-100 text-amber-800',
  assigned: 'bg-purple-100 text-purple-800',
  accepted: 'bg-blue-100 text-blue-800',
  preparing: 'bg-indigo-100 text-indigo-800',
  enroute_pickup: 'bg-sky-100 text-sky-800',
  en_route_pickup: 'bg-sky-100 text-sky-800',
  heading_to_pickup: 'bg-sky-100 text-sky-800',
  at_pickup: 'bg-cyan-100 text-cyan-800',
  arrived_at_pickup: 'bg-cyan-100 text-cyan-800',
  picked_up: 'bg-orange-100 text-orange-800',
  'picked-up': 'bg-orange-100 text-orange-800',
  in_progress: 'bg-teal-100 text-teal-800',
  'in-progress': 'bg-teal-100 text-teal-800',
  in_transit: 'bg-teal-100 text-teal-800',
  'in-transit': 'bg-teal-100 text-teal-800',
  enroute: 'bg-teal-100 text-teal-800',
  enroute_dropoff: 'bg-teal-100 text-teal-800',
  on_the_way: 'bg-teal-100 text-teal-800',
  nearby: 'bg-lime-100 text-lime-900',
  at_delivery: 'bg-lime-100 text-lime-900',
  arriving: 'bg-lime-100 text-lime-900',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-600',
};

/** Rider-action order for dispatch dropdowns */
export const ADMIN_DISPATCH_FLOW = [
  'pending',
  'searching_rider',
  'assigned',
  'enroute_pickup',
  'at_pickup',
  'picked_up',
  'in_progress',
  'nearby',
  'delivered',
  'cancelled',
];

export const ADMIN_ACTIVE_STATUSES = [
  'accepted',
  'preparing',
  'assigned',
  'enroute_pickup',
  'en_route_pickup',
  'heading_to_pickup',
  'at_pickup',
  'arrived_at_pickup',
  'picked_up',
  'picked-up',
  'in_progress',
  'in-progress',
  'in_transit',
  'in-transit',
  'enroute',
  'enroute_dropoff',
  'on_the_way',
  'nearby',
  'at_delivery',
  'arriving',
  'delivering',
];

export function normalizeAdminStatus(raw) {
  return String(raw || 'pending').toLowerCase().replace(/\s+/g, '_');
}

export function getAdminStatusLabel(status) {
  const key = normalizeAdminStatus(status);
  return ADMIN_STATUS_LABELS[key] || String(status || 'Unknown').replace(/_/g, ' ');
}

export function getAdminStatusColor(status) {
  const key = normalizeAdminStatus(status);
  return ADMIN_STATUS_COLORS[key] || 'bg-gray-100 text-gray-600';
}

export function isActiveDeliveryStatus(status) {
  const key = normalizeAdminStatus(status);
  return ADMIN_ACTIVE_STATUSES.includes(key);
}

export function isIncomingDeliveryStatus(status) {
  const key = normalizeAdminStatus(status);
  return ['pending', 'searching_rider', 'pending_dispatch'].includes(key);
}

/** Manual admin advance — mirrors rider flow where possible */
export const ADMIN_NEXT_STATUS = {
  pending: 'searching_rider',
  searching_rider: 'assigned',
  assigned: 'enroute_pickup',
  enroute_pickup: 'at_pickup',
  at_pickup: 'picked_up',
  picked_up: 'in_progress',
  in_progress: 'nearby',
  in_transit: 'nearby',
  nearby: 'delivered',
  accepted: 'assigned',
  preparing: 'assigned',
};
