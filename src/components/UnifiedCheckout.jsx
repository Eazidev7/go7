import React, { useState, useEffect } from 'react';
import { currencyFormatNGN } from '../utils/pricing';
import { ShoppingCart, Package, MapPin, CreditCard, Check } from 'lucide-react';

/**
 * UnifiedCheckout Component
 * Handles checkout for all Go7 services with fare display
 */
const UnifiedCheckout = ({
  serviceType = 'parcel',
  fare = 0,
  distance = 0,
  itemsTotal = 0,
  items = [],
  pickup,
  dropoff,
  userAddress,
  paymentMethod = 'wallet',
  onConfirm,
  onCancel,
  className = ''
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(paymentMethod);

  // Calculate totals
  const deliveryFee = fare;
  const subtotal = itemsTotal;
  const total = subtotal + deliveryFee;

  // Service labels
  const serviceLabels = {
    parcel: { icon: '📦', label: 'Parcel Delivery' },
    errand: { icon: '🏃', label: 'Quick Errand' },
    gobuy: { icon: '🛒', label: 'GoBuy Shopping' },
    restaurant: { icon: '🍔', label: 'Restaurant Delivery' },
    pharmacy: { icon: '💊', label: 'Pharmacy' },
    market: { icon: '🛍️', label: 'Market' },
    vendor: { icon: '🏪', label: 'Vendor Pickup' }
  };

  const service = serviceLabels[serviceType] || serviceLabels.parcel;

  const handleConfirm = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Prepare checkout data
      const checkoutData = {
        serviceType,
        fare: deliveryFee,
        distance,
        itemsTotal: subtotal,
        total,
        items,
        pickup,
        dropoff,
        userAddress,
        paymentMethod: selectedPayment,
        timestamp: new Date().toISOString()
      };

      console.log('🛒 Checkout data:', checkoutData);

      // Call parent's confirm handler
      if (onConfirm) {
        await onConfirm(checkoutData);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-xl border-2 border-red-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6" />
          <div>
            <h2 className="text-xl font-bold">Checkout Summary</h2>
            <p className="text-sm text-red-100">
              {service.icon} {service.label}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        
        {/* Items Section (if applicable) */}
        {items && items.length > 0 && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-red-600" />
              Order Items ({items.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">{currencyFormatNGN(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location Info */}
        {(pickup || dropoff || userAddress) && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              Delivery Details
            </h3>
            <div className="space-y-2 text-sm">
              {pickup && (
                <div>
                  <span className="text-gray-600">Pickup:</span>
                  <span className="ml-2 text-gray-900">
                    {pickup.address || `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`}
                  </span>
                </div>
              )}
              {dropoff && (
                <div>
                  <span className="text-gray-600">Dropoff:</span>
                  <span className="ml-2 text-gray-900">
                    {dropoff.address || `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}`}
                  </span>
                </div>
              )}
              {userAddress && (
                <div>
                  <span className="text-gray-600">Address:</span>
                  <span className="ml-2 text-gray-900">{userAddress}</span>
                </div>
              )}
              {distance > 0 && (
                <div>
                  <span className="text-gray-600">Distance:</span>
                  <span className="ml-2 font-medium text-blue-600">{distance.toFixed(2)} km</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Price Breakdown</h3>
          
          {/* Subtotal (items) */}
          {subtotal > 0 && (
            <div className="flex justify-between text-base">
              <span className="text-gray-700">Subtotal (Items)</span>
              <span className="font-medium">{currencyFormatNGN(subtotal)}</span>
            </div>
          )}

          {/* Delivery Fee */}
          <div className="flex justify-between text-base">
            <span className="text-gray-700">Delivery Fee</span>
            <span className="font-medium text-red-600">{currencyFormatNGN(deliveryFee)}</span>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-red-600">{currencyFormatNGN(total)}</span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-600" />
            Payment Method
          </h3>
          <div className="space-y-2">
            {['wallet', 'card', 'transfer', 'pod'].map((method) => (
              <label
                key={method}
                className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedPayment === method
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method}
                  checked={selectedPayment === method}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                  className="w-4 h-4 text-red-600"
                />
                <div className="flex-1">
                  <div className="font-medium capitalize">{method === 'pod' ? 'Pay on Delivery' : method}</div>
                  <div className="text-xs text-gray-500">
                    {method === 'wallet' && 'Use your Go7 wallet balance'}
                    {method === 'card' && 'Pay with debit/credit card'}
                    {method === 'transfer' && 'Bank transfer'}
                    {method === 'pod' && 'Pay cash to rider'}
                  </div>
                </div>
                {selectedPayment === method && (
                  <Check className="w-5 h-5 text-red-600" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || total <= 0}
            className="flex-1 py-3 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 active:bg-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Confirm Order • {currencyFormatNGN(total)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCheckout;
