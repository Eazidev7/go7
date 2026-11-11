import React from 'react';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Truck, 
  MapPin, 
  Phone,
  MessageCircle,
  Star
} from 'lucide-react';
import { ORDER_STATUS, ORDER_STATUS_LABELS } from '../services/orderService';

const DeliveryStatusTracker = ({ order, showDetailed = true, className = '' }) => {
  if (!order) return null;

  const getStatusIcon = (status, isActive, isCompleted) => {
    const iconClass = `w-6 h-6 ${
      isCompleted ? 'text-green-500' : 
      isActive ? 'text-[#E50914]' : 
      'text-gray-400'
    }`;

    switch (status) {
      case ORDER_STATUS.PENDING:
        return <Clock className={iconClass} />;
      case ORDER_STATUS.ACCEPTED:
        return <CheckCircle className={iconClass} />;
      case ORDER_STATUS.PICKED_UP:
        return <Package className={iconClass} />;
      case ORDER_STATUS.ON_THE_WAY:
        return <Truck className={iconClass} />;
      case ORDER_STATUS.DELIVERED:
        return <MapPin className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  const getStatusMessage = (status, order) => {
    const messages = {
      [ORDER_STATUS.PENDING]: 'Looking for a rider...',
      [ORDER_STATUS.ACCEPTED]: `${order.rider?.name || 'Rider'} has accepted your order`,
      [ORDER_STATUS.PICKED_UP]: 'Order picked up from restaurant',
      [ORDER_STATUS.ON_THE_WAY]: `${order.rider?.name || 'Rider'} is on the way`,
      [ORDER_STATUS.DELIVERED]: 'Order delivered successfully!',
      [ORDER_STATUS.CANCELLED]: 'Order was cancelled'
    };
    return messages[status] || ORDER_STATUS_LABELS[status];
  };

  const getTimelineSteps = () => {
    return [
      { 
        status: ORDER_STATUS.PENDING, 
        label: 'Order Placed',
        description: 'Finding a rider for you'
      },
      { 
        status: ORDER_STATUS.ACCEPTED, 
        label: 'Order Accepted',
        description: 'Rider is heading to restaurant'
      },
      { 
        status: ORDER_STATUS.PICKED_UP, 
        label: 'Order Picked Up',
        description: 'Rider has your order'
      },
      { 
        status: ORDER_STATUS.ON_THE_WAY, 
        label: 'On The Way',
        description: 'Heading to your location'
      },
      { 
        status: ORDER_STATUS.DELIVERED, 
        label: 'Delivered',
        description: 'Enjoy your meal!'
      }
    ];
  };

  const getCurrentStepIndex = () => {
    const steps = getTimelineSteps();
    return steps.findIndex(step => step.status === order.status);
  };

  const isStepCompleted = (stepIndex) => {
    return stepIndex < getCurrentStepIndex();
  };

  const isStepActive = (stepIndex) => {
    return stepIndex === getCurrentStepIndex();
  };

  const getEstimatedTime = () => {
    if (order.status === ORDER_STATUS.DELIVERED) return null;
    
    // Mock ETA calculation - in production, this would be based on real data
    const etaMap = {
      [ORDER_STATUS.PENDING]: '5-10 min',
      [ORDER_STATUS.ACCEPTED]: '15-20 min',
      [ORDER_STATUS.PICKED_UP]: '10-15 min',
      [ORDER_STATUS.ON_THE_WAY]: '5-10 min'
    };
    
    return etaMap[order.status];
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    let date = timestamp;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-white ${className}`}>
      {/* Header with current status */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {getStatusIcon(order.status, true, order.status === ORDER_STATUS.DELIVERED)}
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {ORDER_STATUS_LABELS[order.status]}
            </h3>
            <p className="text-gray-600 text-sm">
              {getStatusMessage(order.status, order)}
            </p>
          </div>
        </div>
        
        {/* ETA */}
        {getEstimatedTime() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                Estimated arrival: {getEstimatedTime()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Rider Information */}
      {order.rider && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Your Rider</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="font-semibold text-gray-700">
                  {order.rider.name?.charAt(0) || 'R'}
                </span>
              </div>
              <div>
                <div className="font-medium">{order.rider.name}</div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <span>{order.rider.vehicle || 'Bike'}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span>{order.rider.rating || '5.0'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Timeline */}
      {showDetailed && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Order Timeline</h4>
          <div className="space-y-3">
            {getTimelineSteps().map((step, index) => {
              const isCompleted = isStepCompleted(index);
              const isActive = isStepActive(index);
              const timelineEntry = order.timeline?.find(entry => entry.status === step.status);
              
              return (
                <div key={step.status} className="flex items-start gap-3">
                  {/* Status indicator */}
                  <div className="relative">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-[#E50914] text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {getStatusIcon(step.status, isActive, isCompleted)}
                    </div>
                    {/* Connector line */}
                    {index < getTimelineSteps().length - 1 && (
                      <div
                        className={`w-0.5 h-6 mt-1 ml-4 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                  
                  {/* Step content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between">
                      <h5
                        className={`font-medium ${
                          isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </h5>
                      {timelineEntry && (
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(timelineEntry.timestamp)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm ${
                        isCompleted || isActive ? 'text-gray-600' : 'text-gray-400'
                      }`}
                    >
                      {timelineEntry?.message || step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Order Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Order ID:</span>
            <span className="font-medium">{order.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-medium">₦{order.total?.toLocaleString()}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee:</span>
              <span className="font-medium">₦{order.deliveryFee?.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-medium capitalize">{order.paymentMethod || 'Cash'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryStatusTracker;