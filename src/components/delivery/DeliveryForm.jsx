import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { geocode, formatAddress } from '../../lib/geo/nominatim';
import { getPackageSizeOptions, getDeliverySpeedOptions, formatPrice } from '../../lib/pricing';
import { isValidNgPhone, NG_PHONE_PATTERN, NG_PHONE_TITLE, sanitizePhoneInput } from '../../utils/phone';
import { validatePickupTime } from '../../utils/pickupTimeValidation';

// Validation schema
const deliverySchema = z.object({
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  dropoffAddress: z.string().min(1, 'Dropoff address is required'),
  packageSize: z.enum(['small', 'medium', 'large'], {
    required_error: 'Package size is required'
  }),
  deliverySpeed: z.enum(['standard', 'express'], {
    required_error: 'Delivery speed is required'
  }),
  paymentMethod: z.enum(['card', 'transfer', 'cash'], {
    required_error: 'Payment method is required'
  }),
  phoneNumber: z.string()
    .min(1, 'Phone number is required')
    .regex(/^0\d{10}$/, 'Enter a valid 11-digit Nigerian phone number (starting with 0)'),
  customerName: z.string().optional(),
  notes: z.string().optional(),
  schedule: z.enum(['asap', 'scheduled'], {
    required_error: 'Schedule option is required'
  }),
  scheduledTime: z.string().optional()
}).refine((data) => {
  if (data.schedule === 'scheduled') {
    if (!data.scheduledTime) {
      return false;
    }
    
    // Use the centralized pickup time validation
    const validation = validatePickupTime(data.scheduledTime);
    return validation.isValid;
  }
  return true;
}, {
  message: 'Pickup time must be at least now and no more than 48 hours in the future',
  path: ['scheduledTime']
});

/**
 * AddressAutocomplete - Input with geocoding suggestions
 */
