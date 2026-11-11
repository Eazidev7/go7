import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, ShoppingBag, Calendar, X } from 'lucide-react';

const FABMenu = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const menuOptions = [
    {
      id: 'delivery',
      label: 'Book Delivery',
      icon: Package,
      route: '/book-delivery',
      gradient: 'from-red-500 to-orange-500'
    },
    {
      id: 'gobuy',
      label: 'GoBuy',
      icon: ShoppingBag,
      route: '/gobuy',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      route: '/schedule-pickup',
      gradient: 'from-purple-500 to-pink-500'
    }
  ];

  const handleOptionClick = (route) => {
    setIsOpen(false);
    setTimeout(() => {
      navigate(route);
    }, 200);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 animate-fadeIn"
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-20 right-4 z-50">
        {/* Menu Options */}
        <div
          className={`flex flex-col space-y-3 mb-3 transition-all duration-300 ${
            isOpen
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {menuOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <div
                key={option.id}
                className="flex items-center justify-end space-x-3"
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
                }}
              >
                {/* Label */}
                <div className="bg-white px-4 py-2 rounded-full shadow-lg">
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {option.label}
                  </span>
                </div>

                {/* Icon Button */}
                <button
                  onClick={() => handleOptionClick(option.route)}
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${option.gradient} shadow-lg flex items-center justify-center transform transition-all hover:scale-110 active:scale-95`}
                >
                  <IconComponent className="w-6 h-6 text-white" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-500 shadow-xl flex items-center justify-center transform transition-all hover:scale-110 active:scale-95 ${
            isOpen ? 'rotate-45' : 'rotate-0'
          }`}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? (
            <X className="w-7 h-7 text-white" />
          ) : (
            <Plus className="w-7 h-7 text-white" />
          )}
        </button>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default FABMenu;
