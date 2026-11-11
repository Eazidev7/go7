/** Customer-facing copy for booking / order activity toasts + inbox. */

export const ACTIVITY_TOAST_COPY = {
  finding_shopper: {
    title: 'Finding a rider',
    message: 'We received your booking and are assigning a rider.',
  },
  confirmed: {
    title: 'Order confirmed',
    message: 'Your order was accepted and is being prepared.',
  },
  preparing: {
    title: 'Preparing your order',
    message: 'The vendor has started preparing your order.',
  },
  'ready-for-pickup': {
    title: 'Ready for pickup',
    message: 'Your order is ready. Waiting for the rider.',
  },
  'rider-assigned': {
    title: 'Rider assigned',
    message: 'A rider is heading to pick up your order.',
  },
  'en-route-pickup': {
    title: 'Rider en route to pickup',
    message: 'Your rider is on the way to collect your package.',
  },
  'at-pickup': {
    title: 'Rider at pickup',
    message: 'Your rider has arrived at the pickup location.',
  },
  'picked-up': {
    title: 'Package picked up',
    message: 'Your package is on the way to you.',
  },
  'on-the-way': {
    title: 'Rider en route',
    message: 'Your rider is on the way to your location.',
  },
  nearby: {
    title: 'Rider nearby',
    message: 'Your rider is close — get ready with your delivery PIN.',
  },
  delivered: {
    title: 'Delivered',
    message: 'Your delivery is complete. Thanks for using GO7!',
  },
  shopping: {
    title: 'Shopping in progress',
    message: 'Your shopper is buying your items now.',
  },
  'shopper-assigned': {
    title: 'Shopper assigned',
    message: 'A shopper has been assigned to your GoBuy request.',
  },
};

/** Map UI/toast status → NotificationsPage preference key */
export function preferenceKeyForStatus(mappedStatus) {
  switch (mappedStatus) {
    case 'confirmed':
    case 'finding_shopper':
    case 'shopper-assigned':
      return 'orderConfirmed';
    case 'preparing':
    case 'ready-for-pickup':
    case 'shopping':
      return 'orderPreparing';
    case 'rider-assigned':
    case 'en-route-pickup':
    case 'at-pickup':
    case 'picked-up':
    case 'on-the-way':
    case 'nearby':
      return 'orderOnTheWay';
    case 'delivered':
      return 'orderDelivered';
    case 'cancelled':
      return 'orderCancelled';
    default:
      return 'orderConfirmed';
  }
}

export const DEFAULT_NOTIF_PREFS = {
  orderConfirmed: true,
  orderPreparing: true,
  orderOnTheWay: true,
  orderDelivered: true,
  orderCancelled: true,
  paymentSuccess: true,
  paymentFailed: true,
  refundProcessed: true,
  walletTopUp: true,
  pushEnabled: true,
  soundEnabled: true,
};

export const NOTIF_PREFS_KEY = 'go7-customer-notif-prefs';

export function loadNotifPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY);
    if (!raw) return { ...DEFAULT_NOTIF_PREFS };
    return { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export function saveNotifPrefs(prefs) {
  try {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ ...DEFAULT_NOTIF_PREFS, ...prefs }));
  } catch {
    /* ignore */
  }
}

const TOAST_DEDUPE_PREFIX = 'go7-activity-toast:';
const TOAST_DEDUPE_MS = 45_000;

/** Returns true if this status toast should show (first time in window). */
export function claimActivityToastSlot(orderId, status) {
  const key = `${TOAST_DEDUPE_PREFIX}${orderId}:${status}`;
  try {
    const raw = sessionStorage.getItem(key);
    const now = Date.now();
    if (raw && now - Number(raw) < TOAST_DEDUPE_MS) return false;
    sessionStorage.setItem(key, String(now));
    return true;
  } catch {
    return true;
  }
}
