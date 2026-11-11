import React from 'react';
import { evaluateSLA, formatDuration } from '../../utils/sla.js';
import '../../styles/motion.css';

const SlaBadge = ({ order }) => {
  if (!order) return null;
  
  const sla = evaluateSLA({
    pickupStartedAt: order.pickupStartedAt,
    pickedUpAt: order.pickedUpAt,
    deliveredAt: order.deliveredAt,
    mode: order.mode
  });
  
  const getBadgeStyle = (isOk, isActive) => {
    if (!isActive) {
      return 'bg-gray-100 text-gray-600 border-gray-200';
    }
    return isOk 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };
  
  const formatDelta = (delta) => {
    if (delta === null) return '';
    if (delta <= 0) return ` (${formatDuration(Math.abs(delta))} early)`;
    return ` (${formatDuration(delta)} late)`;
  };
  
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {/* Pickup SLA Badge */}
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium border chip-motion
          ${getBadgeStyle(sla.pickupOk, order.pickupStartedAt)}
        `}>
          Pickup {sla.pickupOk ? 'OK' : 'Late'}
          {sla.pickupDelta !== null && formatDelta(sla.pickupDelta)}
        </div>
        
        {/* Delivery SLA Badge */}
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium border chip-motion
          ${getBadgeStyle(sla.deliveryOk, order.pickedUpAt)}
        `}>
          Delivery {sla.deliveryOk ? 'OK' : 'Late'}
          {sla.deliveryDelta !== null && formatDelta(sla.deliveryDelta)}
        </div>
        
        {/* Violation Badge */}
        {sla.violated && (
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 chip-motion">
            50% Fee Credit Applied
          </div>
        )}
      </div>
      
      {/* Time Display */}
      {(sla.pickupMinutes !== null || sla.deliveryMinutes !== null) && (
        <div className="text-xs text-gray-600">
          {sla.pickupMinutes !== null && (
            <span>Pickup: {formatDuration(sla.pickupMinutes)} </span>
          )}
          {sla.deliveryMinutes !== null && (
            <span>Delivery: {formatDuration(sla.deliveryMinutes)}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default SlaBadge;
