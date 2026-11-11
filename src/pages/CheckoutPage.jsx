import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';
import { calculateServiceFare, calculateServiceFareBreakdown, currencyFormatNGN } from '../utils/pricing';
import { MapPin, ShoppingBag, CreditCard, Wallet, CheckCircle, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';

/**
 * 💳 UNIFIED CHECKOUT PAGE
 * Handles checkout for ALL Go7 service types:
 * - parcel: Package delivery
 * - errand: Errand services
 * - gobuy: Personal shopping
 * - restaurant: Food delivery
 * - pharmacy: Medicine delivery
 * - market: Fresh groceries
 * - vendor: Retail shopping
 */

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  
  // Extract checkout data from navigation state
  const {
    serviceType = 'parcel',
    items = [],
    itemsTotal = 0,
    vendor = null,
    pickup = null,
    dropoff = null,
    packageDetails = null,
    recipientInfo = null
  } = location.state || {};

  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [fareBreakdown, setFareBreakdown] = useState(null);

  // Calculate delivery fee when component mounts
  useEffect(() => {
    if (pickup && dropoff) {
      const options = packageDetails ? {
        packageSize: packageDetails.size,
        packageWeight: packageDetails.weight,
        packageType: packageDetails.type,
        enablePeakPricing: true
      } : { enablePeakPricing: true };

      const breakdown = calculateServiceFareBreakdown(serviceType, null, options);
      
      // Calculate from coordinates
      const R = 6371; // Earth radius in km
      const dLat = (dropoff.lat - pickup.lat) * Math.PI / 180;
      const dLon = (dropoff.lng - pickup.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(pickup.lat * Math.PI / 180) * Math.cos(dropoff.lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.asin(Math.sqrt(a));
      const distance = R * c;

      const finalBreakdown = calculateServiceFareBreakdown(serviceType, distance, options);
      setFareBreakdown(finalBreakdown);
      setDeliveryFee(finalBreakdown.total);
    }
  }, [pickup, dropoff, serviceType, packageDetails]);

  const total = itemsTotal + deliveryFee;

  const paymentMethods = [
    { id: 'wallet', name: 'Go7 Wallet', icon: <Wallet size={20} />, color: 'purple' },
    { id: 'card', name: 'Debit/Credit Card', icon: <CreditCard size={20} />, color: 'blue' },
    { id: 'transfer', name: 'Bank Transfer', icon: <CreditCard size={20} />, color: 'green' },
    { id: 'pod', name: 'Pay on Delivery', icon: <CheckCircle size={20} />, color: 'orange' }
  ];

  const serviceLabels = {
    parcel: { name: 'Parcel Delivery', icon: '📦' },
    errand: { name: 'Errand Service', icon: '🏃' },
    gobuy: { name: 'GoBuy Shopping', icon: '🛒' },
    restaurant: { name: 'Restaurant Order', icon: '🍔' },
    pharmacy: { name: 'Pharmacy Order', icon: '💊' },
    market: { name: 'Market Shopping', icon: '🥬' },
    vendor: { name: 'Shop Order', icon: '🛍️' }
  };

  const handleConfirmOrder = async () => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'Please Login',
        text: 'You need to be logged in to place an order',
        confirmButtonColor: '#e61e25'
      });
      navigate('/login');
      return;
    }

    setIsProcessing(true);

    try {
      // TODO: Integrate with Firebase to create order
      const orderData = {
        userId: user.uid,
        serviceType,
        items,
        itemsTotal,
        deliveryFee,
        total,
        paymentMethod,
        vendor,
        pickup,
        dropoff,
        packageDetails,
        recipientInfo,
        fareBreakdown,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      console.log('📦 Creating order:', orderData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success
      await Swal.fire({
        icon: 'success',
        title: '✅ Order Confirmed!',
        html: `
          <div class="text-center">
            <p class="text-lg mb-2">Order #GO7${Date.now().toString().slice(-6)}</p>
            <p class="text-2xl font-bold text-red-600">₦${total.toLocaleString()}</p>
            <p class="text-sm text-gray-600 mt-2">
              Your order has been placed successfully!
            </p>
          </div>
        `,
        confirmButtonText: 'Track Order',
        confirmButtonColor: '#e61e25'
      });

      // Navigate to tracking or orders page
      navigate('/orders');

    } catch (error) {
      console.error('Order creation failed:', error);
      Swal.fire({
        icon: 'error',
        title: 'Order Failed',
        text: 'Unable to process your order. Please try again.',
        confirmButtonColor: '#e61e25'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!location.state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Checkout Data</h2>
          <p className="text-gray-600 mb-4">Please start a new order</p>
          <button
            onClick={() => navigate('/')}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const serviceInfo = serviceLabels[serviceType] || serviceLabels.parcel;

  return (
    <>
      <Helmet>
        <title>Checkout - {serviceInfo.name} | Go7</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 pb-6">
        {/* Header */}
        <div className="bg-red-600 text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="hover:bg-red-700 p-2 rounded-lg">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">{serviceInfo.icon} Checkout</h1>
            <p className="text-red-100 text-sm">{serviceInfo.name}</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Items Summary */}
          {items.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingBag size={20} className="text-red-600" />
                Items ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">
                      {item.name} {item.quantity && `× ${item.quantity}`}
                    </span>
                    <span className="font-semibold">
                      ₦{(item.price * (item.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Subtotal</span>
                  <span className="text-red-600">₦{itemsTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Details */}
          {pickup && dropoff && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin size={20} className="text-red-600" />
                Delivery Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Pickup Location</p>
                  <p className="font-semibold text-gray-900">
                    {vendor ? vendor.name : `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Delivery Location</p>
                  <p className="font-semibold text-gray-900">
                    {dropoff.address || `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Price Breakdown</h3>
            <div className="space-y-2 text-sm">
              {itemsTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Items Total</span>
                  <span className="font-semibold">₦{itemsTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-semibold">₦{deliveryFee.toLocaleString()}</span>
              </div>
              
              {fareBreakdown && (
                <div className="bg-gray-50 p-3 rounded-lg mt-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Base Fee</span>
                    <span>₦{fareBreakdown.baseFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distance Fee</span>
                    <span>₦{fareBreakdown.distanceFee}</span>
                  </div>
                  {fareBreakdown.serviceFee > 0 && (
                    <div className="flex justify-between">
                      <span>Service Fee</span>
                      <span>₦{fareBreakdown.serviceFee}</span>
                    </div>
                  )}
                  {fareBreakdown.packageSurcharge > 0 && (
                    <div className="flex justify-between">
                      <span>Package Surcharge</span>
                      <span>₦{fareBreakdown.packageSurcharge}</span>
                    </div>
                  )}
                  {fareBreakdown.peakSurcharge > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Peak Hour Surge</span>
                      <span>₦{fareBreakdown.peakSurcharge}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-red-600">₦{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Payment Method</h3>
            <div className="space-y-2">
              {paymentMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    paymentMethod === method.id
                      ? `border-${method.color}-600 bg-${method.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-${method.color}-600`}>{method.icon}</div>
                  <span className="font-semibold text-gray-900">{method.name}</span>
                  {paymentMethod === method.id && (
                    <CheckCircle size={20} className={`ml-auto text-${method.color}-600`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmOrder}
            disabled={isProcessing}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </span>
            ) : (
              `Confirm Order • ₦${total.toLocaleString()}`
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;
