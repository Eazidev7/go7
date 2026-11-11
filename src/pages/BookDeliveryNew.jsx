import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import {
  getCustomerWalletInfo,
  payForDeliveryWithWallet,
  formatCurrency,
  hasSufficientBalance
} from '../services/customerWalletService';
import { Helmet } from 'react-helmet-async';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import { bookDelivery } from '../services/deliveryService';

// MapTiler API configuration
const MAPTILER_API_KEY = 'nRGZ9lGblbV9lFK2KclL';
const MAPTILER_STYLE_URL = 'https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/style.json?key=nRGZ9lGblbV9lFK2KclL';
const GEOCODING_API_URL = 'https://api.maptiler.com/geocoding';

// Abeokuta coordinates
const ABEOKUTA_CENTER = [7.1516, 3.3467];

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const pickupIcon = createIcon('#E53935'); // Red for pickup
const dropoffIcon = createIcon('#4CAF50'); // Green for dropoff

// Component for handling map clicks and routing
const MapEventHandler = ({ onMapClick, pickupCoords, dropoffCoords }) => {
  const map = useMap();

  useMapEvents({
    click: onMapClick,
  });

  // Draw route line when both points are set
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const routeLine = L.polyline([pickupCoords, dropoffCoords], {
        color: '#E53935',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(map);

      // Fit map to show both points
      const group = new L.featureGroup([
        L.marker(pickupCoords),
        L.marker(dropoffCoords),
        routeLine
      ]);
      map.fitBounds(group.getBounds().pad(0.1));

      return () => {
        map.removeLayer(routeLine);
      };
    }
  }, [map, pickupCoords, dropoffCoords]);

  return null;
};

// Address suggestion component
const AddressSuggestions = ({ suggestions, onSelect, show }) => {
  if (!show || !suggestions.length) return null;

  return (
    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
          onClick={() => onSelect(suggestion)}
        >
          <div className="font-medium text-gray-900">{suggestion.place_name}</div>
          <div className="text-sm text-gray-600">{suggestion.context?.join(', ')}</div>
        </div>
      ))}
    </div>
  );
};

