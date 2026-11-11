import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { createOrder } from '../../services/orderService';
import { initializePaystackPayment } from '../../services/paymentService';
import { useNavigate } from 'react-router-dom';
import { MapPinIcon } from '@heroicons/react/24/solid';

/**
 * Checkout form component for finalizing orders
 */
const CheckoutForm = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  // Form state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  
  // Area selection state (simplified for demo)
  const [areaFrom, setAreaFrom] = useState('');
  const [areaTo, setAreaTo] = useState('');
  
  // Payment method state
  const [isPOD, setIsPOD] = useState(false);
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState(null);
  
  // Get current location - Enhanced for mobile
  const handleUseCurrentLocation = async (e) => {
    // Prevent double-firing from touch + click
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent multiple simultaneous requests
    if (isGettingLocation) {
      console.log('⚠️ Location request already in progress');
      return;
    }
    
    console.log('🔵 Use Current Location clicked in CheckoutForm');
    console.log('User Agent:', navigator.userAgent);
    console.log('Geolocation available:', !!navigator.geolocation);
    console.log('Secure context:', window.isSecureContext);
    
    setIsGettingLocation(true);
    setError(null);
    
    try {
      // Check for geolocation support
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      // Check for secure context on mobile
      if (!window.isSecureContext && !location.hostname.includes('localhost')) {
        throw new Error('Location access requires HTTPS connection');
      }
      
      console.log('📍 Requesting location with high accuracy...');
      
      const position = await new Promise((resolve, reject) => {
        // Use longer timeout for mobile devices
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const timeout = isMobile ? 45000 : 30000;
        
        console.log(`⏱️ Timeout set to ${timeout}ms for ${isMobile ? 'mobile' : 'desktop'}`);
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: timeout,
          maximumAge: 0
        });
      });
      
      const { latitude, longitude } = position.coords;
      console.log('✅ Location obtained:', { latitude, longitude });
      
      // Reverse geocode to get address
      try {
        const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const address = data.results[0].formatted_address;
          console.log('✅ Address resolved:', address);
          setCustomerInfo(prev => ({
            ...prev,
            address: address
          }));
        } else {
          setCustomerInfo(prev => ({
            ...prev,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
        }
      } catch (geocodeError) {
        console.warn('Geocoding failed, using coordinates:', geocodeError);
        setCustomerInfo(prev => ({
          ...prev,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        }));
      }
    } catch (error) {
      console.error('❌ Location error:', error);
      if (error.code === 1) {
        setError('Location permission denied. Please enable location access in your browser settings.');
      } else if (error.code === 2) {
        setError('Unable to determine your location. Please ensure GPS is enabled.');
      } else if (error.code === 3) {
        setError('Location request timed out. Please try again in an open area.');
      } else {
        setError(error.message || 'Failed to get current location');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };
  
  // Delivery fee calculation (simplified)
  const calculateDeliveryFee = () => {
    // In a real app, this could be based on distance, weight, etc.
    return 1200; // Default fee in Naira
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cart.items.length) {
      setError('Your cart is empty');
      return;
    }
    
    if (!areaFrom || !areaTo) {
      setError('Please select pickup and delivery areas');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Get vendor ID from the first item (assuming all items are from the same vendor)
      const vendorId = cart.items[0].vendorId;
      
      // Calculate delivery fee
      const deliveryFee = calculateDeliveryFee();
      
      // Prepare order data
      const orderData = {
        vendorId,
        customer: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          address: customerInfo.address
        },
        items: cart.items,
        subtotal: cart.totalPrice,
        deliveryFee,
        isPOD,
        areaFrom,
        areaTo,
        notes: customerInfo.notes
      };
      
      // Create the order in Firestore
      const orderId = await createOrder(orderData);
      
      if (isPOD) {
        // For Pay on Delivery, go directly to confirmation page
        clearCart();
        navigate(`/orders/${orderId}`);
      } else {
        // For card payment, initialize payment gateway
        const paymentData = {
          email: customerInfo.email,
          amount: cart.totalPrice + deliveryFee,
          reference: orderId,
          callbackUrl: `${window.location.origin}/payment/callback?orderId=${orderId}`,
          customer: {
            name: customerInfo.name,
            phone: customerInfo.phone
          }
        };
        
        const paymentResponse = await initializePaystackPayment(paymentData);
        
        if (paymentResponse.success) {
          // Redirect to payment gateway
          window.location.href = paymentResponse.redirectUrl;
        } else {
          throw new Error(paymentResponse.error || 'Payment initialization failed');
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.message || 'An error occurred during checkout');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Calculate total price
  const totalPrice = cart.totalPrice + calculateDeliveryFee();

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Checkout</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Customer Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={customerInfo.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number*
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={customerInfo.phone}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address*
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={customerInfo.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address*
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={customerInfo.address}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 pr-14 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter delivery address"
                />
                <button
                  type="button"
                  onPointerDown={handleUseCurrentLocation}
                  disabled={isGettingLocation}
                  style={{ 
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Use current location"
                  aria-label="Use current location"
                >
                  {isGettingLocation ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <MapPinIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Delivery Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Delivery Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="areaFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Area*
              </label>
              <select
                id="areaFrom"
                value={areaFrom}
                onChange={(e) => setAreaFrom(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select pickup area</option>
                <option value="Ikeja">Ikeja</option>
                <option value="Lekki">Lekki</option>
                <option value="Victoria Island">Victoria Island</option>
                <option value="Ikoyi">Ikoyi</option>
                <option value="Yaba">Yaba</option>
              </select>
            </div>
            <div>
              <label htmlFor="areaTo" className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Area*
              </label>
              <select
                id="areaTo"
                value={areaTo}
                onChange={(e) => setAreaTo(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select delivery area</option>
                <option value="Ikeja">Ikeja</option>
                <option value="Lekki">Lekki</option>
                <option value="Victoria Island">Victoria Island</option>
                <option value="Ikoyi">Ikoyi</option>
                <option value="Yaba">Yaba</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={customerInfo.notes}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="Special instructions for delivery"
              ></textarea>
            </div>
          </div>
        </div>
        
        {/* Payment Method */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Payment Method</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="payment-card"
                name="payment-method"
                type="radio"
                checked={!isPOD}
                onChange={() => setIsPOD(false)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
              />
              <label htmlFor="payment-card" className="ml-3 block text-sm font-medium text-gray-700">
                Pay with Card
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="payment-pod"
                name="payment-method"
                type="radio"
                checked={isPOD}
                onChange={() => setIsPOD(true)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
              />
              <label htmlFor="payment-pod" className="ml-3 block text-sm font-medium text-gray-700">
                Pay on Delivery (POD)
              </label>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="mb-6 bg-gray-50 p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₦{cart.totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee</span>
              <span className="font-medium">₦{calculateDeliveryFee().toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-800 font-semibold">Total</span>
                <span className="text-gray-800 font-bold">₦{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : isPOD ? 'Place Order (Pay on Delivery)' : 'Proceed to Payment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CheckoutForm;
