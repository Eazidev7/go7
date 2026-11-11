import React from 'react';
import { MapPin, Clock, Truck, AlertTriangle } from 'lucide-react';
import { useDelivery } from '../contexts/DeliveryContext';
import { useLocation } from '../contexts/LocationContext';
import { useNavigate } from 'react-router-dom';
import DeliveryInfo from './DeliveryInfo';
import VendorClickableWrapper from './VendorClickableWrapper';

const SmartVendorCard = ({ vendor, onClick, className = '' }) => {
  const { canDeliverTo, getDeliveryInfoForVendor, updateSelectedVendor } = useDelivery();
  const { activeAddress } = useLocation();
  const navigate = useNavigate();
  
  const deliveryAvailable = canDeliverTo(vendor);
  const deliveryInfo = getDeliveryInfoForVendor(vendor);
  
  const handleVendorClick = () => {
    if (deliveryAvailable) {
      updateSelectedVendor(vendor);
    }
    // Navigate to vendor detail page
    const vendorId = vendor.vendorId || vendor.id;
    if (vendorId) {
      navigate(`/vendor/${vendorId}`);
    }
    onClick?.(vendor);
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer transition-all duration-200 ${
        deliveryAvailable ? 'hover:shadow-md hover:border-[#E50914]' : 'opacity-60'
      } ${className}`}
      onClick={handleVendorClick}
    >
      {/* Vendor Image */}
      <div className="relative h-32 bg-gray-200">
        {vendor.image ? (
          <img
            src={vendor.image}
            alt={vendor.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-lg font-semibold">{(vendor.businessName || vendor.name)?.[0] || '?'}</span>
          </div>
        )}
        
        {/* Delivery Status Badge */}
        {activeAddress?.coordinates && (
          <div className="absolute top-2 right-2">
            {deliveryAvailable ? (
              <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Truck className="w-3 h-3" />
                <span>Delivers</span>
              </div>
            ) : (
              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Too far</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vendor Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{vendor.businessName || vendor.name}</h3>
          {vendor.rating && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-yellow-500">★</span>
              <span className="text-gray-600">{vendor.rating}</span>
            </div>
          )}
        </div>

        {vendor.cuisine && (
          <p className="text-sm text-gray-600 mb-2">{vendor.cuisine}</p>
        )}

        {/* Delivery Information */}
        {activeAddress?.coordinates && deliveryAvailable && deliveryInfo && (
          <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <MapPin className="w-3 h-3" />
                <span>{deliveryInfo.distance?.toFixed(1)} km</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-3 h-3" />
                <span>{deliveryInfo.eta?.formattedETA}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Delivery:</span>
              {deliveryInfo.deliveryFee?.isFreeDelivery ? (
                <span className="font-semibold text-green-600">FREE</span>
              ) : (
                <span className="font-semibold text-gray-900">₦{deliveryInfo.deliveryFee?.fee}</span>
              )}
            </div>
          </div>
        )}

        {/* Warning for unavailable delivery */}
        {activeAddress?.coordinates && !deliveryAvailable && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Outside delivery area</span>
            </div>
          </div>
        )}

        {/* No address selected */}
        {!activeAddress?.coordinates && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <MapPin className="w-4 h-4" />
              <span>Select address to see delivery info</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SmartVendorList = ({ vendors = [], title = "Restaurants Near You", className = '' }) => {
  const { getVendorsInRange } = useDelivery();
  const { activeAddress } = useLocation();
  
  // Filter vendors by delivery range
  const filteredVendors = activeAddress?.coordinates ? getVendorsInRange(vendors) : vendors;
  
  if (!vendors.length) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-500">No restaurants available</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {activeAddress?.coordinates && (
          <span className="text-sm text-gray-500">
            {filteredVendors.length} of {vendors.length} deliver to you
          </span>
        )}
      </div>

      {filteredVendors.length === 0 && activeAddress?.coordinates ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <div className="text-gray-600 mb-2">No restaurants deliver to your area</div>
          <div className="text-sm text-gray-500">Try selecting a different address</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor, index) => (
            <SmartVendorCard
              key={vendor.id || index}
              vendor={vendor}
              onClick={(vendor) => {
                console.log('Vendor selected:', vendor.name);
                // Handle vendor selection - navigate to menu, etc.
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { SmartVendorCard, SmartVendorList };
export default SmartVendorList;