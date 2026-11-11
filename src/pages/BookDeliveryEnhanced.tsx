import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useNotificationContext } from '../contexts/NotificationContext';

// MapTiler configuration
const MAPTILER_CONFIG = {
  apiKey: "qRlb1fwa9OgPpla4WO3q",
  geocodingUrl: "https://api.maptiler.com/geocoding/{query}.json?key=qRlb1fwa9OgPpla4WO3q",
  routesUrl: "https://api.maptiler.com/routes/driving/{fromLon},{fromLat}/{toLon},{toLat}.json?key=qRlb1fwa9OgPpla4WO3q"
};

// Abeokuta bounds for autocomplete filtering
const ABEOKUTA_BOUNDS = {
  minLat: 7.0475,
  maxLat: 7.2475,
  minLng: 3.2619,
  maxLng: 3.4619
};

interface Location {
  lat: number;
  lng: number;
  address: string;
  placeName?: string;
}

interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
  fee: number; // in naira
}

interface AutocompleteResult {
  id: string;
  place_name: string;
  center: [number, number];
  relevance: number;
}

const BookDeliveryEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const { showOrderConfirmed } = useNotificationContext();
  
  // Form state
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [dropoffInput, setDropoffInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  
  // Autocomplete state
  const [pickupSuggestions, setPickupSuggestions] = useState<AutocompleteResult[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<AutocompleteResult[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  
  // Route and pricing state
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  // Refs for input management
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const dropoffInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Detect current GPS position
  const detectCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: 'error',
        title: 'Location Not Supported',
        text: 'Your browser does not support location detection.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      return;
    }

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Check if location is within Abeokuta bounds
        if (latitude < ABEOKUTA_BOUNDS.minLat || latitude > ABEOKUTA_BOUNDS.maxLat ||
            longitude < ABEOKUTA_BOUNDS.minLng || longitude > ABEOKUTA_BOUNDS.maxLng) {
          Swal.fire({
            icon: 'warning',
            title: 'Outside Service Area',
            text: 'Your current location is outside our Abeokuta service area.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000
          });
          setIsDetectingLocation(false);
          return;
        }

        try {
          // Reverse geocode to get address
          const reverseGeoUrl = `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${MAPTILER_CONFIG.apiKey}`;
          const response = await fetch(reverseGeoUrl);
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const detectedLocation: Location = {
              lat: latitude,
              lng: longitude,
              address: feature.place_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              placeName: feature.text
            };
            
            setPickupLocation(detectedLocation);
            setPickupInput(detectedLocation.address);
            
            Swal.fire({
              icon: 'success',
              title: 'Location Detected',
              text: 'Your current location has been set as pickup point.',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2000
            });
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          // Use coordinates as fallback
          const fallbackLocation: Location = {
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          };
          setPickupLocation(fallbackLocation);
          setPickupInput(fallbackLocation.address);
        }
        
        setIsDetectingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unable to detect your location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location detection timed out.';
            break;
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Location Detection Failed',
          text: errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000
        });
        
        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, []);

  // Geocoding with autocomplete
  const searchLocation = useCallback(async (query: string): Promise<AutocompleteResult[]> => {
    if (query.length < 3) return [];

    try {
      const geocodeUrl = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_CONFIG.apiKey}&bbox=${ABEOKUTA_BOUNDS.minLng},${ABEOKUTA_BOUNDS.minLat},${ABEOKUTA_BOUNDS.maxLng},${ABEOKUTA_BOUNDS.maxLat}&limit=5`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.features) {
        return data.features.map((feature: any) => ({
          id: feature.id,
          place_name: feature.place_name,
          center: feature.center,
          relevance: feature.relevance
        }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    
    return [];
  }, []);

  // Debounced autocomplete for pickup
  const handlePickupInputChange = useCallback((value: string) => {
    setPickupInput(value);
    setShowPickupSuggestions(true);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 3) {
        const suggestions = await searchLocation(value);
        setPickupSuggestions(suggestions);
      } else {
        setPickupSuggestions([]);
      }
    }, 300);
  }, [searchLocation]);

  // Debounced autocomplete for dropoff
  const handleDropoffInputChange = useCallback((value: string) => {
    setDropoffInput(value);
    setShowDropoffSuggestions(true);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 3) {
        const suggestions = await searchLocation(value);
        setDropoffSuggestions(suggestions);
      } else {
        setDropoffSuggestions([]);
      }
    }, 300);
  }, [searchLocation]);

  // Select location from autocomplete
  const selectPickupLocation = useCallback((suggestion: AutocompleteResult) => {
    const location: Location = {
      lat: suggestion.center[1],
      lng: suggestion.center[0],
      address: suggestion.place_name
    };
    setPickupLocation(location);
    setPickupInput(suggestion.place_name);
    setShowPickupSuggestions(false);
    setPickupSuggestions([]);
  }, []);

  const selectDropoffLocation = useCallback((suggestion: AutocompleteResult) => {
    const location: Location = {
      lat: suggestion.center[1],
      lng: suggestion.center[0],
      address: suggestion.place_name
    };
    setDropoffLocation(location);
    setDropoffInput(suggestion.place_name);
    setShowDropoffSuggestions(false);
    setDropoffSuggestions([]);
  }, []);

  // Calculate route and pricing
  const calculateRouteAndPrice = useCallback(async (pickup: Location, dropoff: Location) => {
    setIsCalculatingRoute(true);
    setRouteInfo(null);

    try {
      const routeUrl = `https://api.maptiler.com/routes/driving/${pickup.lng},${pickup.lat}/${dropoff.lng},${dropoff.lat}.json?key=${MAPTILER_CONFIG.apiKey}`;
      const response = await fetch(routeUrl);
      
      if (!response.ok) {
        throw new Error(`Route API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const durationMinutes = Math.round(route.duration / 60);
        
        // Calculate delivery fee (base rate + distance rate)
        const baseFee = 200; // ₦200 base fee
        const perKmRate = 100; // ₦100 per km
        const deliveryFee = Math.round(baseFee + (distanceKm * perKmRate));
        
        const routeInfo: RouteInfo = {
          distance: parseFloat(distanceKm.toFixed(2)),
          duration: durationMinutes,
          fee: deliveryFee
        };
        
        setRouteInfo(routeInfo);
        
        console.log('Route calculated:', {
          distance: `${distanceKm.toFixed(2)}km`,
          duration: `${durationMinutes}min`,
          fee: `₦${deliveryFee}`
        });
      } else {
        throw new Error('No routes found');
      }
    } catch (error) {
      console.error('Route calculation failed:', error);
      
      // Fallback to haversine distance
      const R = 6371; // Earth's radius in km
      const dLat = (dropoff.lat - pickup.lat) * Math.PI / 180;
      const dLng = (dropoff.lng - pickup.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(pickup.lat * Math.PI / 180) * Math.cos(dropoff.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      const estimatedDuration = Math.round(distance * 4); // ~15 km/h average
      const baseFee = 200;
      const perKmRate = 100;
      const deliveryFee = Math.round(baseFee + (distance * perKmRate));
      
      setRouteInfo({
        distance: parseFloat(distance.toFixed(2)),
        duration: estimatedDuration,
        fee: deliveryFee
      });
      
      Swal.fire({
        icon: 'warning',
        title: 'Using Estimated Route',
        text: 'Could not get exact route. Using estimated distance and time.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
    
    setIsCalculatingRoute(false);
  }, []);

  // Auto-calculate when both locations are set
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      calculateRouteAndPrice(pickupLocation, dropoffLocation);
    } else {
      setRouteInfo(null);
    }
  }, [pickupLocation, dropoffLocation, calculateRouteAndPrice]);

  // Handle booking confirmation
  const handleBooking = useCallback(async () => {
    // Validation
    if (!pickupLocation || !dropoffLocation) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Locations',
        text: 'Please set both pickup and dropoff locations.',
      });
      return;
    }

    if (!customerName.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Information',
        text: 'Please enter your name.',
      });
      return;
    }

    if (!customerPhone.trim() || !/^(\+234|0)[789]\d{9}$/.test(customerPhone)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Phone Number',
        text: 'Please enter a valid Nigerian phone number.',
      });
      return;
    }

    if (!itemDescription.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Information',
        text: 'Please describe what you want to deliver.',
      });
      return;
    }

    setIsBooking(true);

    try {
      // Simulate booking API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate order ID
      const orderId = `GO7-${Date.now().toString().slice(-6)}`;
      
      // Trigger notification
      showOrderConfirmed(orderId);
      
      // Show success modal
      const result = await Swal.fire({
        icon: 'success',
        title: 'Order Placed Successfully!',
        html: `
          <div class="text-left space-y-2">
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>From:</strong> ${pickupLocation.address}</p>
            <p><strong>To:</strong> ${dropoffLocation.address}</p>
            <p><strong>Distance:</strong> ${routeInfo?.distance}km</p>
            <p><strong>Fee:</strong> ₦${routeInfo?.fee}</p>
            <p><strong>ETA:</strong> ${routeInfo?.duration} minutes</p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Track Order',
        confirmButtonColor: '#e60023',
        timer: 5000,
        timerProgressBar: true
      });

      // Redirect to tracking page
      if (result.isConfirmed || result.isDismissed) {
        navigate('/track');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      Swal.fire({
        icon: 'error',
        title: 'Booking Failed',
        text: 'Something went wrong. Please try again.',
      });
    }

    setIsBooking(false);
  }, [pickupLocation, dropoffLocation, customerName, customerPhone, itemDescription, routeInfo, navigate]);

  // Form validation
  const isFormValid = pickupLocation && dropoffLocation && customerName.trim() && 
                     customerPhone.trim() && itemDescription.trim() && routeInfo;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Book Delivery</h1>
              <p className="text-sm text-gray-600">Schedule your pickup and delivery</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="max-w-md mx-auto px-4 py-6 pb-32">
        {/* Location Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pickup & Delivery</h2>
          
          {/* Pickup Location */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 Pickup Location
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  ref={pickupInputRef}
                  type="text"
                  value={pickupInput}
                  onChange={(e) => handlePickupInputChange(e.target.value)}
                  onFocus={() => setShowPickupSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPickupSuggestions(false), 200)}
                  placeholder="Enter pickup address..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                />
                
                {/* Pickup Suggestions */}
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {pickupSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => selectPickupLocation(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {suggestion.place_name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={detectCurrentLocation}
                disabled={isDetectingLocation}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                {isDetectingLocation ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Dropoff Location */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏠 Delivery Location
            </label>
            <div className="relative">
              <input
                ref={dropoffInputRef}
                type="text"
                value={dropoffInput}
                onChange={(e) => handleDropoffInputChange(e.target.value)}
                onFocus={() => setShowDropoffSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDropoffSuggestions(false), 200)}
                placeholder="Enter delivery address..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
              
              {/* Dropoff Suggestions */}
              {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {dropoffSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => selectDropoffLocation(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {suggestion.place_name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Route Summary Card */}
        {routeInfo && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Summary</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{routeInfo.distance}km</div>
                <div className="text-sm text-gray-600">Distance</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{routeInfo.duration}min</div>
                <div className="text-sm text-gray-600">ETA</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₦{routeInfo.fee}</div>
                <div className="text-sm text-gray-600">Delivery Fee</div>
              </div>
            </div>
            
            {isCalculatingRoute && (
              <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculating route...
              </div>
            )}
          </div>
        )}

        {/* Customer Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Full Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📱 Phone Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08012345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📦 Item Description
              </label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Describe what you want to deliver (e.g., Documents, Food, Small package)"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBooking}
            disabled={!isFormValid || isBooking}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              isFormValid && !isBooking
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isBooking ? (
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </div>
            ) : (
              `Confirm Booking${routeInfo ? ` - ₦${routeInfo.fee}` : ''}`
            )}
          </button>
          
          {!isFormValid && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Please complete all fields to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDeliveryEnhanced;