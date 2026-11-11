/**
 * Shared rules for showing vendors on explore / homepage / search.
 */

import { resolveVendorImage } from './vendorImage';

/** Temporary public marketplace allowlist — only these vendors appear to customers. */
const PUBLIC_VENDOR_ALLOWLIST_IDS = new Set([
  'ngVhbo34siQTc8QuLG9Ur3MkRBv1', // Dalish Restaurant (current auth)
  '36cNFlp9C1bAooUqyHyqCCDvwVg1', // Dalish Restaurant (legacy id)
  '5IVcJjcE0GU5aq2gEOBemf7U2G22', // Tommy's place
  '3AN1jXZ7VBNqWIDobaP2JYbgb7d2', // Mama Tee Foodz & catering ventures
  'J1V28f0sSSMQ3RjJ8QGOokxqVQE3', // Sharp-Food
  '6GpUrJPqHzQNLzuiyQ8YpHwjdZo2', // Lami Foods
  'TCCCToZ96KOfGazCnUp3F8UVKP22', // Orombos Food Canteen
  'DHRa7xmdUjgACDGrfoXQyfgk7Tq2', // Sweet Sensation
  'j4zGWJ1KLHPRdutGbA2X24DaboN2', // Aveecol Ewagoyin
]);

const PUBLIC_VENDOR_ALLOWLIST_NAMES = new Set([
  'dalish restaurant',
  "tommy's place",
  'tommys place',
  'mama tee',
  'mama tee foodz & catering ventures',
  'sharp-food',
  'sharp food',
  'lami foods',
  'orombos food canteen',
  'sweet sensation',
  'aveecol ewagoyin',
]);

export function isVendorOnPublicAllowlist(vendorData = {}, vendorId = '') {
  if (!vendorData || typeof vendorData !== 'object') return false;

  const id = String(
    vendorId ||
      vendorData.id ||
      vendorData.vendorId ||
      vendorData.userId ||
      ''
  ).trim();
  if (id && PUBLIC_VENDOR_ALLOWLIST_IDS.has(id)) return true;

  const name = String(
    vendorData.businessName || vendorData.displayName || vendorData.name || ''
  )
    .trim()
    .toLowerCase()
    .replace(/['']/g, "'");
  return PUBLIC_VENDOR_ALLOWLIST_NAMES.has(name);
}

export function mapVendorDiscoveryFields(type = '') {
  const t = String(type).toLowerCase();
  if (
    t.includes('food') ||
    t.includes('restaurant') ||
    t.includes('pizza') ||
    t.includes('burger') ||
    t.includes('kitchen') ||
    t.includes('chicken') ||
    t.includes('eatery') ||
    t.includes('cafe') ||
    t.includes('meal')
  ) {
    return { vendorType: 'restaurant', businessType: 'food' };
  }
  if (
    t.includes('supermarket') ||
    t.includes('grocer') ||
    t.includes('grocery') ||
    t.includes('market') ||
    t.includes('mart') ||
    t.includes('fresh')
  ) {
    return { vendorType: 'groceries', businessType: 'groceries' };
  }
  if (
    t.includes('pharmacy') ||
    t.includes('pharma') ||
    t.includes('medic') ||
    t.includes('health')
  ) {
    return { vendorType: 'pharmacy', businessType: 'pharmacy' };
  }
  if (t.includes('errand')) {
    return { vendorType: 'errands', businessType: 'errands' };
  }
  if (
    t.includes('electron') ||
    t.includes('photo') ||
    t.includes('shop') ||
    t.includes('store') ||
    t.includes('retail') ||
    t.includes('studio')
  ) {
    return { vendorType: 'shops', businessType: 'shops' };
  }
  return { vendorType: 'shops', businessType: t || 'shops' };
}

export function isVendorExplicitlyHidden(vendorData = {}) {
  if (!vendorData || typeof vendorData !== 'object') return false;

  if (
    vendorData.accountStatus === 'suspended' ||
    vendorData.status === 'rejected' ||
    vendorData.status === 'inactive'
  ) {
    return false;
  }

  return true;
}

/**
 * Legacy seeded marketplace vendors can lack the newer approval workflow fields.
 * We only auto-show them when they also have active products.
 */