const BookDelivery = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // Location states
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');

  // Suggestion states
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);

  // Distance and pricing
  const [distance, setDistance] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce timers
  const pickupTimeoutRef = useRef();
  const dropoffTimeoutRef = useRef();

  // Fetch address suggestions from MapTiler
  const fetchSuggestions = async (query, type) => {
    if (!query || query.length < 3) {
      if (type === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
      }
      return;
    }

    try {
      const response = await fetch(
        `${GEOCODING_API_URL}/${encodeURIComponent(query)}.json?key=${MAPTILER_API_KEY}&proximity=3.3467,7.1516&country=NG&limit=5`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();

      if (type === 'pickup') {
        setPickupSuggestions(data.features || []);
        setShowPickupSuggestions(true);
      } else {
        setDropoffSuggestions(data.features || []);
        setShowDropoffSuggestions(true);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  // Handle address input changes with debouncing
  const handleAddressChange = (value, type) => {
    if (type === 'pickup') {
      setPickupAddress(value);
      clearTimeout(pickupTimeoutRef.current);
      pickupTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(value, 'pickup');
      }, 300);
    } else {
      setDropoffAddress(value);
      clearTimeout(dropoffTimeoutRef.current);
      dropoffTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(value, 'dropoff');
      }, 300);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion, type) => {
    const coords = [suggestion.center[1], suggestion.center[0]]; // MapTiler returns [lon, lat]

    if (type === 'pickup') {
      setPickupAddress(suggestion.place_name);
      setPickupCoords(coords);
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
    } else {
      setDropoffAddress(suggestion.place_name);
      setDropoffCoords(coords);
      setDropoffSuggestions([]);
      setShowDropoffSuggestions(false);
    }
  };

  // Get current location
  const getCurrentLocation = (type) => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: 'error',
        title: 'Location not supported',
        text: 'Your browser doesn\'t support location services.'
      });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `${GEOCODING_API_URL}/${longitude},${latitude}.json?key=${MAPTILER_API_KEY}`
          );
          const data = await response.json();
          const address = data.features[0]?.place_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          if (type === 'pickup') {
            setPickupCoords(coords);
            setPickupAddress(address);
          } else {
            setDropoffCoords(coords);
            setDropoffAddress(address);
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          if (type === 'pickup') {
            setPickupCoords(coords);
            setPickupAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          } else {
            setDropoffCoords(coords);
            setDropoffAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        }

        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Location Error',
          text: 'Could not get your current location. Please try again or enter manually.'
        });
      }
    );
  };

  // Handle map clicks
  const handleMapClick = (e) => {
    const coords = [e.latlng.lat, e.latlng.lng];

    if (!pickupCoords) {
      setPickupCoords(coords);
      // Reverse geocode for address
      reverseGeocode(coords, 'pickup');
    } else if (!dropoffCoords) {
      setDropoffCoords(coords);
      // Reverse geocode for address
      reverseGeocode(coords, 'dropoff');
    } else {
      // Ask user which point to replace
      Swal.fire({
        title: 'Replace Location?',
        text: 'Both pickup and dropoff are set. Which would you like to replace?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Replace Dropoff',
        cancelButtonText: 'Replace Pickup',
        confirmButtonColor: '#E53935'
      }).then((result) => {
        if (result.isConfirmed) {
          setDropoffCoords(coords);
          reverseGeocode(coords, 'dropoff');
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          setPickupCoords(coords);
          reverseGeocode(coords, 'pickup');
        }
      });
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (coords, type) => {
    try {
      const response = await fetch(
        `${GEOCODING_API_URL}/${coords[1]},${coords[0]}.json?key=${MAPTILER_API_KEY}`
      );
      const data = await response.json();
      const address = data.features[0]?.place_name || `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;

      if (type === 'pickup') {
        setPickupAddress(address);
      } else {
        setDropoffAddress(address);
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
    const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate price based on distance
  const calculatePrice = (distance) => {
    const baseFare = 700;
    const additionalKm = Math.max(0, distance - 3);
    return baseFare + (additionalKm * 100);
  };

  // Update distance and price when coordinates change
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const dist = calculateDistance(pickupCoords, dropoffCoords);
      setDistance(dist);
      setEstimatedPrice(calculatePrice(dist));
    } else {
      setDistance(0);
      setEstimatedPrice(0);
    }
  }, [pickupCoords, dropoffCoords]);

  // Handle booking
  const handleBookDelivery = async () => {
    if (!pickupCoords || !dropoffCoords) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Locations',
        text: 'Please select both pickup and dropoff locations.'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Booking',
      html: `
        <div class="text-left">
          <p><strong>From:</strong> ${pickupAddress}</p>
          <p><strong>To:</strong> ${dropoffAddress}</p>
          <p><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
          <p><strong>Price:</strong> ₦${estimatedPrice.toLocaleString()}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Book Now',
      confirmButtonColor: '#E53935'
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);

      try {
        const deliveryData = {
          pickup: {
            address: pickupAddress,
            lat: pickupCoords[0],
            lng: pickupCoords[1]
          },
          dropoff: {
            address: dropoffAddress,
            lat: dropoffCoords[0],
            lng: dropoffCoords[1]
          },
          distance: distance,
          price: estimatedPrice,
          customerInfo: {
            name: user?.displayName || 'Guest',
            phone: user?.phoneNumber || '',
            email: user?.email || ''
          }
        };

        const deliveryId = await bookDelivery(deliveryData);

        Swal.fire({
          icon: 'success',
          title: 'Booking Confirmed!',
          text: `Your delivery has been booked. Tracking ID: ${deliveryId}`
        });

        // Navigate to tracking page
        navigate(`/track/${deliveryId}`);

      } catch (error) {
        console.error('Booking error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Booking Failed',
          text: 'Something went wrong. Please try again.'
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Helmet>
        <title>Book a Delivery | Go7</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Delivery</h1>
          <p className="text-gray-600">Fast, reliable delivery across Abeokuta</p>
        </div>

        {/* Address Fields */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="space-y-4">
            {/* Pickup Address */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📍 Pickup Location
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => handleAddressChange(e.target.value, 'pickup')}
                    placeholder="Enter pickup address..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                  <AddressSuggestions
                    suggestions={pickupSuggestions}
                    onSelect={(suggestion) => handleSuggestionSelect(suggestion, 'pickup')}
                    show={showPickupSuggestions}
                  />
                </div>
                <button
                  onClick={() => getCurrentLocation('pickup')}
                  disabled={isLoading}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  📍
                </button>
              </div>
            </div>

            {/* Dropoff Address */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎯 Dropoff Location
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={dropoffAddress}
                    onChange={(e) => handleAddressChange(e.target.value, 'dropoff')}
                    placeholder="Enter dropoff address..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                  <AddressSuggestions
                    suggestions={dropoffSuggestions}
                    onSelect={(suggestion) => handleSuggestionSelect(suggestion, 'dropoff')}
                    show={showDropoffSuggestions}
                  />
                </div>
                <button
                  onClick={() => getCurrentLocation('dropoff')}
                  disabled={isLoading}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  📍
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={ABEOKUTA_CENTER}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="rounded-lg"
            >
              <TileLayer
                url={`https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`}
                attribution='© MapTiler © OpenStreetMap contributors'
              />

              {pickupCoords && (
                <Marker position={pickupCoords} icon={pickupIcon}>
                  <Popup>
                    <div className="text-center">
                      <strong>Pickup Location</strong><br />
                      {pickupAddress}
                    </div>
                  </Popup>
                </Marker>
              )}

              {dropoffCoords && (
                <Marker position={dropoffCoords} icon={dropoffIcon}>
                  <Popup>
                    <div className="text-center">
                      <strong>Dropoff Location</strong><br />
                      {dropoffAddress}
                    </div>
                  </Popup>
                </Marker>
              )}

              <MapEventHandler
                onMapClick={handleMapClick}
                pickupCoords={pickupCoords}
                dropoffCoords={dropoffCoords}
              />
            </MapContainer>
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            💡 Click on the map to set pickup and dropoff locations
          </div>
        </div>

        {/* Distance and Price Display */}
        {distance > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{distance.toFixed(2)} km</div>
                <div className="text-sm text-gray-600">Distance</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">₦{estimatedPrice.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Estimated Price</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Base fare:</span>
                  <span>₦700</span>
                </div>
                {distance > 3 && (
                  <div className="flex justify-between">
                    <span>Additional {(distance - 3).toFixed(2)} km @ ₦100/km:</span>
                    <span>₦{((distance - 3) * 100).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Book Delivery Button */}
        <button
          onClick={handleBookDelivery}
          disabled={!pickupCoords || !dropoffCoords || isSubmitting}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Booking...' : 'Book Delivery'}
        </button>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Type addresses in the fields above or click 📍 for current location</li>
            <li>• Click on the map to set pickup (red) and dropoff (green) points</li>
            <li>• Review distance and price estimate</li>
            <li>• Click "Book Delivery" to confirm your order</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BookDelivery;