import React, { useState } from 'react';
import Go7Icon from '../components/Go7Icon';
import '../styles/go7-icons.css';

const IconShowcase = () => {
  const [activeIcon, setActiveIcon] = useState('burger');

  const categoryIcons = [
    { type: 'burger', name: 'Burger' },
    { type: 'pizza', name: 'Pizza' },
    { type: 'salad', name: 'Salad' },
    { type: 'sushi', name: 'Sushi' },
    { type: 'market', name: 'Local Market' },
    { type: 'pharmacy', name: 'Pharmacy' },
    { type: 'delivery', name: 'Book Delivery' }
  ];

  const navIcons = [
    { type: 'home', name: 'Home' },
    { type: 'orders', name: 'Orders' },
    { type: 'track', name: 'Track' },
    { type: 'chat', name: 'Chat' },
    { type: 'profile', name: 'Profile' }
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Go7 Icon System Showcase
        </h1>

        {/* Category Icons */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Category Icons (64x64px)</h2>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-6">
            {categoryIcons.map((icon) => (
              <div key={icon.type} className="flex flex-col items-center space-y-2">
                <Go7Icon 
                  type={icon.type}
                  size={64}
                  active={activeIcon === icon.type}
                  onClick={() => setActiveIcon(icon.type)}
                  alt={`${icon.name} category icon`}
                />
                <span className="text-xs font-medium text-gray-600 text-center">
                  {icon.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Icons */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Navigation Icons (24x24px)</h2>
          <div className="flex justify-center space-x-8">
            {navIcons.map((icon) => (
              <div key={icon.type} className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Go7Icon 
                    type={icon.type}
                    size={48}
                    active={activeIcon === icon.type}
                    onClick={() => setActiveIcon(icon.type)}
                    alt={`${icon.name} navigation icon`}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 text-center">
                  {icon.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Icon States Demo */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Icon States</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4">Inactive State</h3>
              <div className="flex space-x-4">
                <Go7Icon type="burger" size={64} active={false} alt="Inactive burger icon" />
                <Go7Icon type="home" size={48} active={false} alt="Inactive home icon" />
                <Go7Icon type="track" size={48} active={false} alt="Inactive track icon" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4">Active State</h3>
              <div className="flex space-x-4">
                <Go7Icon type="burger" size={64} active={true} alt="Active burger icon" />
                <Go7Icon type="home" size={48} active={true} alt="Active home icon" />
                <Go7Icon type="track" size={48} active={true} alt="Active track icon" />
              </div>
            </div>
          </div>
        </div>

        {/* Color Guide */}
        <div className="bg-white rounded-2xl p-6 mt-8 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Go7 Brand Colors</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-lg mx-auto mb-2" style={{backgroundColor: '#e60023'}}></div>
              <span className="text-sm font-medium text-gray-600">#e60023</span>
              <div className="text-xs text-gray-500">Primary Red</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-lg mx-auto mb-2"></div>
              <span className="text-sm font-medium text-gray-600">#ffffff</span>
              <div className="text-xs text-gray-500">White</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-400 rounded-lg mx-auto mb-2" style={{backgroundColor: '#b0b0b0'}}></div>
              <span className="text-sm font-medium text-gray-600">#b0b0b0</span>
              <div className="text-xs text-gray-500">Soft Gray</div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8 text-gray-500">
          <p>Click any icon to see the active state!</p>
        </div>
      </div>
    </div>
  );
};

export default IconShowcase;