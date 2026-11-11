import React from 'react';

/**
 * Presentational pricing breakdown — no calculations here.
 */
export default function DeliveryPricingBreakdown({
  pricingBreakdown = {},
  pricingSettings,
  displayedFare = 0,
  serviceType = '',
  baseFareFallback = 1000,
  parcelPricing = null,
  showPlatformFee = true,
}) {
  const serviceLabel =
    serviceType === 'parcel'
      ? 'Parcel Delivery'
      : serviceType === 'errand'
        ? 'Errand Service'
        : serviceType === 'gobuy'
          ? 'GoBuy Service'
          : 'Delivery';

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between items-center text-xs bg-white/80 rounded px-2 py-1.5">
        <span className="text-gray-600">Service</span>
        <span className="font-medium capitalize">{serviceLabel}</span>
      </div>

      {pricingBreakdown.pricingMode && (
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Pricing mode</span>
          <span className="capitalize font-medium">{pricingBreakdown.pricingMode}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-gray-600">Base fee</span>
        <span className="font-medium">
          ₦{(pricingBreakdown.baseFee || baseFareFallback).toLocaleString()}
        </span>
      </div>

      {pricingBreakdown.includedKm != null && (
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Included km</span>
          <span className="font-medium">{pricingBreakdown.includedKm} km</span>
        </div>
      )}

      {pricingBreakdown.chargeableKm > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-gray-600">
            Extra distance ({pricingBreakdown.chargeableKm.toFixed(1)} km)
          </span>
          <span className="font-medium">₦{(pricingBreakdown.distanceFee || 0).toLocaleString()}</span>
        </div>
      )}

      {(pricingBreakdown.waitingCharge || 0) > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Waiting</span>
          <span className="font-medium">₦{pricingBreakdown.waitingCharge.toLocaleString()}</span>
        </div>
      )}

      {pricingSettings?.enableTimeCharge && (pricingBreakdown.timeFee || 0) > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Time ({pricingBreakdown.duration} min)</span>
          <span className="font-medium">₦{(pricingBreakdown.timeFee || 0).toLocaleString()}</span>
        </div>
      )}

      {pricingBreakdown.serviceFee > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Service fee</span>
          <span className="font-medium">₦{pricingBreakdown.serviceFee.toLocaleString()}</span>
        </div>
      )}

      {pricingBreakdown.packageSurcharge > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Package surcharge</span>
          <span className="font-medium">₦{pricingBreakdown.packageSurcharge.toLocaleString()}</span>
        </div>
      )}

      {showPlatformFee && parcelPricing?.platformFee > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Platform fee</span>
          <span className="font-medium">₦{parcelPricing.platformFee.toLocaleString()}</span>
        </div>
      )}

      <div className="border-t border-gray-200 pt-2 flex justify-between items-center font-semibold text-gray-900">
        <span>Delivery total</span>
        <span className="text-red-600">
          ₦{Number(parcelPricing?.grandTotal ?? displayedFare ?? 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
