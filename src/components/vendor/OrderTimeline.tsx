import React, { useEffect, useState } from 'react';
import { VendorOrderEvent } from '../../types/vendorOrder';
import { subscribeToOrderEvents } from '../../services/vendorOrderService';
import { CheckCircleIcon, XCircleIcon, ClockIcon, TruckIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';

interface OrderTimelineProps {
  orderId: string;
}

const OrderTimeline: React.FC<OrderTimelineProps> = ({ orderId }) => {
  const [events, setEvents] = useState<VendorOrderEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = subscribeToOrderEvents(orderId, (newEvents) => {
      setEvents(newEvents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  const getEventIcon = (type: VendorOrderEvent['type']) => {
    switch (type) {
      case 'created':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'accepted':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'declined':
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'ready':
        return <CheckBadgeIcon className="h-5 w-5 text-purple-500" />;
      case 'picked_up':
        return <TruckIcon className="h-5 w-5 text-orange-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getEventColor = (type: VendorOrderEvent['type']) => {
    switch (type) {
      case 'created':
        return 'border-blue-200 bg-blue-50';
      case 'accepted':
        return 'border-green-200 bg-green-50';
      case 'declined':
      case 'cancelled':
        return 'border-red-200 bg-red-50';
      case 'ready':
        return 'border-purple-200 bg-purple-50';
      case 'picked_up':
        return 'border-orange-200 bg-orange-50';
      case 'completed':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-3">
              <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <ClockIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, eventIndex) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIndex !== events.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`rounded-lg border px-4 py-3 ${getEventColor(event.type)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {event.message || `Order ${event.type}`}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <span className="capitalize">{event.actor}</span>
                          <span>•</span>
                          <span>{event.timestamp.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Show metadata if available */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrderTimeline;
