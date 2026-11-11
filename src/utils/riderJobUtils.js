/** Shared helpers for rider job screens (coords, phones, freshness). */

const TERMINAL_STATUSES = new Set([
  'delivered', 'cancelled', 'completed', 'failed', 'rejected', 'rated',
]);

const ACTIVE_STATUSES = new Set([
  'assigned', 'accepted', 'picked_up', 'in_transit', 'delivering', 'in_progress',
  'arrived_pickup', 'picked', 'enroute', 'arrived_dropoff', 'en_route', 'pickup',
]);

export const STALE_JOB_MS = 6 * 60 * 60 * 1000;

export function getJobStatus(job) {
  return String(job?.status || job?.orderStatus || job?.dispatchStatus || '').toLowerCase();
}

export function isTerminalJob(job) {
  return TERMINAL_STATUSES.has(getJobStatus(job));
}

export function isActiveJob(job) {
  return ACTIVE_STATUSES.has(getJobStatus(job));
}

export function getJobUpdatedAt(job) {
  const raw =
    job?.updatedAt?.toMillis?.() ??
    job?.acceptedAt?.toMillis?.() ??
    job?.createdAt?.toMillis?.() ??
    job?.updatedAt ??
    job?.acceptedAt ??
    job?.createdAt ??
    0;
  return typeof raw === 'number' ? raw : 0;
}

export function isStaleJob(job, maxAgeMs = STALE_JOB_MS) {
  const updated = getJobUpdatedAt(job);
  if (!updated) return false;
  return Date.now() - updated > maxAgeMs;
}

export function pickCoords(job, kind) {
  if (!job) return null;

  const toCoord = (lat, lng) => {
    if (lat == null || lng == null) return null;
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
    return { lat: la, lng: ln };
  };

  const fromObject = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    return toCoord(
      obj.lat ?? obj.latitude,
      obj.lng ?? obj.longitude,
    );
  };

  if (kind === 'pickup') {
    return (
      fromObject(job.pickupLocation) ||
      fromObject(job.pickupCoords) ||
      fromObject(job.pickup) ||
      fromObject(job.vendorLocation) ||
      fromObject(job.vendorCoords) ||
      (typeof job.pickupAddress === 'object' ? fromObject(job.pickupAddress) : null) ||
      (Array.isArray(job.pickup) && job.pickup.length >= 2
        ? toCoord(job.pickup[1], job.pickup[0])
        : null) ||
      (job.pickup?.coordinates?.length >= 2
        ? toCoord(job.pickup.coordinates[1], job.pickup.coordinates[0])
        : null)
    );
  }

  return (
    fromObject(job.dropoffLocation) ||
    fromObject(job.dropoffCoords) ||
    fromObject(job.dropoff) ||
    toCoord(job.customerLat, job.customerLng) ||
    fromObject(job.deliveryAddress) ||
    fromObject(job.deliveryAddress?.coordinates) ||
    (typeof job.dropoffAddress === 'object' ? fromObject(job.dropoffAddress) : null) ||
    (Array.isArray(job.dropoff) && job.dropoff.length >= 2
      ? toCoord(job.dropoff[1], job.dropoff[0])
      : null) ||
    (job.dropoff?.coordinates?.length >= 2
      ? toCoord(job.dropoff.coordinates[1], job.dropoff.coordinates[0])
      : null)
  );
}

function toPhoneString(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    return toPhoneString(value.phone || value.phoneNumber || value.contactPhone);
  }
  return '';
}

export function getPickupPhone(job) {
  return (
    toPhoneString(job?.senderPhone) ||
    toPhoneString(job?.sender?.phone) ||
    toPhoneString(job?.customerPhone) ||
    toPhoneString(job?.pickupPhone) ||
    ''
  );
}

export function getDropoffPhone(job) {
  return (
    toPhoneString(job?.recipientPhone) ||
    toPhoneString(job?.recipient?.phone) ||
    toPhoneString(job?.dropoffPhone) ||
    ''
  );
}

function toAddressString(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    return toAddressString(value.fullAddress || value.address || value.formatted_address);
  }
  return '';
}

export function getPickupLabel(job) {
  return (
    toAddressString(job?.pickupAddress) ||
    toAddressString(job?.vendorAddress) ||
    toAddressString(job?.pickup?.address) ||
    toAddressString(job?.sender?.address) ||
    'Pickup location'
  );
}

