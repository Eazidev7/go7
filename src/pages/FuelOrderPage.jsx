import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Wallet, Droplet, Truck, Shield, Clock, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { useAuthContext } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { subscribeToUnifiedWalletBalance } from '../utils/walletBalance';
import FuelTypeSelector from '../components/fuel/FuelTypeSelector';
import FuelAmountInput from '../components/fuel/FuelAmountInput';
import FuelLocationSelector from '../components/fuel/FuelLocationSelector';
import FuelOrderSummary from '../components/fuel/FuelOrderSummary';
import FuelOrderSuccess from '../components/fuel/FuelOrderSuccess';
import '../components/fuel/FuelAnimations.css';

export default function FuelOrderPage({ onBack }) {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { activeAddress } = useLocation();
  const [step, setStep] = useState(1);
  const [walletBalance, setWalletBalance] = useState(0);
  const [orderData, setOrderData] = useState({
    fuelType: 'petrol', // Default as shown in design
    amount: '',
    volume: 0,
    location: null,
    distanceKm: 0,
    deliveryFee: 0,
    platformFee: 0,
    paymentMethod: 'wallet'
  });

  useEffect(() => {
    if (!user?.uid) {
      setWalletBalance(0);
      return undefined;
    }
    return subscribeToUnifiedWalletBalance(user.uid, setWalletBalance);
  }, [user?.uid]);

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else if (onBack) {
      // FigmaApp or parent screen navigation
      onBack();
    } else {
      // Web: go back in history if available, otherwise fall back to home
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  const handleFuelTypeSelect = (fuelType) => {
    setOrderData(prev => ({ ...prev, fuelType }));
    setStep(2);
  };

  const handleAmountChange = (amount) => {
    setOrderData(prev => ({ ...prev, amount }));
  };

  const handleVolumeChange = (volume) => {
    setOrderData(prev => ({ ...prev, volume }));
  };

  const handleLocationChange = async (location) => {
    // Calculate distance-based delivery fee
    const FUEL_DELIVERY_BASE_FEE = 1000;
    const FUEL_DELIVERY_PER_KM = 250;
    const FUEL_PLATFORM_FEE_RATE = 0.15;
    const MAX_FUEL_DELIVERY_KM = 20;

    let locationUpdate = { ...location };

    // Get the real distance to the nearest fuel station for an accurate fee
    try {
      const getNearest = httpsCallable(functions, 'getNearestFuelStation');
      const res = await getNearest({ lat: location.lat, lng: location.lng, fuelType: orderData.fuelType });

      if (res.data?.success) {
        const stationDistanceKm = res.data.distanceKm || 0;
        const stationName = res.data.station?.name || 'Nearest Station';

        if (stationDistanceKm > MAX_FUEL_DELIVERY_KM) {
          locationUpdate = {
            ...locationUpdate,
            stationName,
            distanceKm: stationDistanceKm,
            serviceable: false,
            serviceError: `Fuel delivery is not available beyond ${MAX_FUEL_DELIVERY_KM} km. You are ${stationDistanceKm.toFixed(1)} km from the nearest station.`,
          };
        } else {
          // Fuel delivery is always a round trip: rider goes to station and back
          const distanceKm = stationDistanceKm * 2;
          const distanceCharge = distanceKm * FUEL_DELIVERY_PER_KM;
          const deliveryFee = FUEL_DELIVERY_BASE_FEE + distanceCharge;
          const platformFee = Math.round(deliveryFee * FUEL_PLATFORM_FEE_RATE);

          locationUpdate = {
            ...locationUpdate,
            stationName,
            distanceKm,
            stationDistanceKm,
            deliveryFee,
            platformFee,
            serviceable: true,
            serviceError: null,
          };
        }
      } else {
        locationUpdate = {
          ...locationUpdate,
          serviceable: false,
          serviceError: 'No fuel station is available near this location.',
        };
      }
    } catch (error) {
      console.error('Could not get nearest fuel station distance:', error);
      locationUpdate = {
        ...locationUpdate,
        serviceable: false,
        serviceError: 'Could not verify fuel station. Please try again.',
      };
    }

    setOrderData(prev => ({
      ...prev,
      location: locationUpdate,
      stationDistanceKm: locationUpdate.stationDistanceKm,
      distanceKm: locationUpdate.distanceKm,
      deliveryFee: locationUpdate.deliveryFee,
      platformFee: locationUpdate.platformFee,
    }));
  };

  // Prefill fuel location from the user's saved active address
  useEffect(() => {
    if (orderData.location) return;
    if (!activeAddress?.coordinates?.lat || !activeAddress?.coordinates?.lng) return;
    if (activeAddress.address === 'Tap to set your address') return;
    handleLocationChange({
      lat: activeAddress.coordinates.lat,
      lng: activeAddress.coordinates.lng,
      address: activeAddress.address,
    });
  }, [activeAddress]);

  const handlePaymentMethodChange = (method) => {
    setOrderData(prev => ({ ...prev, paymentMethod: method }));
  };

  const handleConfirmOrder = async () => {
    // Validate all fields
    if (!orderData.fuelType || !orderData.amount || !orderData.location) {
      toast.error('Please complete all fields');
      return;
    }

    if (orderData.location?.serviceable === false) {
      toast.error(orderData.location?.serviceError || 'Selected location is not serviceable. Please pick a different location.');
      return;
    }

    // Show loading state
    const loadingToast = toast.loading('Processing your order...');

    try {
      // Call Firebase function
      const createFuelOrder = httpsCallable(functions, 'createFuelOrder');
      const result = await createFuelOrder({
        fuelType: orderData.fuelType,
        amount: orderData.amount,
        deliveryLocation: orderData.location,
        paymentMethod: orderData.paymentMethod
      });

      toast.dismiss(loadingToast);

      const { orderId, orderRef, totalAmount, estimatedDeliveryTime } = result.data;

      setOrderData(prev => ({ 
        ...prev, 
        orderId,
        orderRef,
        totalAmount,
        estimatedDeliveryTime,
        status: 'confirmed',
        createdAt: new Date()
      }));

      setStep(5); // Success screen
      toast.success('Order placed successfully!');

    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMessage = error.message || 'Failed to place order. Please try again.';
      toast.error(errorMessage);
      console.error('Fuel order error:', error);
    }
  };

  const handleTrackOrder = () => {
    navigate(`/track/${orderData.orderRef}`);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  // Show success screen
  if (step === 5) {
    return (
      <FuelOrderSuccess 
        orderData={orderData}
        onTrackOrder={handleTrackOrder}
        onBackToHome={handleBackToHome}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-br from-[#E53935] to-[#C62828] px-5 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 animate-pulse delay-100" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors duration-300"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-white text-xl font-bold">Fuel & CNG Delivery</h1>
              <p className="text-white/80 text-xs mt-0.5">Premium fuel to your doorstep</p>
            </div>
          </div>

          {/* Wallet Balance Card */}
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between border border-white/20">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-white/80">Wallet Balance</span>
                <div className="text-white font-bold text-lg">₦{walletBalance.toLocaleString()}</div>
              </div>
            </div>
            <button className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors duration-300">
              Top Up
            </button>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-5 -mt-4 mb-4">
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                ${step >= stepNumber 
                  ? 'bg-[#E53935] text-white shadow-lg shadow-[#E53935]/30 scale-110' 
                  : 'bg-gray-100 text-gray-400'
                }
              `}>
                {step > stepNumber ? (
                  <div className="animate-bounce">✓</div>
                ) : stepNumber}
              </div>
              {stepNumber < 4 && (
                <div className={`
                  w-8 h-1 mx-1 rounded-full transition-all duration-300
                  ${step > stepNumber ? 'bg-[#E53935]' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Service Highlights Cards */}
      {step === 1 && (
        <div className="px-5 mb-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate-fade-in">
              <div className="w-8 h-8 bg-[#E53935]/10 rounded-lg flex items-center justify-center mb-2">
                <Truck className="w-4 h-4 text-[#E53935]" />
              </div>
              <p className="text-[10px] font-semibold text-gray-700">Fast Delivery</p>
              <p className="text-[8px] text-gray-500">30-45 mins</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate-fade-in delay-100">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center mb-2">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-[10px] font-semibold text-gray-700">Safe & Secure</p>
              <p className="text-[8px] text-gray-500">Verified riders</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate-fade-in delay-200">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center mb-2">
                <Star className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-[10px] font-semibold text-gray-700">Premium Fuel</p>
              <p className="text-[8px] text-gray-500">Quality assured</p>
            </div>
          </div>
        </div>
      )}

      {/* Promo Banner */}
      {step === 1 && (
        <div className="px-5 mb-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-3 border border-yellow-200 animate-slide-in">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-800">First Order Discount</p>
                <p className="text-[10px] text-gray-600">Get 10% off on your first fuel delivery</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-5 space-y-4">
        {step === 1 && (
          <FuelTypeSelector 
            selectedFuel={orderData.fuelType}
            onSelect={handleFuelTypeSelect}
          />
        )}

        {step === 2 && (
          <>
            <FuelTypeSelector 
              selectedFuel={orderData.fuelType}
              onSelect={handleFuelTypeSelect}
            />
            <FuelAmountInput 
              fuelType={orderData.fuelType}
              amount={orderData.amount}
              onChange={handleAmountChange}
              onVolumeChange={handleVolumeChange}
            />
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!orderData.amount}
              className="w-full bg-[#E53935] text-white py-4 rounded-2xl font-bold disabled:opacity-50 hover:bg-[#E53935]/90 transition-colors duration-300 shadow-lg shadow-[#E53935]/30"
            >
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <FuelTypeSelector 
              selectedFuel={orderData.fuelType}
              onSelect={handleFuelTypeSelect}
            />
            <FuelAmountInput 
              fuelType={orderData.fuelType}
              amount={orderData.amount}
              onChange={handleAmountChange}
              onVolumeChange={handleVolumeChange}
            />
            <FuelLocationSelector 
              location={orderData.location}
              onLocationChange={handleLocationChange}
            />
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={!orderData.location || orderData.location?.serviceable === false}
              className="w-full bg-[#E53935] text-white py-4 rounded-2xl font-bold disabled:opacity-50 hover:bg-[#E53935]/90 transition-colors duration-300 shadow-lg shadow-[#E53935]/30"
            >
              Continue
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <FuelTypeSelector 
              selectedFuel={orderData.fuelType}
              onSelect={handleFuelTypeSelect}
            />
            <FuelAmountInput 
              fuelType={orderData.fuelType}
              amount={orderData.amount}
              onChange={handleAmountChange}
              onVolumeChange={handleVolumeChange}
            />
            <FuelLocationSelector 
              location={orderData.location}
              onLocationChange={handleLocationChange}
            />
            <FuelOrderSummary 
              fuelType={orderData.fuelType}
              amount={orderData.amount}
              volume={orderData.volume}
              location={orderData.location}
              deliveryFee={orderData.deliveryFee}
              platformFee={orderData.platformFee}
              distanceKm={orderData.distanceKm}
              paymentMethod={orderData.paymentMethod}
              walletBalance={walletBalance}
              onPaymentMethodChange={handlePaymentMethodChange}
              onConfirm={handleConfirmOrder}
            />
          </>
        )}
      </div>
    </div>
  );
}