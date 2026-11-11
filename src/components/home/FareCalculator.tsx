import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FareCalculator = () => {
  const navigate = useNavigate();
  const [distance, setDistance] = useState(2);
  const [deliveryType, setDeliveryType] = useState('standard');

  const calculateFare = () => {
    const baseFare = 300;
    const perKmRate = deliveryType === 'standard' ? 100 : 150; // 1.5x for express
    return baseFare + (distance * perKmRate);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleBookDelivery = () => {
    navigate('/book-delivery');
  };

  return (
    <section className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">
            Calculate Your Delivery Fare
          </h2>
          <p className="text-[#6B7280]">
            Get an instant estimate for your delivery cost
          </p>
        </div>

        <div className="bg-[#FFF6F3] rounded-xl p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Calculator Controls */}
            <div className="space-y-6">
              {/* Delivery Type Toggle */}
              <div>
                <label className="block text-sm font-semibold text-[#1E1E1E] mb-3">
                  Delivery Type
                </label>
                <div className="flex bg-white rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setDeliveryType('standard')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                      deliveryType === 'standard'
                        ? 'bg-[#E53935] text-white shadow-sm'
                        : 'text-[#6B7280] hover:text-[#1E1E1E]'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setDeliveryType('express')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                      deliveryType === 'express'
                        ? 'bg-[#E53935] text-white shadow-sm'
                        : 'text-[#6B7280] hover:text-[#1E1E1E]'
                    }`}
                  >
                    Express
                  </button>
                </div>
              </div>

              {/* Distance Slider */}
              <div>
                <label htmlFor="distance-slider" className="block text-sm font-semibold text-[#1E1E1E] mb-3">
                  Distance: {distance} km
                </label>
                <div className="relative">
                  <input
                    id="distance-slider"
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #E53935 0%, #E53935 ${((distance - 1) / 19) * 100}%, #d1d5db ${((distance - 1) / 19) * 100}%, #d1d5db 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-[#6B7280] mt-2">
                    <span>1km</span>
                    <span>20km</span>
                  </div>
                </div>
              </div>

              {/* Delivery Time Info */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🕒</span>
                  <span className="font-semibold text-[#1E1E1E]">
                    Estimated Time
                  </span>
                </div>
                <p className="text-[#6B7280]">
                  {deliveryType === 'standard' ? '30-45 minutes' : '15-20 minutes'}
                </p>
              </div>
            </div>

            {/* Price Display & CTAs */}
            <div className="text-center">
              <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-[#E53935]">
                <div className="mb-4">
                  <p className="text-[#6B7280] text-sm mb-1">Total Delivery Cost</p>
                  <p className="text-4xl font-bold text-[#E53935]">
                    {formatPrice(calculateFare())}
                  </p>
                </div>
                
                <div className="space-y-2 text-sm text-[#6B7280] mb-6">
                  <div className="flex justify-between">
                    <span>Base fare:</span>
                    <span>{formatPrice(300)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distance ({distance}km):</span>
                    <span>{formatPrice(distance * (deliveryType === 'standard' ? 100 : 150))}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-[#1E1E1E]">
                    <span>Total:</span>
                    <span>{formatPrice(calculateFare())}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={handleBookDelivery}
                    className="w-full bg-[#E53935] hover:bg-[#B71C1C] text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Book Delivery
                  </button>
                  <button className="w-full border border-[#E53935] text-[#E53935] hover:bg-[#FFF6F3] py-2 rounded-lg font-semibold transition-colors">
                    Calculate Only
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-[#6B7280] text-sm">
            * Prices are estimates and may vary based on actual pickup and delivery locations
          </p>
        </div>
      </div>
    </section>
  );
};

export default FareCalculator;
