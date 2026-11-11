import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Info, Calculator } from 'lucide-react';
import './FuelAnimations.css';

// Fuel prices per litre/kg (will be fetched from backend)
const FUEL_PRICES = {
  petrol: 1200, // Default — will fetch from backend pricing settings
  diesel: 1600, // Default — will fetch from backend pricing settings
  cng: 1400    // Default — will fetch from backend pricing settings
};

export default function FuelAmountInput({ fuelType, amount, onChange, onVolumeChange }) {
  const [volume, setVolume] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (amount && fuelType) {
      const pricePerUnit = FUEL_PRICES[fuelType] || 1200;
      // Fuel is sold in whole litres/kg; the remainder (change) goes to the wallet
      const wholeUnits = Math.floor(amount / pricePerUnit);
      setVolume(wholeUnits);
      onVolumeChange?.(wholeUnits);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    } else {
      setVolume(0);
      onVolumeChange?.(0);
    }
  }, [amount, fuelType, onVolumeChange]);

  const formatVolume = (vol) => {
    if (vol < 1) {
      return `${(vol * 1000).toFixed(0)}ml`;
    }
    return `${vol.toFixed(1)} ${fuelType === 'cng' ? 'KG' : 'Litres'}`;
  };

  const getChange = () => {
    if (!amount || !fuelType) return 0;
    const pricePerUnit = FUEL_PRICES[fuelType] || 1200;
    const wholeUnits = Math.floor(amount / pricePerUnit);
    return amount - wholeUnits * pricePerUnit;
  };

  const change = getChange();

  const getUnitLabel = () => {
    if (fuelType === 'cng') return 'KG';
    return 'Litres';
  };

  const getPricePerUnit = () => {
    return FUEL_PRICES[fuelType] || 1200;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-gray-500">Enter Amount</p>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Calculator className="w-3 h-3" />
            <span>₦{getPricePerUnit()}/{getUnitLabel()}</span>
          </div>
        </div>
        {volume > 0 && (
          <span className={`text-[10px] font-bold uppercase tracking-wide bg-[#E53935]/10 text-[#E53935] px-2 py-0.5 rounded-full ${isAnimating ? 'animate-pulse' : ''}`}>
            {formatVolume(volume)}
          </span>
        )}
      </div>

      {volume > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-r from-[#E53935]/5 to-[#E53935]/10 rounded-xl border border-[#E53935]/20 animate-slide-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#E53935]" />
              <span className="text-xs font-semibold text-[#E53935]">You'll get</span>
            </div>
            <span className="text-sm font-bold text-[#E53935]">{formatVolume(volume)}</span>
          </div>
        </div>
      )}

      {change > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 animate-slide-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-600">Wallet Credit</span>
            </div>
            <span className="text-sm font-bold text-green-600">+₦{change.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-green-700 mt-1">Change automatically credited</p>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-500 font-semibold">₦</span>
        </div>
        <input
          type="number"
          min={1000}
          step={500}
          value={amount || ''}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : '')}
          placeholder="Enter amount"
          className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E53935]/40 focus:border-[#E53935] text-[#121212] text-lg font-semibold transition-all duration-300"
        />
        {amount > 0 && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="w-2 h-2 bg-[#E53935] rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Quick amount suggestions */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {[1000, 2000, 5000, 10000].map((suggestedAmount) => (
          <button
            key={suggestedAmount}
            type="button"
            onClick={() => onChange(suggestedAmount)}
            className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-300 ${
              amount === suggestedAmount
                ? 'border-[#E53935] bg-[#E53935]/5 text-[#E53935] shadow-md scale-105'
                : 'border-gray-100 text-gray-600 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            ₦{suggestedAmount.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Info card */}
      <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-[10px] text-blue-700">
            <p className="font-semibold mb-1">How it works</p>
            <p>Enter amount → Get exact litres → Change credited to wallet</p>
          </div>
        </div>
      </div>
    </div>
  );
}