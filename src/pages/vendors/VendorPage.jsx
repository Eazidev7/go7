import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Clock, Phone } from 'lucide-react';
import { vendors } from '../../data/vendors';
import MobileNavBar from '../../components/MobileNavBar';

export default function VendorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Combine all vendors and find the one with matching id
  const allVendors = [...vendors.markets, ...vendors.restaurants, ...vendors.pharmacies];
  const vendor = allVendors.find(v => v.id === parseInt(id));

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Vendor not found</h3>
          <p className="text-gray-600 mb-4">The vendor you're looking for doesn't exist.</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center p-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="ml-2 text-lg font-semibold text-gray-900">{vendor.businessName || vendor.name}</h1>
        </div>
      </div>

      {/* Vendor Banner Image */}
      <div className="relative">
        <img 
          src={vendor.img} 
          alt={vendor.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      </div>

      {/* Vendor Information */}
      <div className="bg-white -mt-6 relative rounded-t-3xl min-h-[calc(100vh-12rem)]">
        <div className="p-6">
          {/* Vendor Header Info */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{vendor.businessName || vendor.name}</h2>
            <p className="text-gray-600 mb-3">{vendor.category}</p>
            
            {/* Rating and Location */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-500 fill-current" />
                <span className="text-sm font-semibold text-gray-900">{vendor.rating}</span>
                <span className="text-xs text-gray-500">(150+ reviews)</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">20-30 mins</span>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 mb-6">
              <MapPin size={16} className="text-red-500" />
              <span className="text-sm text-gray-600">{vendor.location}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-colors active:scale-95">
                Order from {vendor.name.split(' ')[0]}
              </button>
              <button className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Phone size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Menu/Services Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Items</h3>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="w-full h-20 bg-gray-200 rounded-lg mb-3"></div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Popular Item {item}</h4>
                  <p className="text-xs text-gray-600 mb-2">Description here</p>
                  <span className="text-sm font-bold text-red-600">₦2,500</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-green-800 mb-1">Free Delivery</h4>
              <p className="text-xs text-green-600">On orders above ₦5,000</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-blue-800 mb-1">Fast Service</h4>
              <p className="text-xs text-blue-600">Average 25 minutes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileNavBar />
    </div>
  );
}