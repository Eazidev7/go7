import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, MapPin, Clock, Truck, Gift, AlertCircle, CreditCard } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useDelivery } from '../contexts/DeliveryContext';
import { useLocation } from '../contexts/LocationContext';
import { useOrder } from '../contexts/OrderContext';
import DeliveryInfo from './DeliveryInfo';

const SmartCheckout = ({ onProceed, className = '' }) => {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart } = useCartStore();
  const { 
    deliveryInfo, 
    getTotalOrderAmount, 
    getAmountForFreeDelivery,
    hasValidAddress,
    hasSelectedVendor,
    selectedVendor
  } = useDelivery();
  const { activeAddress } = useLocation();
  const { createOrder } = useOrder();

  const subtotal = getCartTotal();
  const deliveryFee = deliveryInfo.fee;
  const totalAmount = getTotalOrderAmount();
  const amountForFreeDelivery = getAmountForFreeDelivery();

  const canProceedToCheckout = cart.length > 0 && hasValidAddress && hasSelectedVendor && !deliveryInfo.error;

  const handleProceed = async () => {
    if (!canProceedToCheckout) return;
    
    try {
      // Create order with live tracking structure
      const orderData = {
        vendor: selectedVendor,
        pickup: {
          lat: selectedVendor.coordinates?.lat || 0,
          lng: selectedVendor.coordinates?.lng || 0,
          address: selectedVendor.address || '',
          name: selectedVendor.name || 'Pickup Location'
        },
        dropoff: {
          lat: activeAddress.coordinates.lat,
          lng: activeAddress.coordinates.lng,
          address: activeAddress.address,
          name: activeAddress.name || 'Delivery Address'
        },
        items: cart,
        subtotal,
        deliveryFee,
        total: totalAmount,
        distance: deliveryInfo.distance || 0,
        estimatedDeliveryTime: new Date(Date.now() + 30 * 60000), // 30 minutes from now
        instructions: '', // Could be added via a form field
        paymentMethod: 'cash' // Default payment method
      };

      const result = await createOrder(orderData);
      
      // Clear cart after successful order
      clearCart();
      
      // Navigate to live tracking
      navigate(`/track/${result.firebaseId}`);
      
      // Call onProceed callback if provided
      onProceed?.({
        ...orderData,
        orderId: result.orderId,
        firebaseId: result.firebaseId
      });
      
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order. Please try again.');
    }
  };

  if (cart.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center ${className}`}>
        <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <div className="text-gray-600 mb-2">Your cart is empty</div>
        <div className="text-sm text-gray-500">Add some delicious items to get started!</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Order Summary
        </h3>
      </div>

      {/* Cart Items */}
      <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
        {cart.map((item) => (
          <div key={`${item.id}-${item.selectedOptions?.join('-') || 'default'}`} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{item.name}</div>
              {item.selectedOptions && item.selectedOptions.length > 0 && (
                <div className="text-sm text-gray-500">
                  {item.selectedOptions.join(', ')}
                </div>
              )}
              <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
            </div>
            <div className="font-semibold text-gray-900">
              ₦{(item.price * item.quantity).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Address Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-[#E50914]" />
          <span className="font-medium text-gray-900">Delivery Address</span>
        </div>
        
        {activeAddress ? (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <div className="font-medium">{activeAddress.name || 'Selected Address'}</div>
            <div>{activeAddress.address}</div>
          </div>
        ) : (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Please select a delivery address</span>
          </div>
        )}
      </div>

      {/* Delivery Information */}
      <div className="border-t border-gray-200 p-4">
        <DeliveryInfo showDetailed={true} />
      </div>

      {/* Free Delivery Progress */}
      {amountForFreeDelivery > 0 && (
        <div className="border-t border-gray-100 p-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <Gift className="w-4 h-4" />
              <span>
                Add ₦{amountForFreeDelivery.toLocaleString()} more for FREE delivery!
              </span>
            </div>
            <div className="mt-2 bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((subtotal / deliveryInfo.freeDeliveryThreshold) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Order Totals */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">₦{subtotal.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Delivery Fee</span>
          <span className="font-medium">
            {deliveryInfo.isFreeDelivery ? (
              <div className="flex items-center gap-1 text-green-600">
                <Gift className="w-4 h-4" />
                <span>FREE</span>
              </div>
            ) : (
              `₦${deliveryFee.toLocaleString()}`
            )}
          </span>
        </div>
        
        {deliveryInfo.isFreeDelivery && deliveryInfo.originalFee && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Original delivery fee</span>
            <span className="line-through">₦{deliveryInfo.originalFee.toLocaleString()}</span>
          </div>
        )}
        
        <hr className="border-gray-200" />
        
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>₦{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Error Messages */}
      {deliveryInfo.error && (
        <div className="border-t border-gray-100 p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{deliveryInfo.error}</span>
          </div>
        </div>
      )}

      {/* Checkout Button */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleProceed}
          disabled={!canProceedToCheckout}
          className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
            canProceedToCheckout
              ? 'bg-[#E50914] text-white hover:bg-[#CC0812] shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          {deliveryInfo.isCalculating ? 'Calculating...' : 'Proceed to Payment'}
        </button>
        
        {!canProceedToCheckout && (
          <div className="mt-2 text-xs text-center text-gray-500">
            {!hasValidAddress && 'Select delivery address • '}
            {!hasSelectedVendor && 'Select restaurant • '}
            {deliveryInfo.error && 'Delivery unavailable'}
          </div>
        )}
      </div>

      {/* ETA Information */}
      {deliveryInfo.eta && canProceedToCheckout && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              Estimated delivery: {deliveryInfo.eta.formattedETA}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCheckout;