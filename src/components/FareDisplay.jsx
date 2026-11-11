import React, { useEffect, useState } from 'react';
import { calculateServiceFareFromCoordinates, currencyFormatNGN, formatDistance } from '../utils/pricing';
import { Info } from 'lucide-react';

/**
 * FareDisplay Component
 * Dynamic fare calculator and display for all Go7 services
 * Updates automatically when locations change
 */
const FareDisplay = ({
  serviceType = 'parcel',
  pickup,
  dropoff,
  options = {},
  className = '',
  onFareCalculated
}) => {
  const [fareData, setFareData] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate fare when coordinates change
  useEffect(() => {
    if (!pickup || !dropoff) {
      setFareData(null);
      return;
    }

    setIsCalculating(true);

    // Small delay for smooth UX
    const timer = setTimeout(() => {
      try {
        const result = calculateServiceFareFromCoordinates(
          serviceType,
          pickup,
          dropoff,
          options
        );

        setFareData(result);
        setIsCalculating(false);

        // Callback with calculated fare
        if (onFareCalculated) {
          onFareCalculated(result);
        }

        console.log('💰 Fare calculated:', result);
      } catch (error) {
        console.error('Error calculating fare:', error);
        setIsCalculating(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [pickup, dropoff, serviceType, options, onFareCalculated]);

  // Show placeholder if no coordinates
  if (!pickup || !dropoff) {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📍</div>
          <p className="text-sm">Select pickup and dropoff locations to see fare</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isCalculating || !fareData) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Calculating fare...</p>
        </div>
      </div>
    );
  }

  const { distance, fare, breakdown } = fareData;

  return (
    <div className={`bg-gradient-to-br from-white to-red-50 border-2 border-red-200 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-red-600 text-white px-6 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>💰</span>
            <span>Estimated Fare</span>
          </h3>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-all flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            {showBreakdown ? 'Hide' : 'Show'} Details
          </button>
        </div>
      </div>

      {/* Main Fare Display */}
      <div className="p-6">
        <div className="text-center mb-4">
          <div className="text-5xl font-bold text-red-600 mb-2 animate-fade-in">
            {currencyFormatNGN(fare)}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              📍 {formatDistance(distance)}
            </span>
            {breakdown.note && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                {breakdown.note}
              </span>
            )}
          </div>
        </div>

        {/* Breakdown (collapsible) */}
        {showBreakdown && (
          <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 animate-slide-down">
            {/* Base Fee */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Base Fee</span>
              <span className="font-medium">{currencyFormatNGN(breakdown.baseFee)}</span>
            </div>

            {/* Distance Fee */}
            {breakdown.distanceFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Distance Charge ({formatDistance(distance)})</span>
                <span className="font-medium">{currencyFormatNGN(breakdown.distanceFee)}</span>
              </div>
            )}

            {/* Service Fee (GoBuy) */}
            {breakdown.serviceFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service Fee</span>
                <span className="font-medium text-blue-600">{currencyFormatNGN(breakdown.serviceFee)}</span>
              </div>
            )}

            {/* Peak Surcharge */}
            {breakdown.peakSurcharge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  Peak Hour Surge
                  <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded">{breakdown.peakMultiplier}</span>
                </span>
                <span className="font-medium text-orange-600">{currencyFormatNGN(breakdown.peakSurcharge)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between pt-3 border-t border-gray-300">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-red-600 text-lg">{currencyFormatNGN(fare)}</span>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Includes distance & base rate. Final fare confirmed at checkout.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FareDisplay;

/**
 * Compact version for inline display
 */
export const FareDisplayCompact = ({ serviceType, pickup, dropoff, options = {}, className = '' }) => {
  const [fare, setFare] = useState(null);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setFare(null);
      return;
    }

    try {
      const result = calculateServiceFareFromCoordinates(serviceType, pickup, dropoff, options);
      setFare(result.fare);
    } catch (error) {
      console.error('Error calculating fare:', error);
    }
  }, [pickup, dropoff, serviceType, options]);

  if (!fare) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        Fare: Calculating...
      </div>
    );
  }

  return (
    <div className={`font-semibold text-red-600 ${className}`}>
      Fare: {currencyFormatNGN(fare)}
    </div>
  );
};
