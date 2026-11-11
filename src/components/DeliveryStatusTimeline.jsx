import React from 'react';
// Alternative approach for PropTypes - first try without it

// Status step icons
const StepIcon = ({ status, active, completed }) => {
  const icons = {
    'pending': '⏳',
    'assigned': '🛵',
    'en-route-pickup': '🏃',
    'picked-up': '📦',
    'en-route-dropoff': '🚚',
    'delivered': '✅',
    'cancelled': '❌'
  };

  const baseClasses = "flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center";
  const stateClasses = completed 
    ? "bg-green-100 text-green-600" 
    : active 
      ? "bg-red-100 text-red-600 animate-pulse" 
      : "bg-gray-100 text-gray-400";

  return (
    <div className={`${baseClasses} ${stateClasses}`}>
      <span className="text-xl">{icons[status]}</span>
    </div>
  );
};

const DeliveryStatusTimeline = ({ currentStatus, estimatedTime }) => {
  // Status definitions with labels and descriptions
  const statuses = [
    {
      key: 'assigned',
      label: 'Rider Assigned',
      description: 'A rider has been assigned to your delivery'
    },
    {
      key: 'en-route-pickup',
      label: 'En Route to Pickup',
      description: 'Rider is heading to pickup location'
    },
    {
      key: 'picked-up',
      label: 'Package Picked Up',
      description: 'Rider has picked up your package'
    },
    {
      key: 'en-route-dropoff',
      label: 'En Route to Delivery',
      description: 'Rider is heading to delivery location'
    },
    {
      key: 'delivered',
      label: 'Delivered',
      description: 'Package has been delivered'
    }
  ];

  // Get the index of the current status
  const currentIndex = statuses.findIndex(s => s.key === currentStatus);
  
  // Handle case when status is not in our sequence (e.g. 'cancelled')
  const validIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="relative">
      {/* Status Progress Line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>
      
      {/* Status Steps */}
      <div className="relative z-10 space-y-8">
        {statuses.map((status, index) => {
          const isCompleted = index < validIndex;
          const isActive = index === validIndex;
          const showEta = isActive && ['en-route-pickup', 'en-route-dropoff'].includes(status.key) && estimatedTime;
          
          return (
            <div className="flex items-start" key={status.key}>
              <StepIcon 
                status={status.key} 
                active={isActive} 
                completed={isCompleted} 
              />
              
              <div className="ml-4">
                <h3 className={`text-base font-medium ${
                  isCompleted ? 'text-green-800' :
                  isActive ? 'text-red-800' :
                  'text-gray-500'
                }`}>
                  {status.label}
                </h3>
                
                <p className="mt-1 text-sm text-gray-500">
                  {status.description}
                </p>
                
                {showEta && (
                  <p className="mt-1 text-sm font-medium text-red-600 flex items-center">
                    <span className="mr-1">⏱️</span> 
                    ETA: {estimatedTime} min
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Temporarily commenting out PropTypes validation until we resolve the dependency issue
/* 
DeliveryStatusTimeline.propTypes = {
  currentStatus: PropTypes.oneOf([
    'pending',
    'assigned',
    'en-route-pickup', 
    'picked-up', 
    'en-route-dropoff', 
    'delivered',
    'cancelled'
  ]).isRequired,
  estimatedTime: PropTypes.number
};
*/

export default DeliveryStatusTimeline;
