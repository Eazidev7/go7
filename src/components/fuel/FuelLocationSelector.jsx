import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, Shield, CheckCircle, AlertCircle, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FuelAnimations.css';
import fetchAddressSuggestions, {
  getCoordinatesFromSuggestion,
  reverseGeocode,
  isCoarseDeliveryLabel,
} from '../../utils/fetchAddressSuggestions';
import { getDevicePosition } from '../../utils/getDevicePosition';
import { isPoorGpsAccuracy, isUnusableGpsAccuracy } from '../../utils/locationQuality';

export default function FuelLocationSelector({ location, onLocationChange }) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [pinConfirm, setPinConfirm] = useState(null); // { lat, lng, accuracy }
  const pinMapRef = useRef(null);
  const pinMarkerRef = useRef(null);

  // Pin-confirm map — draggable marker over the detected position.
  useEffect(() => {
    if (!pinConfirm || pinMapRef.current?.leafletElement) {
      if (!pinConfirm) return;
    }
    if (pinMapRef.current?.leafletElement) return;
    const map = L.map(pinMapRef.current, { zoomControl: true }).setView(
      [pinConfirm.lat, pinConfirm.lng],
      18
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    const marker = L.marker([pinConfirm.lat, pinConfirm.lng], { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      setPinConfirm((prev) => (prev ? { ...prev, lat: p.lat, lng: p.lng } : prev));
    });
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setPinConfirm((prev) => (prev ? { ...prev, lat: e.latlng.lat, lng: e.latlng.lng } : prev));
    });
    pinMarkerRef.current = marker;
    return () => {
      map.remove();
      pinMarkerRef.current = null;
    };
  }, [pinConfirm !== null]);

  const handleConfirmPin = async () => {
    if (!pinConfirm) return;
    setIsResolving(true);
    let address = 'Pinned location';
    try {
      address = await reverseGeocode(pinConfirm.lat, pinConfirm.lng);
    } catch (err) {
      console.warn('Reverse geocode failed:', err);
    }
    handleLocationSelect({ lat: pinConfirm.lat, lng: pinConfirm.lng, address });
    setPinConfirm(null);
    setIsResolving(false);
  };

  useEffect(() => {
    if (searchText.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await fetchAddressSuggestions(searchText.trim());
        setSuggestions(results || []);
      } catch (error) {
        console.error('Address search failed:', error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleLocationSelect = (selectedLocation) => {
    onLocationChange(selectedLocation);
    setIsSelecting(false);
    setSearchText('');
    setSuggestions([]);
  };

  const handleSelectSuggestion = async (suggestion) => {
    setIsResolving(true);
    try {
      const address = suggestion.description || suggestion.display_name || suggestion.address || '';
      const coordinates = await getCoordinatesFromSuggestion(suggestion);

      if (!coordinates?.lat || !coordinates?.lng) {
        toast.error('Could not find that address', {
          description: 'Try another suggestion, or use current location',
        });
        return;
      }

      if (isCoarseDeliveryLabel(address)) {
        toast.error('Pick a more precise address', {
          description: 'Street name or landmark — not just the area/LGA',
        });
        return;
      }

      handleLocationSelect({ lat: coordinates.lat, lng: coordinates.lng, address });
    } catch (error) {
      console.error('Failed to use suggestion:', error);
      toast.error('Could not use that address', { description: 'Please try another result' });
    } finally {
      setIsResolving(false);
    }
  };

  const handleCurrentLocation = async () => {
    setIsDetecting(true);
    const loadingToast = toast.loading('Getting your current location...');
    try {
      const pos = await getDevicePosition();
      const { latitude, longitude, accuracy } = pos;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Invalid GPS reading');
      }

      toast.dismiss(loadingToast);

      if (isUnusableGpsAccuracy(accuracy) || isPoorGpsAccuracy(accuracy)) {
        // Weak GPS — open the pin-confirm map so the customer can drag the
        // marker onto their real house instead of trusting a coarse reading.
        setPinConfirm({ lat: latitude, lng: longitude, accuracy });
        return;
      }

      let address = 'Current Location';
      try {
        address = await reverseGeocode(latitude, longitude);
      } catch (err) {
        console.warn('Reverse geocode failed:', err);
      }

      handleLocationSelect({ lat: latitude, lng: longitude, address });
    } catch (error) {
      toast.dismiss(loadingToast);
      const message =
        error?.code === 1 ? 'Location permission denied. Please allow location access or search your address.' :
        error?.code === 2 ? 'Could not get your location. Try searching your address.' :
        'Location request failed. Try searching your address.';
      toast.error(message);
      console.error('Error getting location:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500">Delivery Location</p>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Shield className="w-3 h-3" />
          <span>Secure</span>
        </div>
      </div>

      {location?.address ? (
        <div className={`flex items-start gap-3 p-3 rounded-xl border animate-slide-in ${
          location?.serviceable === false
            ? 'bg-red-50 border-red-200'
            : 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            location?.serviceable === false ? 'bg-red-500' : 'bg-green-500 animate-bounce'
          }`}>
            {location?.serviceable === false ? (
              <AlertCircle className="w-5 h-5 text-white" />
            ) : (
              <CheckCircle className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{location.address}</p>
            <p className="text-xs text-gray-500">
              {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}
            </p>
            {location?.stationName && (
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                Nearest: {location.stationName} • {location.distanceKm?.toFixed(1)} km
              </p>
            )}
            {location?.serviceable === false && location?.serviceError && (
              <p className="text-[10px] text-red-600 mt-1">{location.serviceError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSelecting(true)}
            className="text-[#E53935] text-sm font-semibold hover:text-[#E53935]/80 transition-colors flex-shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isDetecting}
            className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-[#E53935]/5 to-[#E53935]/10 rounded-xl border-2 border-[#E53935]/20 hover:border-[#E53935]/40 transition-all duration-300 group disabled:opacity-60"
          >
            <div className="w-10 h-10 bg-[#E53935] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              {isDetecting ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Navigation className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#E53935]">
                {isDetecting ? 'Detecting location...' : 'Use Current Location'}
              </p>
              <p className="text-xs text-gray-500">Fast & Accurate</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsSelecting(true)}
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 group"
          >
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center group-hover:bg-gray-300 transition-colors duration-300">
              <Search className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-700">Search Address</p>
              <p className="text-xs text-gray-500">Type your delivery address</p>
            </div>
          </button>
        </div>
      )}

      {/* Delivery info cards */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-blue-600" />
              <span className="text-[10px] font-semibold text-blue-600">Fast Delivery</span>
            </div>
            <p className="text-[10px] text-blue-700">30-45 mins avg</p>
          </div>
          <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="w-3 h-3 text-purple-600" />
              <span className="text-[10px] font-semibold text-purple-600">Safe & Secure</span>
            </div>
            <p className="text-[10px] text-purple-700">Verified riders</p>
          </div>
        </div>
      </div>

      {/* Address Search Modal */}
      {isSelecting && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
          <div className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-slide-up">
            <div className="p-4 border-b shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Search Delivery Address</h3>
                <button
                  type="button"
                  onClick={() => { setIsSelecting(false); setSearchText(''); setSuggestions([]); }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Type street name, area, or landmark"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E53935]/40 focus:border-[#E53935] text-sm"
                />
              </div>

              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={isDetecting}
                className="w-full flex items-center justify-center gap-2 mt-3 py-2.5 rounded-xl border-2 border-[#E53935]/20 text-[#E53935] text-sm font-semibold hover:border-[#E53935]/40 transition-colors disabled:opacity-60"
              >
                {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                Use Current Location Instead
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isSearching && (
                <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </div>
              )}

              {!isSearching && searchText.trim().length >= 3 && suggestions.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">No results found. Try a different search.</p>
              )}

              {!isSearching && suggestions.map((suggestion, idx) => (
                <button
                  key={suggestion.place_id || suggestion.id || idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  disabled={isResolving}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
                >
                  <MapPin className="w-4 h-4 text-[#E53935] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-800">
                    {suggestion.description || suggestion.display_name || suggestion.address}
                  </span>
                </button>
              ))}

              {searchText.trim().length < 3 && (
                <p className="text-center text-sm text-gray-400 py-6">Type at least 3 characters to search</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pin-confirm map — weak GPS escape */}
      {pinConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-[60] animate-fade-in">
          <div className="bg-white rounded-t-3xl w-full overflow-hidden flex flex-col animate-slide-up">
            <div className="p-4 border-b shrink-0">
              <h3 className="text-lg font-bold">Confirm your exact location</h3>
              <p className="text-xs text-gray-500 mt-1">
                GPS accuracy is low
                {Number.isFinite(pinConfirm.accuracy) ? ` (~${Math.round(pinConfirm.accuracy)}m)` : ''}.
                Drag the pin or tap the map to drop it on your house.
              </p>
            </div>
            <div ref={pinMapRef} className="w-full" style={{ height: '55vh' }} />
            <div className="p-4 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setPinConfirm(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPin}
                disabled={isResolving}
                className="flex-1 py-3 rounded-xl bg-[#E53935] text-white text-sm font-bold hover:bg-[#c62828] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Use this location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
