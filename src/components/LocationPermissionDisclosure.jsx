import React, { useEffect, useState } from 'react';
import { getDevicePosition } from '../utils/getDevicePosition';
import { useLocation } from '../contexts/LocationContext';

const DISCLOSURE_KEY = 'go7_location_disclosure_shown';
const PERMISSION_KEY = 'go7_location_permission';

export default function LocationPermissionDisclosure() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { selectAddress } = useLocation();

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISCLOSURE_KEY)) {
        setVisible(true);
      }
    } catch {
      // private mode / restricted storage
    }
  }, []);

  if (!visible) return null;

  const persist = (permission) => {
    try {
      localStorage.setItem(DISCLOSURE_KEY, '1');
      localStorage.setItem(PERMISSION_KEY, permission);
    } catch {
      // ignore storage errors
    }
  };

  const handleAllow = async () => {
    setLoading(true);
    try {
      const pos = await getDevicePosition();
      const address = {
        id: 'gps',
        name: 'Current Location',
        address: 'Current Location',
        lat: pos.latitude,
        lng: pos.longitude,
        coordinates: { lat: pos.latitude, lng: pos.longitude },
        fromGps: true,
        gpsAccuracy: pos.accuracy,
        pinConfirmed: true,
      };
      selectAddress?.(address);
      persist('granted');
    } catch (err) {
      console.warn('[LocationDisclosure] Permission denied or GPS failed:', err);
      persist('denied');
    } finally {
      setLoading(false);
      setVisible(false);
    }
  };

  const handleSkip = () => {
    persist('denied');
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-2 text-lg font-bold text-gray-900">Allow location access?</h2>
        <p className="mb-6 text-sm text-gray-600">
          Go7 uses your location to show nearby shops and restaurants, calculate accurate delivery fees, and track your delivery progress. You can change this in your device settings later.
        </p>

        <button
          type="button"
          onClick={handleAllow}
          disabled={loading}
          className="mb-3 w-full rounded-xl bg-[#E53935] py-3 text-sm font-semibold text-white hover:bg-[#E53935]/90 disabled:opacity-60"
        >
          {loading ? 'Detecting location...' : 'Allow location access'}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={loading}
          className="w-full rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
