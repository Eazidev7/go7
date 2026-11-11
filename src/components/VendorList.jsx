import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Star, Clock, MapPin, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';

const VendorList = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const vendorsRef = collection(db, 'vendors');
      const q = query(
        vendorsRef,
        where('isActive', '==', true),
        orderBy('rating', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const vendorData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setVendors(vendorData);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      // Fallback to mock data if Firestore fails
      setVendors(getMockVendors());
    } finally {
      setLoading(false);
    }
  };

  const getMockVendors = () => [
    {
      id: 'vendor-1',
      name: 'Burger Paradise',
      category: 'Fast Food',
      image: '/burger-hero.png',
      rating: 4.8,
      totalRatings: 245,
      deliveryTime: '15-25 min',
      priceRange: '₦₦',
      distance: '1.2 km',
      isOpen: true
    },
    {
      id: 'vendor-2',
      name: 'Fresh Greens Market',
      category: 'Groceries',
      image: '/grocery-placeholder.jpg',
      rating: 4.6,
      totalRatings: 189,
      deliveryTime: '30-40 min',
      priceRange: '₦',
      distance: '2.5 km',
      isOpen: true
    },
    {
      id: 'vendor-3',
      name: 'Pizza Planet',
      category: 'Italian',
      image: '/pizza-placeholder.jpg',
      rating: 4.9,
      totalRatings: 512,
      deliveryTime: '20-30 min',
      priceRange: '₦₦₦',
      distance: '0.8 km',
      isOpen: true
    },
    {
      id: 'vendor-4',
      name: 'Sushi Express',
      category: 'Japanese',
      image: '/sushi-placeholder.jpg',
      rating: 4.7,
      totalRatings: 324,
      deliveryTime: '25-35 min',
      priceRange: '₦₦₦',
      distance: '3.1 km',
      isOpen: false
    }
  ];

  const handleVendorClick = (vendor) => {
    setSelectedVendor(vendor);
    Swal.fire({
      title: vendor.name,
      html: `
        <div class="text-left space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-yellow-500 flex items-center">
              ⭐ ${vendor.rating} (${vendor.totalRatings} reviews)
            </span>
            <span class="text-gray-600">${vendor.deliveryTime}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">${vendor.priceRange} • ${vendor.category}</span>
            <span class="text-gray-600">${vendor.distance}</span>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            ${vendor.isOpen ? '🟢 Open now' : '🔴 Closed'}
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'View Menu',
      confirmButtonColor: '#E30613',
      cancelButtonText: 'Close'
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = `/vendor/${vendor.id}`;
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white py-6">
        <div className="px-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900">Popular Near You</h2>
        </div>
        <div className="px-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex gap-3 bg-gray-100 rounded-xl p-3">
                <div className="w-20 h-20 bg-gray-300 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-6">
      {/* Section Header */}
      <div className="px-4 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Popular Near You</h2>
          <p className="text-xs text-gray-500">Top rated restaurants</p>
        </div>
        <button className="text-sm text-red-600 font-semibold flex items-center">
          See All
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Vendor Cards */}
      <div className="px-4 space-y-3">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => handleVendorClick(vendor)}
            className="flex gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
          >
            {/* Vendor Image */}
            <div className="relative flex-shrink-0">
              <img
                src={vendor.image || '/placeholder-vendor.jpg'}
                alt={vendor.name}
                className="w-20 h-20 rounded-lg object-cover"
                onError={(e) => {
                  e.target.src = '/placeholder-vendor.jpg';
                }}
              />
              {!vendor.isOpen && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-white font-semibold">Closed</span>
                </div>
              )}
            </div>

            {/* Vendor Info */}
            <div className="flex-1 min-w-0">
              {/* Name */}
              <h3 className="font-semibold text-gray-900 truncate mb-1">
                {vendor.name}
              </h3>

              {/* Rating & Delivery Time */}
              <div className="flex items-center space-x-3 mb-1">
                <div className="flex items-center text-xs">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 mr-1" />
                  <span className="font-semibold text-gray-900">{vendor.rating}</span>
                  <span className="text-gray-500 ml-1">({vendor.totalRatings})</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {vendor.deliveryTime}
                </div>
              </div>

              {/* Category & Distance */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{vendor.priceRange} • {vendor.category}</span>
                <div className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-0.5" />
                  {vendor.distance}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View More Button */}
      <div className="px-4 mt-4">
        <button className="w-full py-3 bg-gray-100 text-gray-900 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
          View All Restaurants
        </button>
      </div>
    </div>
  );
};

export default VendorList;
