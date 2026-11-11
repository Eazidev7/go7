import React from 'react';
import { Wallet, CreditCard, Droplet, MapPin, Truck, Shield, Clock, CheckCircle } from 'lucide-react';
import './FuelAnimations.css';

export default function FuelOrderSummary({ 
  fuelType, 
  amount, 
  volume, 
  location, 
  deliveryFee,
  platformFee,
  distanceKm,
  paymentMethod,
  walletBalance = 0,
  onPaymentMethodChange,
  onConfirm 
}) {
  const fuelTypeLabels = {
    petrol: 'Petrol',
    diesel: 'Diesel',
    cng: 'CNG'
  };

  const FUEL_PRICES = {
    petrol: 1200,
    diesel: 1600,
    cng: 1400
  };

  // Fuel is sold in whole litres/kg; the remainder (change) goes to the wallet
  const pricePerUnit = FUEL_PRICES[fuelType] || 1200;
  const fuelCost = (volume || 0) * pricePerUnit;
  const change = (amount || 0) - fuelCost;
  const totalAmount = fuelCost + deliveryFee + platformFee;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500">Order Summary</p>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Shield className="w-3 h-3" />
          <span>Secure Checkout</span>
        </div>
      </div>

      {/* Order Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between py-2 border-b border-gray-100 animate-slide-in">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E53935]/10 rounded-lg flex items-center justify-center">
              <Droplet className="w-4 h-4 text-[#E53935]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{fuelTypeLabels[fuelType]}</p>
              <p className="text-xs text-gray-500">{volume?.toFixed(1)} {fuelType === 'cng' ? 'KG' : 'Litres'}</p>
            </div>
          </div>
          <p className="text-sm font-bold text-gray-900">₦{fuelCost?.toLocaleString()}</p>
        </div>

        {change > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100 animate-slide-in delay-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Change to Wallet</p>
                <p className="text-xs text-gray-500">Remainder credited to your Go7 wallet</p>
              </div>
            </div>
            <p className="text-sm font-bold text-green-600">₦{change?.toLocaleString()}</p>
          </div>
        )}

        <div className="flex items-center justify-between py-2 border-b border-gray-100 animate-slide-in delay-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Delivery Fee</p>
              <p className="text-xs text-gray-500">
                Round trip (pick & drop off back) • {distanceKm?.toFixed(1)} km • Base: ₦1,000 + ₦{(deliveryFee - 1000)?.toLocaleString()} distance charge
              </p>
            </div>
          </div>
          <p className="text-sm font-bold text-gray-900">₦{deliveryFee?.toLocaleString()}</p>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100 animate-slide-in delay-300">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Platform Fee</p>
              <p className="text-xs text-gray-500">15% service charge</p>
            </div>
          </div>
          <p className="text-sm font-bold text-gray-900">₦{platformFee?.toLocaleString()}</p>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100 animate-slide-in">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Location</p>
              <p className="text-xs text-gray-500 truncate max-w-[150px]">{location?.address || 'Not selected'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between py-3 bg-gradient-to-r from-[#E53935]/5 to-[#E53935]/10 rounded-xl px-4 mb-4 border border-[#E53935]/20 animate-scale-in">
        <div>
          <p className="text-sm font-bold text-gray-900">Total Amount</p>
          <p className="text-[10px] text-gray-500">Inclusive of all fees</p>
        </div>
        <p className="text-lg font-bold text-[#E53935]">₦{totalAmount?.toLocaleString()}</p>
      </div>

      {/* Delivery Info Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2.5 bg-green-50 rounded-xl border border-green-100 animate-fade-in">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-green-600" />
            <span className="text-[10px] font-semibold text-green-600">Fast Delivery</span>
          </div>
          <p className="text-[10px] text-green-700">30-45 mins avg</p>
        </div>
        <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 animate-fade-in delay-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3 h-3 text-blue-600" />
            <span className="text-[10px] font-semibold text-blue-600">Safe & Secure</span>
          </div>
          <p className="text-[10px] text-blue-700">Verified riders</p>
        </div>
      </div>

      {/* Payment Method */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">Payment Method</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPaymentMethodChange('wallet')}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 ${
              paymentMethod === 'wallet'
                ? 'border-[#E53935] bg-[#E53935]/5 shadow-md scale-105'
                : 'border-gray-100 hover:border-gray-300'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              paymentMethod === 'wallet' ? 'bg-[#E53935]' : 'bg-gray-100'
            }`}>
              <Wallet className={`w-4 h-4 ${paymentMethod === 'wallet' ? 'text-white' : 'text-gray-600'}`} />
            </div>
            <div className="text-left">
              <span className={`text-sm font-semibold block ${paymentMethod === 'wallet' ? 'text-[#E53935]' : 'text-gray-700'}`}>
                Wallet
              </span>
              {paymentMethod === 'wallet' && (
                <span className={`text-[10px] ${walletBalance < totalAmount ? 'text-red-500' : 'text-green-600'}`}>
                  ₦{walletBalance.toLocaleString()} available
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onPaymentMethodChange('card')}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 ${
              paymentMethod === 'card'
                ? 'border-[#E53935] bg-[#E53935]/5 shadow-md scale-105'
                : 'border-gray-100 hover:border-gray-300'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              paymentMethod === 'card' ? 'bg-[#E53935]' : 'bg-gray-100'
            }`}>
              <CreditCard className={`w-4 h-4 ${paymentMethod === 'card' ? 'text-white' : 'text-gray-600'}`} />
            </div>
            <div className="text-left">
              <span className={`text-sm font-semibold block ${paymentMethod === 'card' ? 'text-[#E53935]' : 'text-gray-700'}`}>
                Card
              </span>
              {paymentMethod === 'card' && (
                <span className="text-[10px] text-green-600">Paystack secure</span>
              )}
            </div>
          </button>
        </div>
      </div>

      {paymentMethod === 'wallet' && walletBalance < totalAmount && (
        <div className="mb-3 p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-600 flex items-center gap-2">
          <Wallet className="w-4 h-4 flex-shrink-0" />
          Insufficient wallet balance. Top up or pay with card instead.
        </div>
      )}

      {/* Confirm Button */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={!location || !amount || (paymentMethod === 'wallet' && walletBalance < totalAmount)}
        className="w-full bg-gradient-to-r from-[#E53935] to-[#C62828] text-white py-4 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-[#E53935]/90 hover:to-[#C62828]/90 transition-all duration-300 shadow-lg shadow-[#E53935]/30 flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-5 h-5" />
        Confirm Order - ₦{totalAmount?.toLocaleString()}
      </button>
      
      {/* Security assurance */}
      <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-gray-400">
        <Shield className="w-3 h-3" />
        <span>Secure payment powered by Paystack</span>
      </div>
    </div>
  );
}