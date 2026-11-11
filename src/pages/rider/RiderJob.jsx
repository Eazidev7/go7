import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  updateOrderStatus,
  verifyOtp,
  completeDelivery,
  getCurrentJob,
  startRiderLocationLoop,
  stopRiderLocationLoop,
} from '../../services/riderService';
import RiderJobMap from '../../components/rider/RiderJobMap';
import { useRiderGeolocation } from '../../hooks/useRiderGeolocation';
import {
  getDropoffLabel,
  getDropoffPhone,
  getJobLineItems,
  getJobTypeLabel,
  getPickupLabel,
  getPickupPhone,
  formatJobItemLine,
  openGoogleMapsNavigation,
  pickCoords,
} from '../../utils/riderJobUtils';
import { isAndroidApp } from '../../utils/nativePlatform';
import { startNativeNavigation } from '../../services/nativeNavigation';
import {
  MapPin,
  Navigation,
  Check,
  Package,
  Phone,
  MessageCircle,
  AlertCircle,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import Swal from 'sweetalert2';

const RiderJob = () => {
  const { orderId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [riderLocation, setRiderLocation] = useState(null);
  const [gpsError, setGpsError] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [navTarget, setNavTarget] = useState(null);
  const [nativeNavLoading, setNativeNavLoading] = useState(false);

  const riderId = currentUser?.uid;

  const handleLocation = useCallback((loc) => {
    setRiderLocation(loc);
    setGpsError(false);
  }, []);

  const handleLocationError = useCallback(() => {
    setGpsError(true);
  }, []);

  useRiderGeolocation(handleLocation, handleLocationError);

  const autoDestinationMode = useMemo(() => {
    const s = String(job?.status || '').toLowerCase();
    if (['picked', 'enroute', 'en_route', 'in_transit', 'arrived_dropoff'].includes(s)) {
      return 'dropoff';
    }
    return 'pickup';
  }, [job?.status]);

  const destinationMode = navTarget || autoDestinationMode;

  useEffect(() => {
    if (!riderId) {
      navigate('/rider/login');
      return;
    }
    loadJobData();

    return () => {
      stopRiderLocationLoop();
    };
  }, [riderId, orderId]);

  useEffect(() => {
    if (riderId && orderId && riderLocation) {
      startRiderLocationLoop(riderId, orderId);
    }
  }, [riderId, orderId, riderLocation?.lat, riderLocation?.lng]);

  const loadJobData = async () => {
    try {
      setLoading(true);
      const jobData = await getCurrentJob(riderId);
      if (!jobData || jobData.id !== orderId) {
        navigate('/rider/dashboard');
        return;
      }
      setJob(jobData);
    } catch (error) {
      console.error('Error loading job:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = () => {
    // Re-triggered by useRiderGeolocation on mount; kept for GPS error retry button
    setGpsError(false);
  };

  const handleUpdateStatus = async (newStatus, message) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setNavTarget(null);
      await loadJobData();
      Swal.fire({
        icon: 'success',
        title: message,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update status' });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.length < 4) {
      Swal.fire({ icon: 'warning', title: 'Invalid PIN', text: 'Please enter the customer delivery PIN' });
      return;
    }

    try {
      const isValid = await verifyOtp(orderId, otpInput);
      if (isValid) {
        const result = await completeDelivery(orderId, riderId);
        Swal.fire({
          icon: 'success',
          title: 'Delivery Completed!',
          html: `<p>You earned <strong>₦${result?.earnings ?? job?.deliveryFee ?? 0}</strong></p>`,
          confirmButtonText: 'Back to Dashboard',
        }).then(() => navigate('/rider/dashboard'));
      } else {
        Swal.fire({ icon: 'error', title: 'Invalid OTP', text: 'Please try again.' });
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to verify OTP.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-red-500" />
      </div>
    );
  }

  if (!job) return null;

  const pickupPhone = getPickupPhone(job);
  const dropoffPhone = getDropoffPhone(job);
  const pickupCoords = pickCoords(job, 'pickup');
  const dropoffCoords = pickCoords(job, 'dropoff');
  const pickupLabel = getPickupLabel(job);
  const dropoffLabel = getDropoffLabel(job);
  const lineItems = getJobLineItems(job);
  const jobTypeLabel = getJobTypeLabel(job);

  const activeCoords = destinationMode === 'pickup' ? pickupCoords : dropoffCoords;
  const activeLabel = destinationMode === 'pickup' ? pickupLabel : dropoffLabel;

  const handleStartNativeNavigation = async () => {
    if (!activeCoords?.lat || !activeCoords?.lng) {
      Swal.fire({
        icon: 'warning',
        title: 'No destination',
        text: 'This stop does not have map coordinates yet.',
      });
      return;
    }

    setNativeNavLoading(true);
    try {
      const result = await startNativeNavigation({
        lat: activeCoords.lat,
        lng: activeCoords.lng,
        title: activeLabel,
        travelMode: 'TWO_WHEELER',
      });

      if (!result.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Navigation unavailable',
          text: 'Use the in-app map or open Google Maps as backup.',
        });
      }
    } finally {
      setNativeNavLoading(false);
    }
  };

  return (
    <div className="go7-tracking-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* In-app navigation map — Uber-style full screen top */}
      <div className={`relative flex-shrink-0 transition-all duration-300 ${sheetExpanded ? 'h-[40dvh]' : 'h-[calc(72dvh-var(--go7-safe-top)-var(--go7-safe-bottom))]'}`}>
        <button
          type="button"
          onClick={() => navigate('/rider/dashboard')}
          className="go7-tracking-back-btn absolute left-4 z-[600] w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>

        <RiderJobMap
          job={job}
          riderLocation={riderLocation}
          destinationMode={destinationMode}
          navigationMode
        />

        {gpsError && (
          <div className="absolute bottom-4 left-4 right-4 z-[600] bg-yellow-50 border border-yellow-300 rounded-xl p-3 flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-900">GPS needed for in-app navigation</p>
              <button type="button" onClick={startLocationTracking} className="text-xs underline text-yellow-800 mt-1">
                Enable location
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible bottom sheet */}
      <div className="flex-1 relative z-10 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.2)] flex flex-col min-h-0">
        <button
          type="button"
          onClick={() => setSheetExpanded((v) => !v)}
          className="w-full pt-3 pb-2 flex flex-col items-center flex-shrink-0"
          aria-label={sheetExpanded ? 'Collapse details' : 'Expand details'}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
          {sheetExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <div className="flex-1 overflow-y-auto px-4 go7-tracking-sheet-actions">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Active delivery</p>
              <h1 className="text-lg font-bold text-gray-900">{job.bookingId || job.id}</h1>
              <p className="text-sm text-gray-500 capitalize">
                {jobTypeLabel} · {String(job.status || 'assigned').replace(/_/g, ' ')}
              </p>
              {job.vendorName ? (
                <p className="text-xs text-gray-500 mt-0.5">{job.vendorName}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Fee</p>
              <p className="text-xl font-bold text-green-600">
                ₦{(job.deliveryFee || job.fare || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Route target toggles — switches in-app navigation */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setNavTarget('pickup')}
              className={`p-3 rounded-xl text-left border-2 transition-colors ${
                destinationMode === 'pickup'
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="text-xs font-semibold text-green-700 mb-0.5">Navigate to Pickup</p>
              <p className="text-xs text-gray-600 line-clamp-2">{pickupLabel}</p>
            </button>
            <button
              type="button"
              onClick={() => setNavTarget('dropoff')}
              className={`p-3 rounded-xl text-left border-2 transition-colors ${
                destinationMode === 'dropoff'
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="text-xs font-semibold text-red-700 mb-0.5">Navigate to Customer</p>
              <p className="text-xs text-gray-600 line-clamp-2">{dropoffLabel}</p>
            </button>
          </div>

          {isAndroidApp() && activeCoords?.lat && activeCoords?.lng ? (
            <button
              type="button"
              onClick={handleStartNativeNavigation}
              disabled={nativeNavLoading}
              className="w-full mb-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg"
            >
              <Navigation className="w-5 h-5" />
              {nativeNavLoading ? 'Starting navigation…' : 'Start Driving Navigation'}
            </button>
          ) : null}

          <div className="space-y-3 mb-4">
            <div className="flex gap-3 p-3 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-green-800 mb-0.5">Pickup</p>
                <p className="text-sm text-gray-900 break-words">{pickupLabel}</p>
                {pickupPhone && (
                  <a href={`tel:${pickupPhone}`} className="text-sm text-green-700 font-medium mt-1 inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {pickupPhone}
                  </a>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-gray-50 rounded-xl">
              <Navigation className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-red-800 mb-0.5">Customer</p>
                <p className="text-sm text-gray-900 break-words">{dropoffLabel}</p>
                {dropoffPhone && (
                  <a href={`tel:${dropoffPhone}`} className="text-sm text-red-700 font-medium mt-1 inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {dropoffPhone}
                  </a>
                )}
              </div>
            </div>

            {lineItems.length > 0 ? (
              <div className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <Package className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-amber-900 mb-1">
                    {jobTypeLabel === 'Food Order' ? 'Food to pick up' : 'Package contents'}
                  </p>
                  <ul className="space-y-1">
                    {lineItems.map((item, index) => (
                      <li key={index} className="text-sm text-gray-900">
                        {formatJobItemLine(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 mb-4">
            {job.status === 'accepted' || job.status === 'assigned' ? (
              <button
                type="button"
                onClick={() => handleUpdateStatus('arrived_pickup', 'Arrived at pickup')}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" /> Arrived at Pickup
              </button>
            ) : null}
            {job.status === 'arrived_pickup' ? (
              <button
                type="button"
                onClick={() => handleUpdateStatus('picked', 'Package picked up')}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <Package className="w-5 h-5" /> Package Picked Up
              </button>
            ) : null}
            {job.status === 'picked' ? (
              <button
                type="button"
                onClick={() => handleUpdateStatus('enroute', 'On the way')}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <Navigation className="w-5 h-5" /> On the Way to Customer
              </button>
            ) : null}
            {job.status === 'enroute' || job.status === 'en_route' ? (
              <button
                type="button"
                onClick={() => handleUpdateStatus('arrived_dropoff', 'Arrived at customer')}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" /> Arrived at Customer
              </button>
            ) : null}
          </div>

          {job.status === 'arrived_dropoff' && (
            <div className="mb-4 p-4 border-2 border-gray-200 rounded-2xl">
              <p className="font-semibold text-gray-900 mb-2">Enter customer OTP</p>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit OTP"
                className="w-full text-center text-2xl font-bold tracking-widest border-2 border-gray-200 rounded-xl py-3 mb-3"
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Complete Delivery
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate(`/chat/${orderId}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 text-blue-700 font-medium mb-3"
          >
            <MessageCircle className="w-5 h-5" /> Chat with Customer
          </button>

          <button
            type="button"
            onClick={() => openGoogleMapsNavigation(riderLocation, activeCoords, activeLabel)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Maps app (backup)
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiderJob;
