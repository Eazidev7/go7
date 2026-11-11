/**
 * Delivery fee split — delegates to centralized order pricing.
 * Platform fee (10% customer charge) is NOT included here; it belongs to Go7 separately.
 */
import { calculateRiderDeliverySplit } from './orderPricing';

export function calculateDeliveryFeeSplit(deliveryFee, riderOrShare = null) {
  if (typeof riderOrShare === 'object' && riderOrShare !== null) {
    return calculateRiderDeliverySplit(deliveryFee, riderOrShare);
  }

  if (typeof riderOrShare === 'number' && Number.isFinite(riderOrShare)) {
    const totalFee = Math.round(Number(deliveryFee) || 0);
    const riderPercentage = riderOrShare;
    const riderPayout = Math.round(totalFee * riderPercentage);
    const go7DeliveryShare = totalFee - riderPayout;

    return {
      deliveryFee: totalFee,
      riderPayout,
      go7DeliveryShare,
      platformDeliveryShare: go7DeliveryShare,
      riderPercentage: riderPercentage * 100,
      riderDeliveryShareRate: riderPercentage,
      go7DeliveryShareRate: 1 - riderPercentage,
    };
  }

  // Default: Firestore pricingSettings/current rider share rates
  return calculateRiderDeliverySplit(deliveryFee, {});
}

export function addDeliveryFeeSplit(orderData, deliveryFee, riderOrShare = null) {
  const split = calculateDeliveryFeeSplit(deliveryFee, riderOrShare);
  return { ...orderData, ...split };
}