export function isLegacyMarketplaceVendor(vendorData = {}) {
  if (!vendorData || typeof vendorData !== 'object') return false;

  const workflowFields = [
    'accountStatus',
    'status',
    'approved',
    'isLive',
    'isActive',
    'active',
    'phoneVerified',
    'canReceiveOrders',
    'registrationComplete',
  ];

  return workflowFields.every((field) => vendorData[field] === undefined);
}

/** Show vendor when allowlisted OR fully admin-approved/live — phone verify alone is not enough */
export function isVendorPubliclyVisible(vendorData = {}, vendorId = '') {
  if (!vendorData || typeof vendorData !== 'object') return false;

  // Temporary allowlist still wins; otherwise show admin-approved live shops
  // (matches homepage copy: “Approved vendors appear here automatically”).
  if (!isVendorOnPublicAllowlist(vendorData, vendorId)) {
    const fullyApproved =
      (vendorData.status === 'approved' || vendorData.approved === true) &&
      vendorData.isLive === true &&
      vendorData.isActive !== false &&
      vendorData.active !== false &&
      vendorData.canReceiveOrders !== false &&
      vendorData.accountStatus !== 'suspended' &&
      vendorData.accountStatus !== 'pending_phone_verification' &&
      vendorData.accountStatus !== 'pending_approval';

    if (!fullyApproved) {
      return false;
    }
  }

  if (!isVendorExplicitlyHidden(vendorData)) {
    return false;
  }

  if (
    vendorData.status === 'approved' ||
    vendorData.approved === true ||
    vendorData.isLive === true
  ) {
    return true;
  }

  if (
    vendorData.isActive === true ||
    vendorData.active === true
  ) {
    return vendorData.canReceiveOrders !== false;
  }

  // Legacy seeded / marketplace vendors (no approval workflow fields)
  if (vendorData.acceptsOrders === true || vendorData.isOpen === true) {
    return true;
  }

  return false;
}

/** Customer-facing menu item is orderable */
export function isProductCustomerVisible(product = {}) {
  if (!product || typeof product !== 'object') return false;
  return (
    product.isActive !== false &&
    product.isAvailable !== false &&
    product.available !== false
  );
}

export function vendorMatchesCategory(vendor, categoryValue) {
  if (!categoryValue || categoryValue === 'all') return true;

  const values = [
    vendor.vendorType,
    vendor.businessType,
    vendor.type,
    ...(vendor.categories || []),
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());

  const matchMap = {
    restaurant: ['restaurant', 'food'],
    groceries: ['grocer', 'grocery', 'supermarket'],
    pharmacy: ['pharmacy', 'medic'],
    errands: ['errand'],
    shops: ['shop', 'store', 'retail', 'electron', 'photo'],
  };

  const needles = matchMap[categoryValue] || [categoryValue];
  return values.some((v) => needles.some((needle) => v.includes(needle)));
}

export function toVendorListingInfo(vendorDoc) {
  const vendorData = vendorDoc.data ? vendorDoc.data() : vendorDoc;
  const id = vendorDoc.id || vendorData.id || vendorData.vendorId;
  const name = vendorData.businessName || vendorData.displayName || vendorData.name;
  const discovery = mapVendorDiscoveryFields(vendorData.type || vendorData.businessType || vendorData.vendorType || name);

  const image = resolveVendorImage(vendorData);

  // Spread raw fields first, then force resolved listing fields last.
  return {
    ...vendorData,
    id,
    name: name || 'Vendor',
    businessName: vendorData.businessName || name,
    profileImage: image,
    businessLogo: image || (typeof vendorData.businessLogo === 'string' ? vendorData.businessLogo : null),
    imageUrl: image || (typeof vendorData.imageUrl === 'string' ? vendorData.imageUrl : null),
    image,
    rating: vendorData.rating ?? 4.5,
    deliveryTime: vendorData.deliveryTime || '30-45 mins',
    deliveryFee: vendorData.deliveryFee ?? 200,
    isOnline: vendorData.isOnline !== false,
    categories: vendorData.categories || [vendorData.businessType || vendorData.vendorType || discovery.businessType || 'food'],
    vendorType: vendorData.vendorType || discovery.vendorType,
    businessType: vendorData.businessType || discovery.businessType,
    type: vendorData.type,
    location: {
      address: vendorData.address || vendorData.location?.address || 'Abeokuta',
      coordinates: vendorData.coordinates || vendorData.location?.coordinates || {
        latitude: 7.1475,
        longitude: 3.3619,
      },
    },
  };
}
