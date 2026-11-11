/**
 * Go7 platform pricing configuration — change rates here or via Firestore pricingSettings/current.
 */

export const DEFAULT_PLATFORM_PRICING = {
  platformFeeRateFood: 0.1,
  platformFeeRateParcel: 0.1,
  go7BikeRiderDeliveryShare: 0.5,
  defaultRiderDeliveryShare: 0.5,
  vendorCommissionRate: 0.08,
};

export const ORDER_TYPES = {
  FOOD: 'food',
  PARCEL: 'parcel',
  BOOK: 'book',
};
