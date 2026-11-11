import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MobileNavBar from '../components/MobileNavBar';
import { useAuth } from '../contexts/AuthContext.tsx';

// MobileHomePageEnhanced - A comprehensive mobile homepage for Go7 delivery app
// This version includes all requested sections and proper service worker integration
const MobileHomePageEnhanced = () => {
  const { currentUser } = useAuth();
  const [userName, setUserName] = useState('Guest');
  
  // Get user name from auth context
  useEffect(() => {
    if (currentUser && currentUser.displayName) {
      const firstName = currentUser.displayName.split(' ')[0];
      setUserName(firstName);
    }
  }, [currentUser]);
  
  // Categories data
  const categories = [
    { id: 1, name: 'Fast Food', icon: '🍔', color: 'bg-red-600' },
    { id: 2, name: 'Groceries', icon: '🛒', color: 'bg-green-500' },
    { id: 3, name: 'Errands', icon: '🛵', color: 'bg-pink-500' },
    { id: 4, name: 'Pharmacy', icon: '💊', color: 'bg-purple-500' },
    { id: 5, name: 'Packages', icon: '📦', color: 'bg-orange-300' },
    { id: 6, name: 'Delivery', icon: '🚚', color: 'bg-gray-500' },
  ];

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Header Section */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold">Hi {userName},</h1>
            <p className="text-sm text-gray-500">ready to order?</p>
          </div>
          <div className="relative">
            {currentUser && currentUser.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(currentUser.displayName || 'User');
                }}
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-gray-500">
                👤
              </div>
            )}
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-600 rounded-full border-2 border-white"></span>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="Deliver restaurants, groceries..." 
            className="w-full h-11 pl-10 pr-4 bg-gray-100 rounded-full text-sm"
          />
          <div className="absolute inset-y-0 right-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="mt-4 mb-6">
        <h2 className="px-5 text-lg font-bold mb-3">Categories</h2>
        <div className="flex px-4 overflow-x-auto scrollbar-hide pb-2">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-col items-center justify-center mx-2 text-gray-700">
              <div className={`w-[70px] h-[70px] ${category.color} rounded-full flex items-center justify-center text-2xl text-white shadow-md`}>
                {category.icon}
              </div>
              <span className="text-xs font-medium mt-1">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Promo Banners */}
      <div className="px-5 mb-6">
        {/* Red Promo */}
        <div className="bg-red-600 text-white rounded-xl p-4 flex justify-between items-center mb-3 shadow-md">
          <div className="flex-1">
            <p className="font-medium">₦200 off your first delivery!</p>
          </div>
          <button className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium">
            Order Now
          </button>
        </div>
        
        {/* Purple Promo */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-4 shadow-md">
          <p className="font-medium">Refer & Earn ₦500 – Invite friends to Go7 and earn rewards!</p>
        </div>
      </div>

      {/* Recommended Section */}
      <div className="px-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">Recommended for You</h2>
          <Link to="/vendors" className="text-red-600 font-medium text-sm">See All</Link>
        </div>
        
        <div className="relative rounded-xl overflow-hidden shadow-md mb-4">
          {/* Burger image */}
          <img 
            src="/tasty-burgers.jpg" 
            alt="Tasty Bites burgers and fries" 
            className="w-full h-40 object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80";
            }}
          />
          
          {/* Overlay badge - top left */}
          <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium">
            Tasty Bites
          </div>
          
          {/* Rating - bottom right */}
          <div className="absolute bottom-3 right-14 bg-white/90 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            4.7
          </div>
          
          {/* Add button - bottom right */}
          <button className="absolute bottom-3 right-3 bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-bold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/errand" className="rounded-lg shadow-sm bg-white border border-gray-100 p-3 flex items-center">
            <div className="text-red-600 mr-3 text-xl">🚴‍♂️</div>
            <span className="font-bold text-sm text-gray-800">Book Errand</span>
          </Link>
          <Link to="/track" className="rounded-lg shadow-sm bg-white border border-gray-100 p-3 flex items-center">
            <div className="text-red-600 mr-3 text-xl">📦</div>
            <span className="font-bold text-sm text-gray-800">Track Delivery</span>
          </Link>
          <Link to="/wallet" className="rounded-lg shadow-sm bg-white border border-gray-100 p-3 flex items-center">
            <div className="text-red-600 mr-3 text-xl">💳</div>
            <span className="font-bold text-sm text-gray-800">Add Money</span>
          </Link>
          <Link to="/rewards" className="rounded-lg shadow-sm bg-white border border-gray-100 p-3 flex items-center">
            <div className="text-red-600 mr-3 text-xl">🎁</div>
            <span className="font-bold text-sm text-gray-800">Rewards</span>
          </Link>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <MobileNavBar />
    </div>
  );
};

export default MobileHomePageEnhanced;