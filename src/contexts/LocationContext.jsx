import React, { createContext, useContext, useState, useEffect } from 'react';
import { sanitizeDeliveryLabel, isCoarseDeliveryLabel } from '../utils/fetchAddressSuggestions';
import {
  extractCoordsFromAddress,
  hasValidCoords,
  logLocation,
  readActiveAddressFromStorage,
} from '../utils/locationQuality';

async function getFirebase() {
  const [{ auth, db }, firestore] = await Promise.all([
    import('../firebase/config'),
    import('firebase/firestore'),
  ]);
  return { auth, db, doc: firestore.doc, getDoc: firestore.getDoc, setDoc: firestore.setDoc };
}

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const readStoredActiveAddress = () => readActiveAddressFromStorage();

  const [activeAddress, setActiveAddress] = useState(() => {
    const stored = readStoredActiveAddress();
    if (stored) {
      const coords = stored.coordinates;
      const hasRealCoords = hasValidCoords(coords);

      let address = stored.address;
      if (
        hasRealCoords &&
        (isCoarseDeliveryLabel(address) || /ode[\s-]*da|odeda/i.test(String(address || '')))
      ) {
        address = sanitizeDeliveryLabel(address, coords.lat, coords.lng);
        logLocation('hydrate:sanitized-stale', { from: stored.address, to: address });
        try {
          localStorage.setItem(
            'go7ActiveAddress',
            JSON.stringify({ ...stored, address, coordinates: hasRealCoords ? coords : null })
          );
        } catch {
          /* ignore */
        }
      }

      return {
        id: stored.id || 'active',
        name: stored.name || 'Delivery',
        address,
        coordinates: hasRealCoords ? coords : null,
        isDefault: false,
        fromGps: Boolean(stored.fromGps),
        gpsAccuracy: stored.gpsAccuracy ?? null,
        pinConfirmed: Boolean(stored.pinConfirmed),
      };
    }
    return {
      id: 'default',
      name: 'Set delivery address',
      address: 'Tap to set your address',
      coordinates: null,
      isDefault: true,
      fromGps: false,
      gpsAccuracy: null,
      pinConfirmed: false,
    };
  });
  
  const [savedAddresses, setSavedAddresses] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  // Load user's saved addresses from Firebase
  useEffect(() => {
    const loadUserAddresses = async () => {
      const { auth, db, doc, getDoc } = await getFirebase();
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const stored = readStoredActiveAddress();
            if (userData.savedAddresses) {
              setSavedAddresses(userData.savedAddresses);
            }
            // Don't overwrite a freshly chosen local/GPS address with stale Firestore data
            if (userData.activeAddress && !stored) {
              setActiveAddress(userData.activeAddress);
            }
          }
        } catch (error) {
          console.log('Error loading addresses:', error);
        }
      }
    };

    loadUserAddresses();
  }, []);

  // Save addresses to Firebase
  const saveAddressesToFirebase = async (addresses, active) => {
    const { auth, db, doc, setDoc } = await getFirebase();
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          savedAddresses: addresses,
          activeAddress: active
        }, { merge: true });
      } catch (error) {
        console.log('Error saving addresses:', error);
      }
    }
  };

  // Add new address
  const addAddress = async (addressData) => {
    const newAddress = {
      id: Date.now().toString(),
      ...addressData,
      icon: '📍'
    };
    
    const updatedAddresses = [...savedAddresses, newAddress];
    setSavedAddresses(updatedAddresses);
    await saveAddressesToFirebase(updatedAddresses, activeAddress);
    
    return newAddress;
  };

  // Set active address — always prefer exact lat/lng; never invent city-center
  const selectAddress = async (address) => {
    const coordinates = extractCoordsFromAddress(address);
    if (!coordinates) {
      logLocation('selectAddress:blocked-missing-coords', { address: address?.address });
      console.warn('selectAddress blocked: missing precise coordinates');
      return;
    }
    const normalized = {
      ...address,
      fromGps: Boolean(address.fromGps),
      gpsAccuracy: address.gpsAccuracy ?? address.accuracy ?? null,
      pinConfirmed: Boolean(address.pinConfirmed),
      coordinates,
    };
    logLocation('selectAddress', {
      address: normalized.address,
      coordinates,
      gpsAccuracy: normalized.gpsAccuracy,
      pinConfirmed: normalized.pinConfirmed,
    });
    setActiveAddress(normalized);
    try {
      localStorage.setItem('go7ActiveAddress', JSON.stringify(normalized));
      localStorage.setItem('go7SelectedLocation', normalized.id || 'active');
    } catch (e) {
      console.warn('Could not persist active address locally:', e);
    }
    void saveAddressesToFirebase(savedAddresses, normalized);
  };

  // Get current location using GPS
  const getCurrentLocation = () => {
    console.log('🌍 getCurrentLocation called');
    console.log('📱 User agent:', navigator.userAgent);
    console.log('🔒 Protocol:', window.location.protocol);
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported');
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      console.log('📍 Requesting geolocation...');
      console.log('⚙️ Options: { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }');
      setIsLoading(true);
      
      // Enhanced options for mobile devices
      const options = {
        enableHighAccuracy: true,  // Use GPS if available
        timeout: 30000,            // 30 seconds timeout
        maximumAge: 0              // Don't use cached position
      };
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          console.log('✅ Location obtained:', coords);
          console.log('📍 Accuracy:', coords.accuracy, 'meters');
          setIsLoading(false);
          resolve(coords);
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          console.error('❌ Error code:', error.code);
          console.error('❌ Error message:', error.message);
          
          // Log specific error types
          if (error.code === 1) console.error('❌ PERMISSION_DENIED');
          if (error.code === 2) console.error('❌ POSITION_UNAVAILABLE');
          if (error.code === 3) console.error('❌ TIMEOUT');
          
          setIsLoading(false);
          
          // Create a more detailed error object
          const detailedError = new Error(error.message);
          detailedError.code = error.code;
          detailedError.PERMISSION_DENIED = 1;
          detailedError.POSITION_UNAVAILABLE = 2;
          detailedError.TIMEOUT = 3;
          
          reject(detailedError);
        },
        options
      );
    });
  };

  // Geocode address using a free service (nominatim)
  const geocodeAddress = async (addressText) => {
    try {
      setIsLoading(true);
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 6000) : null;
      let response;
      try {
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressText)}&limit=5&countrycodes=NG`,
          { signal: controller?.signal }
        );
      } finally {
        clearTimeout(timer);
      }
      const data = await response.json();
      
      const suggestions = data.map(item => ({
        address: item.display_name,
        coordinates: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }
      }));
      
      setIsLoading(false);
      return suggestions;
    } catch (error) {
      setIsLoading(false);
      console.error('Geocoding error:', error);
      return [];
    }
  };

  const value = {
    activeAddress,
    savedAddresses,
    isLoading,
    addAddress,
    selectAddress,
    getCurrentLocation,
    geocodeAddress
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};