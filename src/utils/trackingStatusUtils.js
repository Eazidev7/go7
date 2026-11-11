/** Extract rider GPS from booking/order documents (rider app writes several shapes). */
export function extractRiderLocation(data) {
  if (!data) return null;

  const candidates = [
    data.riderLocation,
    data.rider?.location,
    data.rider?.currentLocation,
    data.currentLocation,
    data.lastKnownLocation,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const lat = Number(raw.lat ?? raw.latitude);
    const lng = Number(raw.lng ?? raw.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, latitude: lat, longitude: lng };
    }
  }

  return null;
}

/** Map Firestore status → customer tracking UI status. */
export function mapFirestoreToTrackingStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/\s+/g, '_');

  if (['pending', 'searching_rider', 'pending_dispatch', 'finding_shopper', 'requested', 'pending_payment'].includes(s)) {
    return 'finding_shopper';
  }
  if (['shopping'].includes(s)) {
    return 'shopping';
  }
  if (['shopper_assigned', 'shopper-assigned'].includes(s)) {
    return 'shopper-assigned';
  }
  if (['confirmed'].includes(s)) {
    return 'confirmed';
  }
  if (['preparing', 'in_kitchen'].includes(s)) {
    return 'preparing';
  }
  if (['ready_for_pickup', 'ready-for-pickup', 'ready'].includes(s)) {
    return 'ready-for-pickup';
  }
  if (['assigned', 'accepted', 'rider_assigned', 'rider-assigned'].includes(s)) {
    return 'rider-assigned';
  }
  if (['enroute_pickup', 'en_route_pickup', 'heading_to_pickup', 'going_to_pickup'].includes(s)) {
    return 'en-route-pickup';
  }
  if (['at_pickup', 'arrived_at_pickup', 'arrived_pickup', 'at-pickup'].includes(s)) {
    return 'at-pickup';
  }
  if (['picked_up', 'picked-up', 'pickup_complete', 'picked'].includes(s)) {
    return 'picked-up';
  }
  if (['enroute', 'enroute_dropoff', 'in_transit', 'in-transit', 'on_the_way', 'on-the-way', 'in_progress', 'in-progress', 'going_to_delivery', 'out_for_delivery', 'delivering', 'active'].includes(s)) {
    return 'on-the-way';
  }
  if (['nearby', 'arriving', 'at_delivery', 'at-delivery', 'arrived_dropoff', 'arrived_at_delivery', 'arrived_delivery'].includes(s)) {
    return 'nearby';
  }
  if (['delivered'].includes(s)) {
    return 'delivered';
  }
  if (['completed'].includes(s)) {
    return 'delivered';
  }

  return 'finding_shopper';
}

export function mapToTimelineStatus(trackingStatus) {
  const map = {
    finding_shopper: 'assigned',
    confirmed: 'assigned',
    preparing: 'assigned',
    'ready-for-pickup': 'assigned',
    'rider-assigned': 'assigned',
    'en-route-pickup': 'en-route-pickup',
    'at-pickup': 'en-route-pickup',
    'picked-up': 'picked-up',
    'on-the-way': 'en-route-dropoff',
    nearby: 'en-route-dropoff',
    delivered: 'delivered',
  };
  return map[trackingStatus] || 'assigned';
}

export const TRACKING_STATUS_LABELS = {
  finding_shopper: 'Searching for riders near you…',
  confirmed: 'Order confirmed — vendor is preparing',
  preparing: 'Your order is being prepared',
  'ready-for-pickup': 'Ready for rider pickup',
  'rider-assigned': 'Rider assigned — heading to pickup',
  'en-route-pickup': 'Rider is on the way to pickup',
  'at-pickup': 'Rider has arrived at pickup',
  'picked-up': 'Package picked up',
  'on-the-way': 'On the way to you',
  nearby: 'Rider is nearby — share your delivery PIN',
  delivered: 'Delivered',
};

/** Rank for preventing coarse GPS statuses from regressing fine rider lifecycle steps. */
export const TRACKING_STATUS_RANK = {
  finding_shopper: 0,
  confirmed: 1,
  preparing: 2,
  'ready-for-pickup': 3,
  shopping: 3,
  'shopper-assigned': 3,
  'rider-assigned': 4,
  'en-route-pickup': 5,
  'at-pickup': 6,
  'picked-up': 7,
  'on-the-way': 8,
  nearby: 9,
  delivered: 10,
};

export function trackingStatusRank(status) {
  return TRACKING_STATUS_RANK[status] ?? 0;
}

/** Coarse GPS / deliveryTracking values that must not wipe a finer order status. */
export function isCoarseTrackingStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/\s+/g, '_');
  return ['delivering', 'active', 'in_progress', 'in-progress'].includes(s);
}
