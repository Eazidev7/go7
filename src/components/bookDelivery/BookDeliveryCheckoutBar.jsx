import React, { useState } from 'react';
import DeliveryPricingBreakdown from './DeliveryPricingBreakdown';
import { useVisualViewportInset } from '../../hooks/useVisualViewportInset';

export default function BookDeliveryCheckoutBar({
  displayedFare = 0,
  pricingBreakdown = {},
  pricingSettings,
  serviceType = '',
  effectiveDistanceKm = 0,
  routeInfo = null,
  isCalculating = false,
  isAuthenticated = false,
  isSubmitting = false,
  isProcessingPayment = false,
  pickupReady = false,
  dropoffReady = false,
  onBook,
  onSignIn,
  paymentMethod = 'paystack',
  baseFareFallback = 1000,
  parcelPricing = null,
  isFormFocused = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const { keyboardOpen } = useVisualViewportInset();

  // What the customer is actually charged (delivery fee + platform fee) —
  // must match the amount used for wallet/Paystack charging, otherwise the
  // quoted price on this button disagrees with the real charge.
  const totalToCharge = parcelPricing?.grandTotal ?? displayedFare;

  const hasQuote =
    displayedFare > 0 &&
    pickupReady &&
    dropoffReady &&
    serviceType &&
    !isCalculating;

  const etaLabel = routeInfo?.eta
    ? routeInfo.eta
    : effectiveDistanceKm > 0
      ? `${Math.ceil(effectiveDistanceKm * 3)}–${Math.ceil(effectiveDistanceKm * 4)} min`
      : null;

  const summaryParts = [];
  if (effectiveDistanceKm > 0) summaryParts.push(`${effectiveDistanceKm.toFixed(1)} km`);
  if (etaLabel) summaryParts.push(etaLabel);
  const summaryText = summaryParts.length ? summaryParts.join(' • ') : 'Set pickup & dropoff';

  const disabledForAuth =
    isAuthenticated &&
    (isSubmitting ||
      isProcessingPayment ||
      !hasQuote ||
      !pickupReady ||
      !dropoffReady ||
      !serviceType);

  const handlePrimaryClick = () => {
    if (!isAuthenticated) {
      onSignIn?.();
      return;
    }
    onBook?.();
  };

  const buttonLabel = !isAuthenticated
    ? 'Sign in to book'
    : isProcessingPayment
      ? 'Processing payment…'
      : isSubmitting
        ? 'Booking…'
        : isCalculating
          ? 'Calculating…'
          : hasQuote
            ? `Book & Pay • ₦${totalToCharge.toLocaleString()}`
            : 'Complete details';

  // Hide while typing — fixed/sticky footers overlap page content on mobile browsers
  if (keyboardOpen || isFormFocused) {
    return null;
  }

  return (
    <div className="sticky bottom-0 z-20 bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {hasQuote && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                Instant quote
              </p>
              <p className="text-sm text-gray-700 truncate">{summaryText}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-lg font-bold text-red-600">
                ₦{totalToCharge.toLocaleString()}
              </span>
              <span className="text-gray-400 text-sm">{expanded ? '▴' : '▾'}</span>
            </div>
          </button>
        )}

        {!hasQuote && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-600 text-center">{summaryText}</p>
          </div>
        )}

        {expanded && hasQuote && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 max-h-48 overflow-y-auto">
            <DeliveryPricingBreakdown
              pricingBreakdown={pricingBreakdown}
              pricingSettings={pricingSettings}
              displayedFare={displayedFare}
              serviceType={serviceType}
              baseFareFallback={baseFareFallback}
              parcelPricing={parcelPricing}
            />
          </div>
        )}

        <div className="p-3">
          <button
            type="button"
            onClick={handlePrimaryClick}
            disabled={disabledForAuth}
            className="w-full py-4 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg transition-all"
          >
            {buttonLabel}
          </button>
          <p className="text-center text-[11px] text-gray-500 mt-2">
            🔒 {paymentMethod === 'wallet' ? 'Wallet' : 'Paystack'} • Go7 Guaranteed
          </p>
        </div>
      </div>
    </div>
  );
}