export function getDropoffLabel(job) {
  return (
    toAddressString(job?.dropoffAddress) ||
    toAddressString(job?.deliveryAddress) ||
    toAddressString(job?.customerAddress) ||
    toAddressString(job?.dropoff?.address) ||
    toAddressString(job?.recipient?.address) ||
    'Customer location'
  );
}

function toNameString(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    return toNameString(value.name || value.productName || value.title || value.itemName);
  }
  return '';
}

function itemDisplayName(item = {}) {
  if (typeof item === 'string') return item;
  return (
    toNameString(item.name) ||
    toNameString(item.productName) ||
    toNameString(item.title) ||
    toNameString(item.itemName) ||
    toNameString(item.product?.name) ||
    'Item'
  );
}

function itemQuantity(item = {}) {
  if (typeof item === 'string') return 1;
  const q = Number(item.quantity ?? item.qty ?? item.count);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

/** Normalize food/package line items from an order/job doc. */
export function getJobLineItems(job) {
  if (!job) return [];
  if (Array.isArray(job.items) && job.items.length) {
    return job.items.filter(Boolean);
  }
  if (job.vendorOrders && typeof job.vendorOrders === 'object') {
    return Object.values(job.vendorOrders).flatMap((v) =>
      Array.isArray(v?.items) ? v.items : []
    );
  }
  if (job.itemName) {
    return [{ name: job.itemName, quantity: 1 }];
  }
  if (job.packageDescription || job.packageDetails) {
    const desc =
      typeof job.packageDescription === 'string'
        ? job.packageDescription
        : typeof job.packageDetails === 'string'
          ? job.packageDetails
          : job.packageDetails?.description || job.packageType;
    if (desc) return [{ name: desc, quantity: 1 }];
  }
  return [];
}

export function formatJobItemLine(item) {
  if (typeof item === 'string') return item;
  const qty = itemQuantity(item);
  const name = String(itemDisplayName(item)).trim();
  const addons = item.addons || item.addOns || item.selectedAddons || [];
  const addonNames = Array.isArray(addons)
    ? addons
        .map((a) => {
          if (!a) return null;
          if (typeof a === 'string') return a;
          return a.name || a.title || a.label || null;
        })
        .filter(Boolean)
    : [];
  let line = qty > 1 ? `${qty}× ${name}` : name;
  if (addonNames.length) line += ` (${addonNames.join(', ')})`;
  return line;
}

/** Short summary for job cards / push bodies. */
export function formatJobItemsSummary(job, { maxItems = 4, maxLen = 120 } = {}) {
  const items = getJobLineItems(job);
  if (!items.length) return '';
  const shown = items.slice(0, maxItems).map(formatJobItemLine);
  let text = shown.join(', ');
  if (items.length > maxItems) text += ` +${items.length - maxItems} more`;
  if (text.length > maxLen) text = `${text.slice(0, maxLen - 1)}…`;
  return text;
}

export function getJobTypeLabel(job) {
  if (!job) return 'Delivery';
  const t = String(job.orderType || job.type || job.serviceType || '').toLowerCase();
  if (['fuel', 'cng', 'fuel_order'].includes(t)) {
    return job.fuelType === 'cng' ? 'CNG Delivery' : 'Fuel Delivery';
  }
  if (['food', 'restaurant', 'meal', 'vendor', 'food_order'].includes(t)) return 'Food Order';
  if (['gobuy', 'go_buy'].includes(t)) return 'GoBuy';
  if (getJobLineItems(job).length && (job.vendorId || job.vendorName)) return 'Food Order';
  return job.packageType || 'Package Delivery';
}

/** Opens turn-by-turn navigation in the Google Maps app / website. */
export function buildGoogleMapsNavUrl(origin, destination, destinationAddress) {
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' });
  if (origin?.lat != null && origin?.lng != null) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }
  if (destination?.lat != null && destination?.lng != null) {
    params.set('destination', `${destination.lat},${destination.lng}`);
  } else if (destinationAddress) {
    params.set('destination', destinationAddress);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Launch Google Maps navigation (opens native app on mobile). */
export function openGoogleMapsNavigation(origin, destination, destinationAddress) {
  const url = buildGoogleMapsNavUrl(origin, destination, destinationAddress);
  if (!url.includes('destination=')) return false;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return true;
}
