import React from 'react';
import { FaClock, FaBox, FaRoute, FaCheckCircle, FaTimes } from 'react-icons/fa';

export default function DeliveryStatusIndicator({ 
  status = 'preparing', 
  riderLocation, 
  totalDistance = 0,
  estimatedDelivery,
  className = '' 
}) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'preparing':
        return {
          icon: FaClock,
          label: 'Preparing Order',
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50'
        };
      case 'picked_up':
        return {
          icon: FaBox,
          label: 'Order Picked Up',
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50'
        };
      case 'en_route':
        return {
          icon: FaRoute,
          label: 'On the Way',
          color: 'bg-purple-500',
          textColor: 'text-purple-700',
          bgColor: 'bg-purple-50'
        };
      case 'delivered':
        return {
          icon: FaCheckCircle,
          label: 'Delivered',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50'
        };
      case 'cancelled':
        return {
          icon: FaTimes,
          label: 'Cancelled',
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          icon: FaClock,
          label: 'Unknown Status',
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${distance}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return null;
    try {
      return new Date(timeString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return null;
    }
  };

  return (
    <div className={`${config.bgColor} rounded-lg p-4 border-l-4 border-l-${config.color.split('-')[1]}-500 ${className}`}>
      <div className="flex items-center mb-3">
        <div className={`${config.color} p-2 rounded-full text-white mr-3`}>
          <StatusIcon className="w-4 h-4" />
        </div>
        <div>
          <h3 className={`font-semibold ${config.textColor}`}>{config.label}</h3>
          <p className="text-sm text-gray-600">
            {status === 'preparing' && 'Your order is being prepared'}
            {status === 'picked_up' && 'Rider has collected your order'}
            {status === 'en_route' && 'Rider is on the way to you'}
            {status === 'delivered' && 'Order has been delivered'}
            {status === 'cancelled' && 'Order was cancelled'}
          </p>
        </div>
      </div>

      {/* Real-time info */}
      {riderLocation && status !== 'delivered' && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Last Update:</span>
            <span className="font-mono text-gray-800">
              {formatTime(riderLocation.updatedAt) || 'Just now'}
            </span>
          </div>
          
          {totalDistance > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Distance Traveled:</span>
              <span className="font-semibold text-gray-800">
                {formatDistance(totalDistance)}
              </span>
            </div>
          )}
          
          {riderLocation.speed > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Speed:</span>
              <span className="font-semibold text-gray-800">
                {Math.round(riderLocation.speed * 3.6)} km/h
              </span>
            </div>
          )}

          {estimatedDelivery && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ETA:</span>
              <span className="font-semibold text-green-600">
                {formatTime(estimatedDelivery)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Progress indicator */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Preparing</span>
          <span>Picked Up</span>
          <span>En Route</span>
          <span>Delivered</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${config.color}`}
            style={{
              width: status === 'preparing' ? '25%' :
                     status === 'picked_up' ? '50%' :
                     status === 'en_route' ? '75%' :
                     status === 'delivered' ? '100%' : '0%'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}