import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Share, AlertCircle, Star } from 'lucide-react';
import { useOrder } from '../contexts/OrderContext';
import { usePoints } from '../contexts/PointsContext';
import LiveTrackingMap from '../components/LiveTrackingMap';
import DeliveryStatusTracker from '../components/DeliveryStatusTracker';
import RateDeliveryModal from '../components/RateDeliveryModal';
import { ORDER_STATUS } from '../services/orderService';

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { currentOrder, trackOrder, isLoading, error, refreshOrder } = useOrder();
  const { pointsBalance } = usePoints();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasShownRatingModal, setHasShownRatingModal] = useState(false);

  useEffect(() => {
    if (orderId) {
      // Track the order by its Firebase ID or order ID
      trackOrder(orderId);
    }
  }, [orderId, trackOrder]);

  // Show rating modal when order is delivered (but only once)
  useEffect(() => {
    if (currentOrder && 
        currentOrder.status === ORDER_STATUS.DELIVERED && 
        !hasShownRatingModal && 
        !currentOrder.rated) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowRatingModal(true);
        setHasShownRatingModal(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [currentOrder, hasShownRatingModal]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrder();
    } catch (err) {
      console.error('Failed to refresh order:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && currentOrder) {
      try {
        await navigator.share({
          title: `Go7 Order Tracking - ${currentOrder.orderId}`,
          text: `Track my Go7 delivery order: ${currentOrder.orderId}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(window.location.href);
          showTrackingToast('Tracking link copied!', 'success');
        } catch (copyErr) {
          console.error('Failed to copy to clipboard:', copyErr);
          showTrackingToast('Failed to copy link', 'error');
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        showTrackingToast('Tracking link copied!', 'success');
      } catch (copyErr) {
        console.error('Failed to copy to clipboard:', copyErr);
        showTrackingToast('Failed to copy link', 'error');
      }
    }
  };

  // Modern tracking toast
  const showTrackingToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `tracking-toast ${type}`;
    toast.innerHTML = `
      <div class="tracking-toast-inner">
        <div class="tracking-icon">${type === 'success' ? '📋' : '❌'}</div>
        <span>${message}</span>
      </div>
    `;
    
    const styles = `
      .tracking-toast {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        padding: 16px 24px;
        border-radius: 20px;
        backdrop-filter: blur(20px);
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 15px;
        font-weight: 600;
        animation: trackingPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        min-width: 260px;
      }
      .tracking-toast.success {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95));
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .tracking-toast.error {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .tracking-toast-inner {
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: center;
      }
      .tracking-icon {
        font-size: 18px;
      }
      @keyframes trackingPop {
        0% {
          opacity: 0;
          transform: translateX(-50%) scale(0.8);
        }
        70% {
          opacity: 1;
          transform: translateX(-50%) scale(1.05);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }
      }
    `;
    
    if (!document.querySelector('#tracking-toast-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'tracking-toast-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handleRatingComplete = () => {
    setShowRatingModal(false);
    // Optionally refresh order to update rated status
    refreshOrder();
  };

  const handleRatingModalClose = () => {
    setShowRatingModal(false);
  };

  const getPageTitle = () => {
    if (!currentOrder) return 'Order Tracking';
    return `Order ${currentOrder.orderId}`;
  };

  const isOrderActive = () => {
    return currentOrder && [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.ON_THE_WAY
    ].includes(currentOrder.status);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E50914] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-[#E50914] text-white px-6 py-2 rounded-lg hover:bg-[#CC0812] transition-colors"
          >
            View All Orders
          </button>
        </div>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">
            We couldn't find the order you're looking for.
          </p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-[#E50914] text-white px-6 py-2 rounded-lg hover:bg-[#CC0812] transition-colors"
          >
            View All Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {getPageTitle()}
                </h1>
                <p className="text-sm text-gray-500">
                  Live tracking • {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Share className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Map */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  {isOrderActive() && (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                  Live Tracking
                </h2>
              </div>
              <div className="h-96 lg:h-[500px]">
                <LiveTrackingMap order={currentOrder} className="w-full h-full" />
              </div>
            </div>
          </div>

          {/* Order Status */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <DeliveryStatusTracker 
                order={currentOrder} 
                showDetailed={true}
              />
            </div>
          </div>
        </div>

        {/* Order Items */}
        {currentOrder.items && currentOrder.items.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-3">
              {currentOrder.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="text-sm text-gray-500">
                        {item.selectedOptions.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">x{item.quantity}</span>
                    <span className="font-medium">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Order total */}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="font-semibold text-lg">
                    ₦{currentOrder.total?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Special Instructions */}
        {currentOrder.instructions && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Special Instructions</h3>
            <p className="text-gray-600">{currentOrder.instructions}</p>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-700 text-sm mb-3">
            Having issues with your order? We're here to help.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Contact Support
            </button>
            <button className="bg-white text-blue-600 border border-blue-300 px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors">
              Report Issue
            </button>
          </div>
        </div>

        {/* Rate Order Section - Show for delivered orders that haven't been rated */}
        {currentOrder?.status === ORDER_STATUS.DELIVERED && !currentOrder?.rated && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Order Delivered! 🎉</h3>
                <p className="text-green-700 text-sm">
                  How was your experience? Rate your delivery and earn Go7 Points!
                </p>
              </div>
              <button
                onClick={() => setShowRatingModal(true)}
                className="bg-[#E50914] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#CC0812] transition-colors flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                Rate Order
              </button>
            </div>
          </div>
        )}

        {/* Show points earned if order has been rated */}
        {currentOrder?.status === ORDER_STATUS.DELIVERED && currentOrder?.rated && currentOrder?.pointsEarned && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Thanks for your rating! ⭐</h3>
                <p className="text-yellow-700 text-sm">
                  You earned {currentOrder.pointsEarned} Go7 Points for this order.
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-yellow-600">Current Balance</p>
                <p className="font-bold text-yellow-900">{pointsBalance} Points</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && currentOrder && (
        <RateDeliveryModal
          order={currentOrder}
          onClose={handleRatingModalClose}
          onRatingComplete={handleRatingComplete}
        />
      )}
    </div>
  );
};

export default OrderTrackingPage;