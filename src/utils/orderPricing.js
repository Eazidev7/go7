/**
 * Order pricing — customer totals, rider delivery split, audit feeBreakdown.
 */
import {
  DEFAULT_PLATFORM_PRICING,
  ORDER_TYPES,
} from '../constants/platformPricing';
import { getActivePricingSettings } from './pricingSettings';

export function getPricingConfig(overrides = {}) {
  const fromFirestore = getActivePricingSettings();
  return {
    ...DEFAULT_PLATFORM_PRICING,
    platformFeeRateFood:
      fromFirestore.platformFeeRateFood ?? DEFAULT_PLATFORM_PRICING.platformFeeRateFood,
    platformFeeRateParcel:
      fromFirestore.platformFeeRateParcel ?? DEFAULT_PLATFORM_PRICING.platformFeeRateParcel,
    go7BikeRiderDeliveryShare:
      fromFirestore.go7BikeRiderDeliveryShare ?? DEFAULT_PLATFORM_PRICING.go7BikeRiderDeliveryShare,
    defaultRiderDeliveryShare:
      fromFirestore.defaultRiderDeliveryShare ?? DEFAULT_PLATFORM_PRICING.defaultRiderDeliveryShare,
    vendorCommissionRate:
      fromFirestore.vendorCommissionRate ?? DEFAULT_PLATFORM_PRICING.vendorCommissionRate,
    ...overrides,
  };
}

function roundNaira(amount) {
  return Math.round(Math.max(0, Number(amount) || 0));
}

export function calculateCustomerPlatformFee(orderType, { itemTotal = 0, deliveryFee = 0 }, config) {
  const cfg = config || getPricingConfig();
  const items = roundNaira(itemTotal);
  const delivery = roundNaira(deliveryFee);

  if (orderType === ORDER_TYPES.FOOD) {
    const rate = cfg.platformFeeRateFood;
    return {
      platformFee: roundNaira(items * rate),
      platformFeeRate: rate,
      platformFeeBasis: 'food_subtotal',
      platformFeeBasisAmount: items,
    };
  }

  const rate = cfg.platformFeeRateParcel;
  return {
    platformFee: roundNaira(delivery * rate),
    platformFeeRate: rate,
    platformFeeBasis: 'delivery_fee',
    platformFeeBasisAmount: delivery,
  };
}

export function buildCustomerOrderPricing(orderType, { itemTotal = 0, deliveryFee = 0 }, config) {
  const cfg = config || getPricingConfig();
  const items = roundNaira(itemTotal);
  const delivery = roundNaira(deliveryFee);
  const platform = calculateCustomerPlatformFee(orderType, { itemTotal: items, deliveryFee: delivery }, cfg);
  const grandTotal = items + delivery + platform.platformFee;

  return {
    orderType,
    itemTotal: items,
    deliveryFee: delivery,
    platformFee: platform.platformFee,
    platformFeeRate: platform.platformFeeRate,
    platformFeeBasis: platform.platformFeeBasis,
    platformFeeBasisAmount: platform.platformFeeBasisAmount,
    grandTotal,
    total: grandTotal,
    feeBreakdown: {
      itemTotal: items,
      deliveryFee: delivery,
      platformFee: platform.platformFee,
      platformFeeRate: platform.platformFeeRate,
      platformFeeBasis: platform.platformFeeBasis,
      grandTotal,
      pricingVersion: 1,
      calculatedAt: new Date().toISOString(),
    },
  };
}

export function buildFoodOrderPricing({ itemTotal = 0, deliveryFee = 0 }, config) {
  return buildCustomerOrderPricing(ORDER_TYPES.FOOD, { itemTotal, deliveryFee }, config);
}

export function buildParcelOrderPricing({ deliveryFee = 0, itemTotal = 0 }, config) {
  return buildCustomerOrderPricing(ORDER_TYPES.PARCEL, { itemTotal, deliveryFee }, config);
}

export function calculateRiderDeliverySplit(deliveryFee, rider = {}, config) {
  const cfg = config || getPricingConfig();
  const fee = roundNaira(deliveryFee);
  const usesGo7Bike =
    rider.go7OwnedVehicle === true || rider.usesGo7Bike === true;

  const riderShareRate = usesGo7Bike
    ? cfg.go7BikeRiderDeliveryShare
    : cfg.defaultRiderDeliveryShare;

  const riderPayout = roundNaira(fee * riderShareRate);
  const go7DeliveryShare = fee - riderPayout;

  return {
    deliveryFee: fee,
    riderPayout,
    go7DeliveryShare,
    riderDeliveryShareRate: riderShareRate,
    go7DeliveryShareRate: 1 - riderShareRate,
    usesGo7Bike,
    platformDeliveryShare: go7DeliveryShare,
    riderPercentage: riderShareRate * 100,
  };
}

export function attachOrderPricingFields(orderData, pricing, riderSplit = null) {
  const payload = {
    ...orderData,
    ...pricing,
    feeBreakdown: pricing.feeBreakdown,
  };

  if (riderSplit) {
    Object.assign(payload, riderSplit);
    payload.feeBreakdown = {
      ...pricing.feeBreakdown,
      riderPayout: riderSplit.riderPayout,
      go7DeliveryShare: riderSplit.go7DeliveryShare,
      riderDeliveryShareRate: riderSplit.riderDeliveryShareRate,
      usesGo7Bike: riderSplit.usesGo7Bike,
    };
  }

  return payload;
}

export function aggregatePlatformRevenue(orders = []) {
  const complete = orders.filter((o) =>
    ['delivered', 'completed', 'Delivered'].includes(o.status || o.orderStatus),
  );

  let platformFees = 0;
  let deliveryRevenue = 0;
  let riderPayouts = 0;
  let vendorCommissions = 0;
  let grossOrderVolume = 0;

  complete.forEach((o) => {
    const fb = o.feeBreakdown || {};
    platformFees += Number(o.platformFee ?? fb.platformFee ?? 0);
    deliveryRevenue += Number(o.go7DeliveryShare ?? fb.go7DeliveryShare ?? o.platformDeliveryShare ?? 0);
    riderPayouts += Number(o.riderPayout ?? fb.riderPayout ?? 0);
    vendorCommissions += Number(o.vendorCommissionAmount ?? 0);
    grossOrderVolume += Number(o.grandTotal ?? o.total ?? 0);
  });

  return {
    orderCount: complete.length,
    platformFees: roundNaira(platformFees),
    deliveryRevenue: roundNaira(deliveryRevenue),
    riderPayouts: roundNaira(riderPayouts),
    vendorCommissions: roundNaira(vendorCommissions),
    vendorWithdrawalFees: roundNaira(vendorCommissions),
    grossOrderVolume: roundNaira(grossOrderVolume),
    totalPlatformEarnings: roundNaira(platformFees + deliveryRevenue + vendorCommissions),
  };
}
