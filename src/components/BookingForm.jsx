import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingFormSchema, findBestRider } from "../lib/bookingSchema";
import { currencyFormatNGN, formatDistance } from "../utils/pricing";
import { hasValidCoordinates, getAreaCoordinates } from "../utils/areaCoords";
import FareEstimator from "./FareEstimator";
import { useFareEstimator } from "../hooks/useFareEstimator";
import { getRouteMetrics } from "../utils/directions";
import AddressAutocomplete from "./AddressAutocomplete";
import DistanceSummary from "./DistanceSummary";
import { calculateHaversineDistance, estimateTravelTime } from "../utils/distanceCalculator";
import PackageDetection from "./PackageDetection";
// import toast from "react-hot-toast";

// Helper to calculate ETA based on distance and speed
const calculateETA = (distanceKm, speedKmh = 20) => {
  if (!distanceKm) return null;
  const timeHours = distanceKm / speedKmh;
  const timeMinutes = Math.ceil(timeHours * 60);
  return timeMinutes;
};

const BookingForm = ({
  onActiveFieldChange,
  onLocationSet,
  distanceKm,
  fare,
  isCalculating = false,
  hasRequiredFields = false,
  onSubmitSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeField, setActiveField] = useState('pickup');
  const [showAIDetection, setShowAIDetection] = useState(false);
  const [aiDetectedSize, setAiDetectedSize] = useState(null);
  const [calculatedDistance, setCalculatedDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const formRef = React.useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      packageSize: 'small',
      priority: 'standard',
      paymentMethod: 'pod'
    }
  });

  const watchedFields = watch();
  const pickupArea = watch('pickupArea');
  const dropoffArea = watch('dropoffArea');
  const priority = watch('priority');

  // Use fare estimator hook for the pre-booking estimate
  const {
    distanceKm: estimatedDistanceKm,
    standardFare,
    expressFare,
    isCalculating: isEstimating,
    error: estimationError,
    hasRequiredFields: hasEstimateFields
  } = useFareEstimator(pickupArea, dropoffArea);

  // Listen for map area selections
  useEffect(() => {
    const handleMapAreaSelected = (event) => {
      const { area, coords, activeField: selectedField } = event.detail;
      const address = `${area}, Abeokuta`;
      
      if (selectedField === 'pickup') {
        setValue('pickupArea', area);
        setValue('pickupAddress', address);
        onLocationSet('pickup', area, address, coords);
      } else {
        setValue('dropoffArea', area);
        setValue('dropoffAddress', address);
        onLocationSet('dropoff', area, address, coords);
      }
    };

    window.addEventListener('mapAreaSelected', handleMapAreaSelected);
    return () => {
      window.removeEventListener('mapAreaSelected', handleMapAreaSelected);
    };
  }, [setValue, onLocationSet]);

  // Calculate distance when both pickup and dropoff areas are available
  const calculateRouteDistance = useCallback(() => {
    if (pickupArea && dropoffArea) {
      const pickupCoords = getAreaCoordinates(pickupArea);
      const dropoffCoords = getAreaCoordinates(dropoffArea);
      
      if (pickupCoords && dropoffCoords) {
        // Calculate as-the-crow-flies distance using Haversine formula
        const distance = calculateHaversineDistance(pickupCoords, dropoffCoords);
        setCalculatedDistance(distance);
        
        // Calculate estimated travel time
        const time = estimateTravelTime(distance);
        setEstimatedTime(time);
        
        console.log(`Direct distance: ${distance} km (approx. ${time} minutes)`);
        return distance;
      }
    }
    return null;
  }, [pickupArea, dropoffArea]);
  
  // Recalculate distance when pickup or dropoff areas change
  useEffect(() => {
    calculateRouteDistance();
  }, [pickupArea, dropoffArea, calculateRouteDistance]);

  // Watch for changes in package size and priority to update fare calculation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('formOptionsChanged', {
        detail: { 
          packageSize: watchedFields.packageSize, 
          priority: watchedFields.priority 
        }
      });
      window.dispatchEvent(event);
    }
  }, [watchedFields.packageSize, watchedFields.priority]);

  const handleFieldFocus = (field) => {
    setActiveField(field);
    onActiveFieldChange(field);
  };

  const handleMapLocationSet = (area, coords) => {
    const address = `${area}, Abeokuta`;
    
    if (activeField === 'pickup') {
      setValue('pickupArea', area);
      setValue('pickupAddress', address);
    } else {
      setValue('dropoffArea', area);
      setValue('dropoffAddress', address);
    }
    
    onLocationSet(activeField, area, address, coords);
    
    // After setting a location, calculate distance if both locations are set
    setTimeout(() => calculateRouteDistance(), 100);
  };

  // Expose this function to parent component
  React.useImperativeHandle(React.useRef(), () => ({
    setLocationFromMap: handleMapLocationSet
  }));

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      // Check if we have valid coordinates for both pickup and dropoff
      if (!hasValidCoordinates(data.pickupArea, data.dropoffArea)) {
        console.error('Invalid coordinates. Please select valid pickup and dropoff locations');
        return;
      }
      
      // Check if distance calculation is complete
      if (isCalculating) {
        console.log('Distance calculation in progress. Please wait...');
        return;
      }
      
      // Validate email for Paystack payment
      if (data.paymentMethod === 'paystack' && !data.customerEmail) {
        console.error('Email is required for card/transfer payment');
        return;
      }
      
      // Get precise coordinates
      const pickupCoords = getAreaCoordinates(data.pickupArea);
      const dropoffCoords = getAreaCoordinates(data.dropoffArea);
      
      // Get route metrics from Mapbox Directions API
      let routeMetrics = { distanceKm, durationMin: 0 };
      try {
        routeMetrics = await getRouteMetrics({
          pickupLngLat: { 
            lat: pickupCoords.lat, 
            lng: pickupCoords.lng 
          },
          dropLngLat: { 
            lat: dropoffCoords.lat, 
            lng: dropoffCoords.lng 
          }
        });
        console.log('Route metrics:', routeMetrics);
      } catch (error) {
        console.error('Failed to get route metrics:', error);
        // We'll continue with our existing distance calculation as fallback
      }
      
      // Show finding rider message
      console.log(`Finding rider in ${data.pickupArea}...`);
      
      // Simulate rider assignment
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const assignedRider = findBestRider(data.pickupArea);
      console.log('Rider assigned successfully!');
      
      // Generate job ID (this would come from the backend in production)
      const jobId = `GO7-${Date.now().toString().slice(-6)}`;
      
      // Success data
      const successData = {
        ...data,
        jobId,
        rider: assignedRider,
        distanceKm: routeMetrics.distanceKm || distanceKm,
        durationMin: routeMetrics.durationMin || calculateETA(distanceKm),
        fare,
        payment: {
          method: data.paymentMethod,
          status: 'pending',
        }
      };
      
      // Handle payment methods
      if (data.paymentMethod === 'paystack') {
        try {
          // In a real implementation, we'd call our backend API here
          const response = await fetch('/api/payments/initialize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bookingId: jobId,
              amount: Math.round(fare * 100), // Convert to kobo
              customerName: data.customerName,
              email: data.customerEmail,
              phone: data.phone
            }),
          });
          
          // In development/demo mode, simulate a successful response
          if (import.meta.env.DEV || !response.ok) {
            // Simulate a successful Paystack response
            console.log('Simulating Paystack redirect in development mode');
            
            // Store booking data before redirecting
            localStorage.setItem('go7:pendingBooking', JSON.stringify(successData));
            
            // Simulate redirect delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Call onSubmitSuccess with the booking data
            // This would normally happen after returning from Paystack
            onSubmitSuccess(successData);
            reset();
            return;
          }
          
          const paymentData = await response.json();
          
          // Store booking data before redirecting
          localStorage.setItem('go7:pendingBooking', JSON.stringify(successData));
          
          // Redirect to Paystack payment page
          window.location.href = paymentData.authorization_url;
          
        } catch (error) {
          console.error('Payment initialization failed:', error);
          // Still proceed with booking but mark payment as failed
          successData.payment.status = 'failed';
          onSubmitSuccess(successData);
        }
      } else {
        // For POD, just proceed with the booking
        onSubmitSuccess(successData);
        reset();
      }
      
    } catch (error) {
      console.error('Failed to assign rider. Please try again.');
      console.error('Booking error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToFirstError = () => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }
  };

  const handleInvalidSubmit = () => {
    // toast.error('Please fix the form errors before submitting');
    console.error('Please fix the form errors before submitting');
    scrollToFirstError();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)} className="space-y-6">
        
        {/* Customer Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">👤</span>
            Customer Information
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                {...register('customerName')}
                type="text"
                id="customerName"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.customerName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
                aria-describedby={errors.customerName ? 'customerName-error' : undefined}
              />
              {errors.customerName && (
                <p id="customerName-error" className="text-sm text-red-600 mt-1">
                  {errors.customerName.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                {...register('phone')}
                type="tel"
                id="phone"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="08012345678"
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />
              {errors.phone && (
                <p id="phone-error" className="text-sm text-red-600 mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address (Required for Card Payment)
              </label>
              <input
                {...register('customerEmail')}
                type="email"
                id="customerEmail"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.customerEmail ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="your.email@example.com"
                aria-describedby={errors.customerEmail ? 'customerEmail-error' : undefined}
              />
              {errors.customerEmail && (
                <p id="customerEmail-error" className="text-sm text-red-600 mt-1">
                  {errors.customerEmail.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pickup Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2 text-green-600">📍</span>
            Pickup Details
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <AddressAutocomplete
                  id="pickupArea"
                  label="Pickup Area"
                  placeholder="Click map or type area"
                  error={errors.pickupArea?.message}
                  value={watch('pickupArea')}
                  onChange={(e) => setValue('pickupArea', e.target.value)}
                  onFocus={() => handleFieldFocus('pickup')}
                  onLocationSelect={(location) => {
                    setValue('pickupArea', location.area);
                    setValue('pickupAddress', location.address);
                    onLocationSet('pickup', location.area, location.address, location.coordinates);
                  }}
                  required={true}
                  type="pickup"
                  className={activeField === 'pickup' ? 'ring-2 ring-green-500 border-green-500' : ''}
                />
              </div>
              
              <div>
                <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Address *
                </label>
                <input
                  {...register('pickupAddress')}
                  type="text"
                  id="pickupAddress"
                  onFocus={() => handleFieldFocus('pickup')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.pickupAddress ? 'border-red-300' : 'border-gray-300'
                  } ${activeField === 'pickup' ? 'ring-2 ring-green-500 border-green-500' : ''}`}
                  placeholder="Specific pickup address"
                  aria-describedby={errors.pickupAddress ? 'pickupAddress-error' : undefined}
                />
                {errors.pickupAddress && (
                  <p id="pickupAddress-error" className="text-sm text-red-600 mt-1">
                    {errors.pickupAddress.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="pickupNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Notes
              </label>
              <textarea
                {...register('pickupNotes')}
                id="pickupNotes"
                rows={2}
                onFocus={() => handleFieldFocus('pickup')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Any special pickup instructions..."
              />
            </div>
          </div>
        </div>

        {/* Dropoff Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2 text-red-600">📍</span>
            Dropoff Details
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <AddressAutocomplete
                  id="dropoffArea"
                  label="Dropoff Area"
                  placeholder="Click map or type area"
                  error={errors.dropoffArea?.message}
                  value={watch('dropoffArea')}
                  onChange={(e) => setValue('dropoffArea', e.target.value)}
                  onFocus={() => handleFieldFocus('dropoff')}
                  onLocationSelect={(location) => {
                    setValue('dropoffArea', location.area);
                    setValue('dropoffAddress', location.address);
                    onLocationSet('dropoff', location.area, location.address, location.coordinates);
                  }}
                  required={true}
                  type="dropoff"
                  className={activeField === 'dropoff' ? 'ring-2 ring-red-500 border-red-500' : ''}
                />
              </div>
              
              <div>
                <label htmlFor="dropoffAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Dropoff Address *
                </label>
                <input
                  {...register('dropoffAddress')}
                  type="text"
                  id="dropoffAddress"
                  onFocus={() => handleFieldFocus('dropoff')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.dropoffAddress ? 'border-red-300' : 'border-gray-300'
                  } ${activeField === 'dropoff' ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                  placeholder="Specific dropoff address"
                  aria-describedby={errors.dropoffAddress ? 'dropoffAddress-error' : undefined}
                />
                {errors.dropoffAddress && (
                  <p id="dropoffAddress-error" className="text-sm text-red-600 mt-1">
                    {errors.dropoffAddress.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="dropoffNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Dropoff Notes
              </label>
              <textarea
                {...register('dropoffNotes')}
                id="dropoffNotes"
                rows={2}
                onFocus={() => handleFieldFocus('dropoff')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Any special dropoff instructions..."
              />
            </div>
          </div>
        </div>

        {/* Package & Service Options */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span className="flex items-center">
              <span className="mr-2">📦</span>
              Package & Service Options
            </span>
            <button
              type="button"
              onClick={() => setShowAIDetection(prev => !prev)}
              className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              {showAIDetection ? '✕ Hide' : '🤖 Detect with AI'}
            </button>
          </h3>

          {/* AI Package Detection */}
          {showAIDetection && (
            <div className="mb-6 border border-red-100 rounded-xl overflow-hidden">
              <PackageDetection
                onSelect={(analysis) => {
                  const sizeMap = { small: 'small', medium: 'medium', large: 'large', extra_large: 'large' };
                  const mapped = sizeMap[analysis.size] || 'medium';
                  setValue('packageSize', mapped);
                  setAiDetectedSize(analysis.size);
                  setShowAIDetection(false);
                }}
                bookingData={{
                  pickupAddress: watch('pickupAddress') || '',
                  deliveryAddress: watch('dropoffAddress') || '',
                  distance: calculatedDistance || estimatedDistanceKm || 0
                }}
              />
            </div>
          )}

          {aiDetectedSize && !showAIDetection && (
            <div className="mb-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span>✅</span>
              <span>AI detected: <strong>{aiDetectedSize}</strong> package — size pre-filled below</span>
              <button type="button" onClick={() => { setAiDetectedSize(null); setShowAIDetection(true); }} className="ml-auto text-xs text-gray-500 hover:text-gray-700 underline">Re-scan</button>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="packageSize" className="block text-sm font-medium text-gray-700 mb-1">
                Package Size *
              </label>
              <select
                {...register('packageSize')}
                id="packageSize"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.packageSize ? 'border-red-300' : 'border-gray-300'
                }`}
                aria-describedby={errors.packageSize ? 'packageSize-error' : undefined}
              >
                <option value="small">Small (+₦0)</option>
                <option value="medium">Medium (+₦200)</option>
                <option value="large">Large (+₦500)</option>
              </select>
              {errors.packageSize && (
                <p id="packageSize-error" className="text-sm text-red-600 mt-1">
                  {errors.packageSize.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority *
              </label>
              <select
                {...register('priority')}
                id="priority"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.priority ? 'border-red-300' : 'border-gray-300'
                }`}
                aria-describedby={errors.priority ? 'priority-error' : undefined}
              >
                <option value="standard">Standard (×1.0)</option>
                <option value="express">Express (×1.5)</option>
              </select>
              {errors.priority && (
                <p id="priority-error" className="text-sm text-red-600 mt-1">
                  {errors.priority.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`border rounded-lg p-3 flex items-center gap-2 cursor-pointer ${
                  watch('paymentMethod') === 'paystack' 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input 
                    type="radio" 
                    value="paystack" 
                    {...register('paymentMethod')} 
                    className="h-4 w-4 text-red-600"
                  />
                  <div>
                    <p className="font-medium text-sm">Card/Transfer</p>
                    <p className="text-xs text-gray-500">Pay now via Paystack</p>
                  </div>
                </label>
                
                <label className={`border rounded-lg p-3 flex items-center gap-2 cursor-pointer ${
                  watch('paymentMethod') === 'pod' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input 
                    type="radio" 
                    value="pod" 
                    {...register('paymentMethod')} 
                    className="h-4 w-4 text-purple-600"
                  />
                  <div>
                    <p className="font-medium text-sm">Pay on Delivery</p>
                    <p className="text-xs text-gray-500">Cash when package arrives</p>
                  </div>
                </label>
              </div>
              {errors.paymentMethod && (
                <p id="paymentMethod-error" className="text-sm text-red-600 mt-1">
                  {errors.paymentMethod.message}
                </p>
              )}
              {watch('paymentMethod') === 'paystack' && !watch('customerEmail') && (
                <p className="text-sm text-amber-600 mt-1">
                  Email address is required for Card/Transfer payment
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Distance Summary - Show when both locations are selected */}
        {(calculatedDistance || isCalculating) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📏</span>
              Distance Information
            </h3>
            
            <DistanceSummary 
              distanceKm={calculatedDistance} 
              estimatedTime={estimatedTime}
              showRouteDistance={distanceKm && calculatedDistance !== distanceKm}
              routeDistanceKm={distanceKm}
              isCalculating={isCalculating} 
            />
            
            <div className="mt-3 text-sm text-gray-500">
              <p>Direct distance calculated using straight-line measurement. Actual road distance may vary.</p>
            </div>
          </div>
        )}

        {/* Fare Estimator */}
        {(pickupArea && dropoffArea) ? (
          <div className="mb-4">
            <FareEstimator
              distanceKm={estimatedDistanceKm}
              standardFare={standardFare}
              expressFare={expressFare}
              isCalculating={isEstimating}
              selectedService={priority}
              className="sticky bottom-16 lg:bottom-auto lg:static"
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-center h-20 text-gray-500">
              <div className="text-center">
                <div className="text-2xl mb-1">📍 + 📍</div>
                <div className="text-sm">Select pickup and dropoff areas to see fare estimate</div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            type="submit"
            disabled={isSubmitting || isCalculating || !hasRequiredFields || isEstimating || 
                     (watch('paymentMethod') === 'paystack' && !watch('customerEmail'))}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            aria-label="Book delivery"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{watch('paymentMethod') === 'paystack' ? 'Initializing Payment...' : 'Finding Rider...'}</span>
              </>
            ) : isCalculating || isEstimating ? (
              <>
                <div className="animate-pulse rounded-full h-5 w-5 bg-white"></div>
                <span>Calculating Price...</span>
              </>
            ) : !hasRequiredFields ? (
              <>
                <span>�</span>
                <span>Select pickup and dropoff areas</span>
              </>
            ) : (
              <>
                <span>�💳</span>
                <span>Book Delivery - {currencyFormatNGN(fare)}</span>
              </>
            )}
          </button>

          {/* Pricing and Distance Summary */}
          {distanceKm && fare && !isCalculating && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Distance:</div>
                <div className="text-right font-medium">{formatDistance(distanceKm)}</div>
                
                <div className="text-gray-600">Base Fare:</div>
                <div className="text-right font-medium">₦800</div>
                
                <div className="text-gray-600">Per KM Rate:</div>
                <div className="text-right font-medium">₦200 × {Math.max(distanceKm, 1)} km</div>
                
                <div className="text-gray-600">Service Level:</div>
                <div className="text-right font-medium capitalize">
                  {watchedFields.priority} ({watchedFields.priority === 'standard' ? '1.0×' : '1.5×'})
                </div>
                
                <div className="text-gray-600 font-medium pt-2">Total Fare:</div>
                <div className="text-right font-bold text-red-600 pt-2">{currencyFormatNGN(fare)}</div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Sticky Fare Card */}
      <div className="sticky bottom-0 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Fare Breakdown</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Distance:</span>
            <span className="font-medium">{distanceKm?.toFixed(1) ?? '--'} km</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Base:</span>
            <span>₦800</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Per-km:</span>
            <span>₦200</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Priority multiplier:</span>
            <span>
              {watchedFields.priority === 'economy' && '×1.0'}
              {watchedFields.priority === 'standard' && '×1.2'}
              {watchedFields.priority === 'express' && '×1.5'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Package surcharge:</span>
            <span>
              {watchedFields.packageSize === 'small' && '+₦0'}
              {watchedFields.packageSize === 'medium' && '+₦200'}
              {watchedFields.packageSize === 'large' && '+₦500'}
            </span>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-gray-900">Total:</span>
              <span className="text-red-600">₦{fare.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;
