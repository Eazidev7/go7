import React, { useState, useEffect } from 'react';
import { X, Search, MapPin, Navigation, Plus, Check } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import fetchAddressSuggestions, { getCoordinatesFromSuggestion, reverseGeocode } from '../utils/fetchAddressSuggestions';

const AddressModal = ({ isOpen, onClose }) => {
  const { 
    savedAddresses, 
    activeAddress, 
    isLoading, 
    addAddress, 
    selectAddress, 
    getCurrentLocation, 
    geocodeAddress 
  } = useLocation();

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddressName, setNewAddressName] = useState('');

  // Enhanced search with Google Maps integration and fallback
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchText.length > 2) {
        setIsSearching(true);
        console.log('🔍 Searching for:', searchText);
        
        try {
          // Try Google Maps enhanced search first
          console.log('📍 Using Google Maps enhanced search...');
          const results = await fetchAddressSuggestions(searchText);
          console.log('✅ Google Maps results:', results);
          
          const formattedSuggestions = results.map((result, index) => ({
            id: index,
            address: result.description || result.display_name || result.formatted_address,
            // Never invent city-center coords — resolve on select via getCoordinatesFromSuggestion
            coordinates:
              result.coordinates ||
              (result.lat != null && result.lon != null
                ? { lat: result.lat, lng: result.lon }
                : undefined),
            place_id: result.place_id,
            source: result.source || 'google',
          }));
          
          setSuggestions(formattedSuggestions);
        } catch (error) {
          console.warn('🚨 Google Maps search failed:', error);
          console.log('🔄 Falling back to basic geocoder...');
          
          try {
            // Fallback to basic search
            const fallbackResults = await geocodeAddress(searchText);
            console.log('✅ Fallback results:', fallbackResults);
            setSuggestions(fallbackResults || []);
          } catch (fallbackError) {
            console.error('❌ All search methods failed:', fallbackError);
            // Create basic suggestion from user input
            setSuggestions([{
              id: 0,
              address: searchText + ', Abeokuta, Nigeria',
              coordinates: undefined,
              source: 'basic'
            }]);
          }
        }
        setIsSearching(false);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, geocodeAddress]);

  const handleUseCurrentLocation = async (e) => {
    // Prevent event bubbling and default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🎯 handleUseCurrentLocation called');
    console.log('📱 User Agent:', navigator.userAgent);
    console.log('🌐 Protocol:', window.location.protocol);
    console.log('🔐 Secure Context:', window.isSecureContext);
    
    // Check for HTTPS on mobile (required for geolocation)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      alert('⚠️ Location access requires HTTPS. Please access this site via https:// or use localhost for testing.');
      return;
    }
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      alert('❌ Your browser does not support location services.');
      return;
    }
    
    try {
      console.log('📍 Requesting location...');
      
      const coords = await getCurrentLocation();
      console.log('✅ Got coordinates:', coords);
      
      let addressName = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
      
      try {
        // Maps JS reverse geocode (rate-limited) — no CORS REST Places/Geocode
        const label = await reverseGeocode(coords.lat, coords.lng);
        if (label && label !== 'Unknown address') {
          addressName = label;
          console.log('📍 Reverse geocoded address:', addressName);
        }
      } catch (reverseGeoError) {
        console.warn('Reverse geocoding failed, using coordinates:', reverseGeoError);
      }
      
      const currentLocationAddress = {
        id: 'current',
        name: 'Current Location',
        address: addressName,
        coordinates: coords,
        source: 'gps_google'
      };
      
      await selectAddress(currentLocationAddress);
      console.log('✅ Location set successfully');
      onClose();
    } catch (error) {
      console.error('❌ Location error:', error);
      
      if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
        alert('📍 Location permission denied.\n\nPlease:\n1. Enable location in your browser settings\n2. Refresh the page\n3. Allow location when prompted');
      } else if (error.code === 2 || error.code === error.POSITION_UNAVAILABLE) {
        alert('📍 Unable to determine your location.\n\nPlease check:\n1. GPS is enabled on your device\n2. You have internet connection\n3. Try again in a moment');
      } else if (error.code === 3 || error.code === error.TIMEOUT) {
        alert('⏱️ Location request timed out.\n\nPlease:\n1. Check your GPS signal\n2. Try again');
      } else {
        alert('❌ Unable to get your location.\n\nPlease check your permissions and try again.');
      }
    }
  };

  const handleSelectSuggestion = async (suggestion) => {
    setSearchText(suggestion.address);
    setSuggestions([]);

    try {
      let coordinates = suggestion.coordinates;
      if (!coordinates?.lat || !coordinates?.lng) {
        coordinates = await getCoordinatesFromSuggestion({
          source: suggestion.source,
          description: suggestion.address,
          place_id: suggestion.place_id,
          lat: suggestion.coordinates?.lat,
          lon: suggestion.coordinates?.lng,
        });
      }
      if (!coordinates?.lat || !coordinates?.lng) {
        alert('Could not pin that address. Try another suggestion or Use Current Location.');
        return;
      }

      const newAddress = {
        id: `google_${Date.now()}`,
        name: 'Selected Location',
        address: suggestion.address,
        coordinates,
        source: suggestion.source || 'google',
      };

      await selectAddress(newAddress);
      onClose();
    } catch (error) {
      console.error('Error using suggestion coordinates:', error);
      setShowAddForm(true);
    }
  };

  const handleSaveCustomAddress = async () => {
    if (!searchText || !newAddressName) return;

    try {
      let coordinates = null;

      try {
        const suggestionResults = await fetchAddressSuggestions(searchText);
        if (suggestionResults.length > 0) {
          coordinates = await getCoordinatesFromSuggestion(suggestionResults[0]);
        }
      } catch (error) {
        console.warn('Google Maps failed, using fallback:', error);
      }
      if (!coordinates?.lat || !coordinates?.lng) {
        const geocodeResults = await geocodeAddress(searchText);
        coordinates = geocodeResults[0]?.coordinates || null;
      }
      if (!coordinates?.lat || !coordinates?.lng) {
        alert('Could not pin that address. Try a clearer street name or Use Current Location.');
        return;
      }

      const newAddress = await addAddress({
        name: newAddressName,
        address: searchText,
        coordinates,
        source: 'google_enhanced'
      });

      await selectAddress(newAddress);
      setSearchText('');
      setNewAddressName('');
      setShowAddForm(false);
      onClose();
    } catch (error) {
      alert('Error saving address. Please try again.');
    }
  };

  const handleSelectSavedAddress = async (address) => {
    await selectAddress(address);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-96 sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Set your delivery address</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Enhanced Google Maps Search Input */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className={isSearching ? "text-blue-500 animate-pulse" : "text-gray-400"} />
            </div>
            <input
              type="text"
              placeholder="🗺️ Search with Google Maps - restaurants, landmarks, streets..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full py-3 pl-10 pr-4 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white border-2 border-transparent focus:border-red-200"
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
              </div>
            )}
          </div>

          {/* Current Location Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              console.log('🔵 Location button clicked/touched!');
              handleUseCurrentLocation(e);
            }}
            disabled={isLoading}
            style={{ 
              position: 'relative', 
              zIndex: 10,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'rgba(59, 130, 246, 0.2)',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              minHeight: '48px',
              cursor: 'pointer'
            }}
            className="w-full flex items-center justify-center space-x-2 py-3 mb-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Navigation size={18} />
            <span className="font-medium">
              {isLoading ? 'Getting location...' : 'Use Current Location'}
            </span>
          </button>

          {/* Enhanced Google Maps Search Suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>📍 Places</span>
                {suggestions.some(s => s.source === 'google') && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    Google Maps
                  </span>
                )}
              </h3>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left p-3 bg-gray-50 rounded-lg mb-2 hover:bg-gray-100 border border-transparent hover:border-red-200 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1">
                      <MapPin size={16} className="text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-900 font-medium line-clamp-2">
                          {suggestion.address}
                        </div>
                        {suggestion.coordinates && (
                          <div className="text-xs text-gray-500 mt-1">
                            📍 {suggestion.coordinates.lat.toFixed(4)}, {suggestion.coordinates.lng.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>
                    {suggestion.source === 'google' && (
                      <div className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full ml-2">
                        📍 Maps
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Add Custom Address Form */}
          {showAddForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Save this address as:</h3>
              <input
                type="text"
                placeholder="e.g., Home, Work, Friend's place"
                value={newAddressName}
                onChange={(e) => setNewAddressName(e.target.value)}
                className="w-full py-2 px-3 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveCustomAddress}
                  disabled={!newAddressName || !searchText}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Save Address
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Saved Addresses */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Saved Addresses</h3>
            {savedAddresses.map((address) => (
              <div key={address.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <div className="flex items-start space-x-3">
                  <span className="text-lg">{address.icon}</span>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{address.name}</h4>
                    <p className="text-xs text-gray-500">{address.address}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectSavedAddress(address)}
                  className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600"
                >
                  {activeAddress.id === address.id ? (
                    <Check size={12} />
                  ) : (
                    <span>Use</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressModal;