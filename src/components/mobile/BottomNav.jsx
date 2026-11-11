import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('explore');

  const tabs = [
    {
      id: 'explore',
      label: 'Explore Go7',
      icon: (active) => (
        <svg className={`w-6 h-6 ${active ? 'text-red-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      route: '/',
      isActive: location.pathname === '/' || location.pathname === '/mobile'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: (active) => (
        <svg className={`w-6 h-6 ${active ? 'text-red-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      route: '/orders',
      isActive: location.pathname === '/orders'
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: (active) => (
        <svg className={`w-6 h-6 ${active ? 'text-red-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      route: '/chat',
      isActive: location.pathname === '/chat'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (active) => (
        <svg className={`w-6 h-6 ${active ? 'text-red-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      route: '/profile',
      isActive: location.pathname === '/profile'
    }
  ];

  const handleTabClick = (tab) => {
    setActiveTab(tab.id);
    navigate(tab.route);
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
      style={{
        paddingBottom: 'calc(10px + var(--go7-safe-bottom, env(safe-area-inset-bottom, 0px)))',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
      }}
    >
      <div className="flex justify-around py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
              tab.isActive
                ? 'text-red-600 bg-red-50' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="mb-1">
              {tab.icon(tab.isActive)}
            </div>
            <span className={`text-xs font-medium ${
              tab.isActive ? 'text-red-600' : 'text-gray-400'
            }`}>
              {tab.label}
            </span>
            {tab.isActive && (
              <div className="absolute -top-1 w-1 h-1 bg-red-600 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
