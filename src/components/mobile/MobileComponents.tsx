import React from 'react';
import { useNavigate } from 'react-router-dom';

interface MobilePromoBannerProps {
  className?: string;
}

const MobilePromoBanner: React.FC<MobilePromoBannerProps> = ({
  className = ""
}) => {
  return (
    <div className={`bg-gradient-to-r from-red-500 to-pink-600 text-white p-4 mx-4 rounded-xl shadow-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-bold text-lg">Get ₦200 Off</div>
          <div className="text-sm opacity-90">Your First Order</div>
          <div className="text-xs mt-1 bg-white/20 px-2 py-1 rounded-full inline-block">
            Code: GOFIRST
          </div>
        </div>
        <div className="text-4xl">🎉</div>
      </div>
    </div>
  );
};

interface QuickActionButtonsProps {
  className?: string;
}

const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({
  className = ""
}) => {
  const navigate = useNavigate();

  const quickActions = [
    {
      id: 'book',
      title: 'Book Delivery',
      subtitle: 'Send packages',
      icon: '📦',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      action: () => navigate('/book-enhanced')
    },
    {
      id: 'gobuy',
      title: 'GoBuy',
      subtitle: 'Personal shopping',
      icon: '🛍️',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      action: () => navigate('/gobuy')
    },
    {
      id: 'track',
      title: 'Track Order',
      subtitle: 'Live updates',
      icon: '📍',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      action: () => navigate('/track')
    }
  ];

  return (
    <div className={`px-4 ${className}`}>
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`${action.color} ${action.hoverColor} text-white p-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95`}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">{action.icon}</div>
              <div className="font-semibold text-sm">{action.title}</div>
              <div className="text-xs opacity-90">{action.subtitle}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

interface LiveLocationBoxProps {
  className?: string;
}

const LiveLocationBox: React.FC<LiveLocationBoxProps> = ({
  className = ""
}) => {
  const [currentLocation] = React.useState<string>('Abeokuta, NG');
  const [isDetecting] = React.useState(false);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 mx-4 shadow-sm ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="bg-red-100 p-2 rounded-lg">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">Your Location</div>
          <div className="flex items-center space-x-2">
            {isDetecting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-600">Detecting...</span>
              </>
            ) : (
              <span className="text-sm text-gray-600">{currentLocation}</span>
            )}
          </div>
        </div>

        <div className={`w-3 h-3 rounded-full ${isDetecting ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
      </div>
    </div>
  );
};

export { MobilePromoBanner, QuickActionButtons, LiveLocationBox };