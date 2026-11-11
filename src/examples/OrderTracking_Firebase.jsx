/**
 * Order Tracking Page using Firebase Hooks
 * Real-time order tracking with Firebase
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderTracking } from '../hooks/useFirebase';

export default function OrderTracking_Firebase() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { order, loading } = useOrderTracking(orderId);

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: {
        icon: '⏳',
        title: 'Order Placed',
        description: 'Waiting for vendor confirmation',
        color: 'yellow',
        progress: 20
      },
      confirmed: {
        icon: '✅',
        title: 'Confirmed',
        description: 'Your order is being prepared',
        color: 'blue',
        progress: 40
      },
      preparing: {
        icon: '👨‍🍳',
        title: 'Preparing',
        description: 'Your food is being prepared',
        color: 'orange',
        progress: 60
      },
      ready: {
        icon: '📦',
        title: 'Ready for Pickup',
        description: 'Waiting for courier',
        color: 'purple',
        progress: 70
      },
      picked_up: {
        icon: '🚗',
        title: 'Out for Delivery',
        description: 'Courier is on the way',
        color: 'indigo',
        progress: 85
      },
      delivered: {
        icon: '🎉',
        title: 'Delivered',
        description: 'Enjoy your meal!',
        color: 'green',
        progress: 100
      },
      cancelled: {
        icon: '❌',
        title: 'Cancelled',
        description: 'Order was cancelled',
        color: 'red',
        progress: 0
      }
    };

    return statusMap[status] || statusMap.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#E63946] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find this order</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-[#E63946] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#d32f3d]"
          >
            View My Orders
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Order Tracking</h1>
            <p className="text-sm text-gray-600">#{order.id.slice(-8)}</p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">{statusInfo.icon}</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {statusInfo.title}
            </h2>
            <p className="text-gray-600">{statusInfo.description}</p>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-${statusInfo.color}-500 transition-all duration-500`}
                style={{ width: `${statusInfo.progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Placed</span>
              <span>Preparing</span>
              <span>Delivery</span>
              <span>Done</span>
            </div>
          </div>

          {/* Estimated Time */}
          {order.estimatedDeliveryTime && order.status !== 'delivered' && (
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 mb-1">Estimated Delivery</p>
              <p className="text-xl font-bold text-[#E63946]">
                {new Date(order.estimatedDeliveryTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>

        {/* Courier Info */}
        {order.courier && order.status === 'picked_up' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Your Courier</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                {order.courier.avatar || '🚴'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{order.courier.name}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>⭐ {order.courier.rating || 'N/A'}</span>
                  <span>•</span>
                  <span>{order.courier.vehicle || 'Bike'}</span>
                </div>
              </div>
              <a
                href={`tel:${order.courier.phone}`}
                className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center"
              >
                📞
              </a>
            </div>
          </div>
        )}

        {/* Vendor Info */}
        {order.vendor && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Vendor</h3>
            <div className="flex items-center gap-3">
              {order.vendor.image && (
                <img
                  src={order.vendor.image}
                  alt={order.vendor.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{order.vendor.name}</p>
                <p className="text-sm text-gray-600">{order.vendor.address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.addons && item.addons.length > 0 && (
                    <p className="text-sm text-gray-600">
                      + {item.addons.map(a => a.name).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₦{order.subtotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>₦{order.deliveryFee?.toLocaleString()}</span>
            </div>
            {order.serviceFee && (
              <div className="flex justify-between text-gray-600">
                <span>Service Fee</span>
                <span>₦{order.serviceFee.toLocaleString()}</span>
              </div>
            )}
            {order.discount && order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₦{order.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>₦{order.total?.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between text-gray-600">
                <span>Payment Method</span>
                <span className="font-medium text-gray-900">
                  {order.paymentMethod === 'wallet' ? '💰 Wallet' : 
                   order.paymentMethod === 'card' ? '💳 Card' : 
                   '💵 Cash'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        {order.deliveryAddress && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Delivery Address</h3>
            <div className="flex gap-3">
              <div className="text-2xl">📍</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {order.deliveryAddress.label || 'Home'}
                </p>
                <p className="text-sm text-gray-600">{order.deliveryAddress.address}</p>
                {order.deliveryAddress.instructions && (
                  <p className="text-sm text-gray-600 mt-1">
                    Note: {order.deliveryAddress.instructions}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {order.status === 'delivered' && (
            <button
              onClick={() => navigate(`/rate-order/${order.id}`)}
              className="w-full bg-[#E63946] text-white py-4 rounded-xl font-semibold hover:bg-[#d32f3d]"
            >
              Rate Your Order
            </button>
          )}
          
          {['pending', 'confirmed'].includes(order.status) && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this order?')) {
                  // Handle cancellation
                }
              }}
              className="w-full bg-white border-2 border-red-500 text-red-500 py-4 rounded-xl font-semibold hover:bg-red-50"
            >
              Cancel Order
            </button>
          )}
          
          <button
            onClick={() => navigate('/support', { state: { orderId: order.id } })}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
