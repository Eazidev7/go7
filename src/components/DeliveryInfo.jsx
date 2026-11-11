import React from 'react';
import { Clock, MapPin, Truck, AlertCircle, Gift } from 'lucide-react';
import { useDelivery } from '../contexts/DeliveryContext';
import { useLocation } from '../contexts/LocationContext';

const DeliveryInfo = ({ vendor, showDetailed = false, className = '' }) => {
  const { deliveryInfo, getDeliveryInfoForVendor, getAmountForFreeDelivery } = useDelivery();
  const { activeAddress } = useLocation();

  // Use vendor-specific delivery info if vendor is provided, otherwise use global
  const info = vendor ? getDeliveryInfoForVendor(vendor) : deliveryInfo;
  const amountForFreeDelivery = getAmountForFreeDelivery();

  if (!activeAddress?.coordinates) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 text-sm ${className}`}>
        <MapPin className="w-4 h-4" />
        <span>Select delivery address to see delivery info</span>
      </div>
    );
  }

  if (deliveryInfo.isCalculating) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 text-sm ${className}`}>
        <Truck className="w-4 h-4 animate-pulse" />
        <span>Calculating delivery...</span>
      </div>
    );
  }

  if (deliveryInfo.error || (info && !info.isAvailable)) {
    const errorMessage = deliveryInfo.error || info?.reason || 'Delivery not available';
    return (
      <div className={`flex items-center gap-2 text-red-500 text-sm ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (!info && !deliveryInfo.fee) {
    return null;
  }

  const displayInfo = info || deliveryInfo;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Delivery Fee */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#E50914]" />
          <span className="text-sm font-medium">Delivery Fee</span>
        </div>
        <div className="text-right">
          {displayInfo.isFreeDelivery || displayInfo.deliveryFee?.isFreeDelivery ? (
            <div className="flex items-center gap-1">
              <Gift className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-green-500">FREE</span>
              {displayInfo.originalFee && (
                <span className="text-xs text-gray-400 line-through ml-1">
                  ₦{displayInfo.originalFee || displayInfo.deliveryFee?.originalFee}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold">
              ₦{displayInfo.fee || displayInfo.deliveryFee?.fee || 0}
            </span>
          )}
        </div>
      </div>

      {/* Distance */}
      {displayInfo.distance && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>Distance</span>
          </div>
          <span>{displayInfo.distance.toFixed(1)} km</span>
        </div>
      )}

      {/* ETA */}
      {(displayInfo.eta || deliveryInfo.eta) && showDetailed && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Estimated Delivery</span>
          </div>
          <span>{(displayInfo.eta || deliveryInfo.eta).formattedETA}</span>
        </div>
      )}

      {/* Free Delivery Progress */}
      {amountForFreeDelivery > 0 && showDetailed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
          <div className="flex items-center gap-2 text-green-700 text-xs">
            <Gift className="w-4 h-4" />
            <span>
              Add ₦{amountForFreeDelivery.toLocaleString()} more for FREE delivery!
            </span>
          </div>
        </div>
      )}

      {/* Detailed ETA Breakdown */}
      {(displayInfo.eta || deliveryInfo.eta) && showDetailed && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Food preparation:</span>
              <span>{(displayInfo.eta || deliveryInfo.eta).preparationTime} mins</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery travel:</span>
              <span>{(displayInfo.eta || deliveryInfo.eta).travelTime} mins</span>
            </div>
            <hr className="my-1 border-gray-300" />
            <div className="flex justify-between font-medium">
              <span>Total estimated time:</span>
              <span>{(displayInfo.eta || deliveryInfo.eta).formattedETA}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryInfo;