import React from 'react';
import { MapPinIcon, TruckIcon, ClockIcon, ReceiptIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { formatNaira, formatDistance, formatDuration, getEstimatedArrival } from '../utils/deliveryUtils';

/**
 * Delivery Summary Card component
 * Displays a modern summary of delivery details including price, distance, and ETA
 */
const DeliverySummaryCard = ({
  distance = 0,
  duration = 0,
  price = 0,
  pickupAddress = '',
  dropoffAddress = '',
  onConfirm,
  isLoading = false
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 transition-all duration-200">
      <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center">
        <ReceiptIcon className="w-5 h-5 mr-2 text-red-500" />
        Delivery Summary
      </h3>
      
      <div className="space-y-4">
        {/* Addresses */}
        <div className="space-y-2">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 flex justify-center">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
            </div>
            <div className="text-sm font-medium text-gray-900 line-clamp-1">
              {pickupAddress || 'Pickup location'}
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 flex justify-center">
              <div className="h-8 w-0.5 bg-gray-200 mx-auto"></div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 flex justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
            </div>
            <div className="text-sm font-medium text-gray-900 line-clamp-1">
              {dropoffAddress || 'Dropoff location'}
            </div>
          </div>
        </div>
        
        {/* Delivery Stats */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-gray-100">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Distance</div>
            <div className="font-semibold text-gray-900">
              {formatDistance(distance)}
            </div>
          </div>
          
          <div className="text-center border-l border-r border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Duration</div>
            <div className="font-semibold text-gray-900">
              {formatDuration(duration)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Arrival</div>
            <div className="font-semibold text-gray-900">
              {getEstimatedArrival(duration)}
            </div>
          </div>
        </div>
        
        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="text-gray-700">Total Fare</div>
          <div className="text-xl font-bold text-red-600">
            {formatNaira(price)}
          </div>
        </div>
        
        {/* Confirm Button */}
        <button
          onClick={onConfirm}
          disabled={isLoading || !pickupAddress || !dropoffAddress}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 
            flex items-center justify-center shadow-md hover:shadow-lg 
            ${isLoading || !pickupAddress || !dropoffAddress
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 active:translate-y-0.5'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <CheckBadgeIcon className="w-5 h-5 mr-2" />
              Confirm Delivery
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DeliverySummaryCard;