const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onLocationSelect,
  placeholder,
  error,
  className = "",
  ...props 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Handle input change and geocoding
  const handleInputChange = async (e) => {
    const query = e.target.value;
    onChange(query);

    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const results = await geocode(query);
      setSuggestions(results.slice(0, 5));
      setShowSuggestions(true);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    const formattedAddress = formatAddress(suggestion);
    onChange(formattedAddress);
    onLocationSelect({
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: formattedAddress
    });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        className={`w-full h-11 rounded-xl border px-3 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        placeholder={placeholder}
        autoComplete="off"
        {...props}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg autocomplete-dropdown">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-lg last:rounded-b-lg border-b border-gray-100 last:border-b-0"
            >
              <div className="text-sm font-medium text-gray-900">
                {formatAddress(suggestion)}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {suggestion.display_name}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-[#ef4444] rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

/**
 * Main DeliveryForm component
 */
const DeliveryForm = ({ 
  onLocationUpdate, 
  onFormChange, 
  pricing,
  onFieldFocus,
  pickupAddress,
  dropoffAddress,
  onPickupAddressChange,
  onDropoffAddressChange
}) => {
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(deliverySchema),
    mode: 'onChange',
    defaultValues: {
      packageSize: 'medium',
      deliverySpeed: 'standard',
      paymentMethod: 'card',
      schedule: 'asap',
      phoneNumber: '',
      customerName: '',
      notes: '',
      scheduledTime: ''
    }
  });

  const watchedValues = watch();

  // Notify parent of form changes
  useEffect(() => {
    if (onFormChange) {
      onFormChange({
        values: watchedValues,
        isValid,
        errors,
        locations: { pickup: pickupLocation, dropoff: dropoffLocation }
      });
    }
  }, [watchedValues, isValid, errors, pickupLocation, dropoffLocation, onFormChange]);

  // Handle location updates
  const handlePickupSelect = (location) => {
    setPickupLocation(location);
    if (onLocationUpdate) {
      onLocationUpdate({ pickup: location, dropoff: dropoffLocation });
    }
  };

  const handleDropoffSelect = (location) => {
    setDropoffLocation(location);
    if (onLocationUpdate) {
      onLocationUpdate({ pickup: pickupLocation, dropoff: location });
    }
  };

  const packageSizeOptions = getPackageSizeOptions();
  const deliverySpeedOptions = getDeliverySpeedOptions();

  return (
    <div className="space-y-6">
      {/* Addresses Section */}
      <div className="rounded-2xl border border-black/10 shadow-sm bg-white/95 backdrop-blur p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Addresses</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Address *
            </label>
            <AddressAutocomplete
              value={pickupAddress || watchedValues.pickupAddress || ''}
              onChange={(value) => {
                setValue('pickupAddress', value);
                onPickupAddressChange?.(value);
              }}
              onLocationSelect={handlePickupSelect}
              placeholder="Enter pickup address in Abeokuta"
              error={errors.pickupAddress}
              aria-invalid={errors.pickupAddress ? 'true' : 'false'}
              aria-describedby={errors.pickupAddress ? 'pickup-error' : undefined}
              onFocus={() => onFieldFocus?.('pickup')}
            />
            {errors.pickupAddress && (
              <p id="pickup-error" className="text-red-600 text-sm mt-1" role="alert">
                {errors.pickupAddress.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="dropoffAddress" className="block text-sm font-medium text-gray-700 mb-2">
              Dropoff Address *
            </label>
            <AddressAutocomplete
              value={dropoffAddress || watchedValues.dropoffAddress || ''}
              onChange={(value) => {
                setValue('dropoffAddress', value);
                onDropoffAddressChange?.(value);
              }}
              onLocationSelect={handleDropoffSelect}
              placeholder="Enter dropoff address in Abeokuta"
              error={errors.dropoffAddress}
              aria-invalid={errors.dropoffAddress ? 'true' : 'false'}
              aria-describedby={errors.dropoffAddress ? 'dropoff-error' : undefined}
              onFocus={() => onFieldFocus?.('dropoff')}
            />
            {errors.dropoffAddress && (
              <p id="dropoff-error" className="text-red-600 text-sm mt-1" role="alert">
                {errors.dropoffAddress.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Package Details Section */}
      <div className="rounded-2xl border border-black/10 shadow-sm bg-white/95 backdrop-blur p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="packageSize" className="block text-sm font-medium text-gray-700 mb-2">
              Package Size *
            </label>
            <select
              {...register('packageSize')}
              className={`w-full h-11 rounded-xl border px-3 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-transparent ${
                errors.packageSize ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-invalid={errors.packageSize ? 'true' : 'false'}
            >
              {packageSizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.packageSize && (
              <p className="text-red-600 text-sm mt-1" role="alert">
                {errors.packageSize.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="deliverySpeed" className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Speed *
            </label>
            <select
              {...register('deliverySpeed')}
              className={`w-full h-11 rounded-xl border px-3 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-transparent ${
                errors.deliverySpeed ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-invalid={errors.deliverySpeed ? 'true' : 'false'}
            >
              {deliverySpeedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.deliverySpeed && (
              <p className="text-red-600 text-sm mt-1" role="alert">
                {errors.deliverySpeed.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contact & Payment Section */}
      <div className="rounded-2xl border border-black/10 shadow-sm bg-white/95 backdrop-blur p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact & Payment</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                {...register('phoneNumber', {
                  onChange: (e) => {
                    e.target.value = sanitizePhoneInput(e.target.value);
                    // Override browser validation message
                    e.target.setCustomValidity('');
                  },
                  onInvalid: (e) => {
                    e.target.setCustomValidity('Enter a valid 11-digit Nigerian phone number (starting with 0)');
                  }
                })}
                className={`w-full h-11 rounded-xl border px-3 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-transparent ${
                  errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 08166205600"
                aria-invalid={errors.phoneNumber ? 'true' : 'false'}
                aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : undefined}
              />
              {errors.phoneNumber && (
                <p id="phoneNumber-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                {...register('customerName')}
                className="w-full h-11 rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <select
              {...register('paymentMethod')}
              className={`w-full h-11 rounded-xl border px-3 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-transparent ${
                errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-invalid={errors.paymentMethod ? 'true' : 'false'}
            >
              <option value="card">Credit/Debit Card</option>
              <option value="transfer">Bank Transfer</option>
              <option value="cash">Cash on Delivery</option>
            </select>
            {errors.paymentMethod && (
              <p className="text-red-600 text-sm mt-1" role="alert">
                {errors.paymentMethod.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Schedule & Notes Section */}
      <div className="rounded-2xl border border-black/10 shadow-sm bg-white/95 backdrop-blur p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule & Notes</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When do you need this delivered? *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  {...register('schedule')}
                  value="asap"
                  className="mr-2 text-[#ef4444] focus:ring-[#ef4444]"
                />
                <span>ASAP (within 2-3 hours)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  {...register('schedule')}
                  value="scheduled"
                  className="mr-2 text-[#ef4444] focus:ring-[#ef4444]"
                />
                <span>Schedule for later</span>
              </label>
            </div>
          </div>

          {watchedValues.schedule === 'scheduled' && (
            <div>
              <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-2">
                Pick Date & Time *
              </label>
              <input
                type="datetime-local"
                {...register('scheduledTime')}
                className={`w-full h-11 rounded-xl border px-3 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-transparent ${
                  errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
                }`}
                min={new Date().toISOString().slice(0, 16)}
                aria-invalid={errors.scheduledTime ? 'true' : 'false'}
              />
              {errors.scheduledTime && (
                <p className="text-red-600 text-sm mt-1" role="alert">
                  {errors.scheduledTime.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes to Rider
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
              placeholder="Any special instructions for the delivery..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryForm;
