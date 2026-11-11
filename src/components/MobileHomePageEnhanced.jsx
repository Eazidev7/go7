import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Plus, Star } from 'lucide-react';
import { auth } from '../config/firebase';
import MobileNavBar from '../components/MobileNavBar';
import tastyBurgers from '../assets/images/tasty-burgers.jpg';

const MobileHomePage = () => {
  const [userName, setUserName] = useState('Tobi');
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Tobi');
    }
  }, []);

  // Category data
  const categories = [
    { id: 1, name: 'Fast Food', icon: '🍔', color: 'bg-go7-red', route: '/menu' },
    { id: 2, name: 'Groceries', icon: '🛒', color: 'bg-green-500', route: '/market' },
    { id: 3, name: 'Errands', icon: '🛵', color: 'bg-pink-500', route: '/errands' },
    { id: 4, name: 'Pharmacy', icon: '💊', color: 'bg-purple-500', route: '/pharmacy' },
    { id: 5, name: 'Packages', icon: '📦', color: 'bg-orange-300', route: '/book-delivery' },
    { id: 6, name: 'Delivery', icon: '🚚', color: 'bg-gray-500', route: '/book-delivery' }
  ];

  // Quick actions data
  const quickActions = [
    { id: 1, title: 'Book Errand', icon: '🚴‍♂️', route: '/errands' },
    { id: 2, title: 'Track Delivery', icon: '📦', route: '/track' },
    { id: 3, title: 'Add Money', icon: '💳', route: '/wallet' },
    { id: 4, title: 'Rewards', icon: '🎁', route: '/rewards' }
  ];

  return (
    <div className="min-h-screen bg-white pb-24 font-inter">
      {/* Header Section */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold">Hi {userName},</h1>
            <p className="text-sm text-gray-500">ready to order?</p>
          </div>
          <div className="relative">
            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
              {/* Profile picture would go here */}
              <div className="w-full h-full flex items-center justify-center text-gray-500">👤</div>
            </div>
            <span className="absolute top-0 right-0 w-3 h-3 bg-go7-red rounded-full border-2 border-white"></span>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-3 flex items-center">
            <Search size={18} className="text-gray-500" />
          </div>
          <input 
            type="text" 
            placeholder="Deliver restaurants, groceries..." 
            className="w-full h-11 pl-10 pr-4 bg-gray-100 rounded-full text-sm"
          />
          <div className="absolute inset-y-0 right-3 flex items-center">
            <MapPin size={16} className="text-gray-500" />
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="mt-4 mb-6">
        <h2 className="px-5 text-lg font-bold mb-3">Categories</h2>
        <div className="flex px-4 overflow-x-auto scrollbar-hide pb-2">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-col items-center justify-center mx-2 text-gray-700">
              <div 
                className={`w-[70px] h-[70px] rounded-full ${category.color} flex items-center justify-center text-2xl shadow-md`}
                onClick={() => navigate(category.route)}
              >
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
        <div className="bg-go7-red text-white rounded-xl p-4 flex justify-between items-center mb-3 shadow-md">
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
          <Link to="/restaurants" className="text-go7-red font-medium text-sm">See All</Link>
        </div>
        
        <div className="relative rounded-xl overflow-hidden shadow-md mb-4">
          {/* Burger image */}
          <img 
            src={tastyBurgers} 
            alt="Tasty Bites burgers and fries" 
            className="w-full h-40 object-cover"
          />
          
          {/* Overlay badge - top left */}
          <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium">
            Tasty Bites
          </div>
          
          {/* Rating - bottom right */}
          <div className="absolute bottom-3 right-14 bg-white/90 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center">
            <Star size={12} className="text-yellow-500 mr-1" fill="#FBBF24" />
            4.7
          </div>
          
          {/* Add button - bottom right */}
          <button className="absolute bottom-3 right-3 bg-go7-red text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-bold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(action => (
            <Link 
              key={action.id} 
              to={action.route}
              className="rounded-lg shadow-sm bg-white border border-gray-100 p-3 flex items-center"
            >
              <div className="text-go7-red mr-3 text-xl">{action.icon}</div>
              <span className="font-bold text-sm text-gray-800">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <MobileNavBar />
    </div>
  );
};

export default MobileHomePage;