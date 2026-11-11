// src/components/DistanceSummary.jsx
import React from 'react';

/**
 * Component to display distance and time estimate between pickup and dropoff locations
 */
const DistanceSummary = ({ 
  distanceKm, 
  estimatedTime, 
  showRouteDistance = false,
  routeDistanceKm = null,
  isCalculating = false
}) => {
  if (!distanceKm && !isCalculating) {
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-gray-500 mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </span>
          <div>
            {isCalculating ? (
              <div className="flex items-center">
                <span className="text-sm text-gray-500">Calculating distance...</span>
                <svg className="animate-spin ml-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <>
                <div className="text-sm font-medium text-gray-900">
                  Distance: {distanceKm} km
                  {showRouteDistance && routeDistanceKm && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Road distance: {routeDistanceKm} km)
                    </span>
                  )}
                </div>
                {estimatedTime && (
                  <div className="text-xs text-gray-500">
                    Estimated travel time: {estimatedTime} minutes
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistanceSummary;