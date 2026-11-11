import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function FuelOrderSuccess({ orderData, onTrackOrder, onBackToHome }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        {/* Success Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your fuel order has been placed successfully. A rider will be assigned shortly.
        </p>

        {/* Order Details Card */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">Order ID</span>
            <span className="text-sm font-bold text-[#E53935]">{orderData?.orderRef || 'GF78H2K'}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Fuel Type</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {orderData?.fuelType || 'Petrol'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Amount</span>
              <span className="text-sm font-semibold text-gray-900">
                ₦{orderData?.amount?.toLocaleString() || '10,000'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Volume</span>
              <span className="text-sm font-semibold text-gray-900">
                {orderData?.volume?.toFixed(1) || '9.5'} {orderData?.fuelType === 'cng' ? 'KG' : 'Litres'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Delivery</span>
              <span className="text-sm font-semibold text-gray-900">
                {orderData?.location?.address || 'Oke Ilewo, Abeokuta'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-green-600 font-semibold">Confirmed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span className="text-gray-400">Rider Assigned</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span className="text-gray-400">Delivered</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onTrackOrder}
            className="w-full bg-[#E53935] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            Track Order
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onBackToHome}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold"
          >
            Back to Home
          </button>
        </div>

        {/* Notification Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-800">
            📱 You'll receive updates in your chat when the rider is assigned and when fuel is purchased.
          </p>
        </div>
      </div>
    </div>
  );
}