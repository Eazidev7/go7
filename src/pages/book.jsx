import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, CreditCard, Wallet, Banknote } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import fetchAddressSuggestions, { getCoordinatesFromSuggestion } from '../utils/fetchAddressSuggestions';

// Toast notification function (simplified)
const showToast = (message, type = 'success') => {
  // In a real app, you'd use a toast library like react-hot-toast
  if (type === 'success') {
    alert(`✅ ${message}`);
  } else {
    alert(`❌ ${message}`);
  }
};

const BookDelivery = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    pickupAddress: '',
    dropoffAddress: '',
    packageName: '',
    packageSize: 'small',
    deliveryMode: 'standard',
    note: '',
    paymentMethod: 'wallet'
  });
  
  // Address suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  
  // Pricing and coordinates
  const [estimatedFee, setEstimatedFee] = useState(0);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  
  // Mock user role (later from Firebase auth)
  const user = { role: "vendor", email: "user@go7.com", walletBalance: 5000 };
  
  // Google Distance Matrix API for live pricing
  const calculatePrice = async (pickup, dropoff) => {
    if (!pickup || !dropoff) return 0;
    
    setIsCalculatingPrice(true);
    try {
      const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
      if (!GOOGLE_MAPS_API_KEY) {
        console.warn('VITE_GOOGLE_MAPS_API_KEY missing');
        return;
      }
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${pickup.lat},${pickup.lng}&destinations=${dropoff.lat},${dropoff.lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.rows && data.rows[0] && data.rows[0].elements[0] && data.rows[0].elements[0].distance) {
        const distanceKm = data.rows[0].elements[0].distance.value / 1000;
        
        // GO7 Pricing Formula
        const baseFee = 500; // ₦500 base fee
        const perKmRate = 150; // ₦150 per km
        let calculatedFee = baseFee + (distanceKm * perKmRate);
        
        // Package size multiplier
        if (formData.packageSize === 'medium') calculatedFee *= 1.2;
        if (formData.packageSize === 'large') calculatedFee *= 1.5;
        
        // Delivery mode multiplier
        if (formData.deliveryMode === 'express') calculatedFee *= 1.5;
        
        console.log('📊 Distance calculation result:', {
          distanceKm,
          baseFee,
          perKmRate,
          packageSize: formData.packageSize,
          deliveryMode: formData.deliveryMode,
          finalFee: Math.round(calculatedFee)
        });
        
        return Math.round(calculatedFee);
      }
    } catch (error) {
      console.error('❌ Price calculation error:', error);
      // Fallback to basic calculation
      const fallbackDistance = 5; // Assume 5km
      return 500 + (fallbackDistance * 150);
    } finally {
      setIsCalculatingPrice(false);
    }
    
    return 0;
  };
  
  // Address search function using hybrid Google + OSM
  const searchAddresses = async (query, isSetter) => {
    if (query.length < 3) {
      isSetter([]);
      return;
    }
    
    try {
      const results = await fetchAddressSuggestions(query);
      const formattedSuggestions = results.slice(0, 5).map((result, index) => ({
        id: index,
        address: result.description || result.display_name || result.formatted_address,
        coordinates: result.coordinates || null,
        source: result.source || 'google'
      }));
      
      isSetter(formattedSuggestions);
    } catch (error) {
      console.warn('Address search failed:', error);
      isSetter([]);
    }
  };
  
  // Handle address selection
  const handleAddressSelect = async (suggestion, type) => {
    const coordinates = suggestion.coordinates || await getCoordinatesFromSuggestion(suggestion);
    
    if (type === 'pickup') {
      setFormData(prev => ({ ...prev, pickupAddress: suggestion.address }));
      setPickupCoords(coordinates);
      setShowPickupSuggestions(false);
    } else {
      setFormData(prev => ({ ...prev, dropoffAddress: suggestion.address }));
      setDropoffCoords(coordinates);
      setShowDropoffSuggestions(false);
    }
  };
  
  // Calculate price when both addresses are set
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      calculatePrice(pickupCoords, dropoffCoords).then(setEstimatedFee);
    }
  }, [pickupCoords, dropoffCoords, formData.packageSize, formData.deliveryMode]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.pickupAddress || !formData.dropoffAddress || !formData.packageName) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    
    if (!pickupCoords || !dropoffCoords) {
      showToast('Please select valid addresses from suggestions', 'error');
      return;
    }
    
    try {
      // Prepare booking data
      const bookingData = {
        ...formData,
        pickupCoordinates: pickupCoords,
        dropoffCoordinates: dropoffCoords,
        estimatedFee,
        userEmail: user.email,
        userRole: user.role,
        status: 'pending',
        createdAt: new Date(),
        bookingId: `GO7${Date.now()}`
      };
      
      // Handle payment based on selected method
      if (formData.paymentMethod === 'paystack') {
        // Initialize Paystack inline checkout
        if (!window.PaystackPop) {
          showToast('Payment system not loaded. Please refresh and try again.', 'error');
          return;
        }
        
        const handler = window.PaystackPop.setup({
          key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_paystack_key',
          email: user.email,
          amount: estimatedFee * 100, // Convert to kobo
          currency: 'NGN',
          ref: bookingData.bookingId,
          metadata: {
            paymentType: 'service_payment',
            userId: user?.uid,
            serviceType: 'booking'
          },
          callback: async function(response) {
            console.log('✅ Paystack payment successful:', response);
            
            // Save booking to Firebase
            await addDoc(collection(db, 'bookings'), {
              ...bookingData,
              paymentReference: response.reference,
              paymentStatus: 'completed'
            });
            
            console.log('✅ Firebase write success');
            showToast('Booking Confirmed! Your rider will be assigned shortly.');
            navigate('/orders');
          },
          onClose: function() {
            console.log('❌ Payment cancelled');
            showToast('Payment cancelled', 'error');
          }
        });
        
        handler.openIframe();
        
      } else if (formData.paymentMethod === 'wallet') {
        // Deduct from wallet balance
        if (user.walletBalance < estimatedFee) {
          showToast('Insufficient wallet balance', 'error');
          return;
        }
        
        // Save booking to Firebase
        await addDoc(collection(db, 'bookings'), {
          ...bookingData,
          paymentStatus: 'completed',
          walletDeduction: estimatedFee
        });
        
        console.log('✅ Firebase write success');
        showToast('Booking Confirmed! Your rider will be assigned shortly.');
        navigate('/orders');
        
      } else if (formData.paymentMethod === 'pod') {
        // Pay on Delivery (vendors only)
        if (user.role !== 'vendor') {
          showToast('Pay on Delivery is only available for vendors', 'error');
          return;
        }
        
        // Save booking to Firebase
        await addDoc(collection(db, 'bookings'), {
          ...bookingData,
          paymentStatus: 'pending'
        });
        
        console.log('✅ Firebase write success');
        showToast('Booking Confirmed! Payment will be collected on delivery.');
        navigate('/orders');
      }
      
    } catch (error) {
      console.error('❌ Booking submission error:', error);
      showToast('Failed to create booking. Please try again.', 'error');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Book Delivery</h1>
          <div className="w-6"></div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Pickup Address */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Address *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.pickupAddress}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, pickupAddress: e.target.value }));
                  searchAddresses(e.target.value, setPickupSuggestions);
                  setShowPickupSuggestions(true);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter pickup address"
              />
            </div>
            
            {/* Pickup Suggestions */}
            {showPickupSuggestions && pickupSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                {pickupSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleAddressSelect(suggestion, 'pickup')}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="font-medium text-sm">{suggestion.address}</div>
                    <div className="text-xs text-gray-500">{suggestion.source}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dropoff Address */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dropoff Address *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.dropoffAddress}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, dropoffAddress: e.target.value }));
                  searchAddresses(e.target.value, setDropoffSuggestions);
                  setShowDropoffSuggestions(true);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter dropoff address"
              />
            </div>
            
            {/* Dropoff Suggestions */}
            {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                {dropoffSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleAddressSelect(suggestion, 'dropoff')}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="font-medium text-sm">{suggestion.address}</div>
                    <div className="text-xs text-gray-500">{suggestion.source}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estimated Fee */}
          {estimatedFee > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Estimated Fee:</span>
                <span className="text-xl font-bold text-red-600">
                  {isCalculatingPrice ? '...' : `₦${estimatedFee.toLocaleString()}`}
                </span>
              </div>
            </div>
          )}

          {/* Package Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Package Name *
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.packageName}
                onChange={(e) => setFormData(prev => ({ ...prev, packageName: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g. Documents, Food, Electronics"
              />
            </div>
          </div>

          {/* Package Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Package Size
            </label>
            <select
              value={formData.packageSize}
              onChange={(e) => setFormData(prev => ({ ...prev, packageSize: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="small">Small (up to 2kg)</option>
              <option value="medium">Medium (2-10kg)</option>
              <option value="large">Large (10kg+)</option>
            </select>
          </div>

          {/* Delivery Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Mode
            </label>
            <select
              value={formData.deliveryMode}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryMode: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="standard">Standard (1-2 hours)</option>
              <option value="express">Express (+50% fee, 30-60 mins)</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Any special handling instructions..."
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="space-y-3">
              {/* Wallet */}
              <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="wallet"
                  checked={formData.paymentMethod === 'wallet'}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="mr-3"
                />
                <Wallet className="w-5 h-5 mr-3 text-gray-600" />
                <div>
                  <div className="font-medium">GO7 Wallet</div>
                  <div className="text-sm text-gray-500">Balance: ₦{user.walletBalance.toLocaleString()}</div>
                </div>
              </label>

              {/* Paystack */}
              <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paystack"
                  checked={formData.paymentMethod === 'paystack'}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="mr-3"
                />
                <CreditCard className="w-5 h-5 mr-3 text-gray-600" />
                <div>
                  <div className="font-medium">Card Payment</div>
                  <div className="text-sm text-gray-500">Secure payment via Paystack</div>
                </div>
              </label>

              {/* Pay on Delivery (Vendors only) */}
              {user.role === 'vendor' && (
                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pod"
                    checked={formData.paymentMethod === 'pod'}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="mr-3"
                  />
                  <Banknote className="w-5 h-5 mr-3 text-gray-600" />
                  <div>
                    <div className="font-medium">Pay on Delivery</div>
                    <div className="text-sm text-gray-500">Vendor exclusive option</div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!formData.pickupAddress || !formData.dropoffAddress || !formData.packageName || isCalculatingPrice}
          >
            {estimatedFee > 0 ? `Book Delivery - ₦${estimatedFee.toLocaleString()}` : 'Book Delivery'}
          </button>
        </form>
      </div>
      
      {/* Paystack Script */}
      <script src="https://js.paystack.co/v1/inline.js"></script>
    </div>
  );
};

export default BookDelivery;