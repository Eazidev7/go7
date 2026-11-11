import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from './LocationContext';
import { useCartStore } from '../store/cartStore';
import { 
  calculateDeliveryFee, 
  calculateDeliveryETA, 
  checkDeliveryAvailability,
  filterVendorsByRadius 
} from '../utils/deliveryCalculations';

const DeliveryContext = createContext();

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
};

export const DeliveryProvider = ({ children }) => {
  const { activeAddress } = useLocation();
  const { cart, getCartTotal } = useCartStore();
  
  const [deliveryInfo, setDeliveryInfo] = useState({
    fee: 0,
    eta: null,
    isCalculating: false,
    error: null
  });
  
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Calculate delivery details when address or cart changes
  useEffect(() => {
    if (activeAddress?.coordinates && selectedVendor?.coordinates) {
      calculateDeliveryDetails();
    } else {
      setDeliveryInfo({
        fee: 0,
        eta: null,
        isCalculating: false,
        error: null
      });
    }
  }, [activeAddress, cart, selectedVendor]);

  const calculateDeliveryDetails = async () => {
    if (!activeAddress?.coordinates || !selectedVendor?.coordinates) {
      return;
    }

    setDeliveryInfo(prev => ({ ...prev, isCalculating: true, error: null }));

    try {
      const deliveryAvailability = checkDeliveryAvailability(
        selectedVendor,
        activeAddress.coordinates
      );

      if (!deliveryAvailability.isAvailable) {
        setDeliveryInfo({
          fee: 0,
          eta: null,
          isCalculating: false,
          error: deliveryAvailability.reason
        });
        return;
      }

      const orderTotal = getCartTotal();
      const feeInfo = calculateDeliveryFee(deliveryAvailability.distance, orderTotal);
      const etaInfo = calculateDeliveryETA(deliveryAvailability.distance);

      setDeliveryInfo({
        fee: feeInfo.fee,
        originalFee: feeInfo.originalFee,
        isFreeDelivery: feeInfo.isFreeDelivery,
        freeDeliveryThreshold: feeInfo.freeDeliveryThreshold,
        distance: deliveryAvailability.distance,
        eta: etaInfo,
        isCalculating: false,
        error: null
      });

    } catch (error) {
      console.error('Error calculating delivery:', error);
      setDeliveryInfo({
        fee: 0,
        eta: null,
        isCalculating: false,
        error: 'Unable to calculate delivery details'
      });
    }
  };

  const updateSelectedVendor = (vendor) => {
    setSelectedVendor(vendor);
  };

  const getVendorsInRange = (vendors) => {
    if (!activeAddress?.coordinates) return vendors;
    return filterVendorsByRadius(vendors, activeAddress.coordinates);
  };

  const canDeliverTo = (vendor) => {
    if (!activeAddress?.coordinates || !vendor?.coordinates) return false;
    
    const availability = checkDeliveryAvailability(vendor, activeAddress.coordinates);
    return availability.isAvailable;
  };

  const getDeliveryInfoForVendor = (vendor) => {
    if (!activeAddress?.coordinates || !vendor?.coordinates) return null;
    
    return checkDeliveryAvailability(vendor, activeAddress.coordinates);
  };

  const getTotalOrderAmount = () => {
    const cartTotal = getCartTotal();
    return cartTotal + deliveryInfo.fee;
  };

  const getAmountForFreeDelivery = () => {
    if (!deliveryInfo.freeDeliveryThreshold) return 0;
    
    const currentTotal = getCartTotal();
    const remaining = deliveryInfo.freeDeliveryThreshold - currentTotal;
    return remaining > 0 ? remaining : 0;
  };

  const value = {
    deliveryInfo,
    selectedVendor,
    isCalculating: deliveryInfo.isCalculating,
    updateSelectedVendor,
    calculateDeliveryDetails,
    getVendorsInRange,
    canDeliverTo,
    getDeliveryInfoForVendor,
    getTotalOrderAmount,
    getAmountForFreeDelivery,
    hasValidAddress: !!activeAddress?.coordinates,
    hasSelectedVendor: !!selectedVendor
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
};

export default DeliveryContext;