import React from 'react';
import { Helmet } from 'react-helmet-async';
import NeighborhoodMap from '../components/NeighborhoodMap';
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const ExploreAbeokuta = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Helmet>
        <title>Explore Abeokuta | Go7 Delivery</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Explore Abeokuta
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover restaurants and services throughout Abeokuta. 
              Click on any neighborhood to see vendors available for delivery in that area.
            </p>
          </div>
          
          {/* Filters and Category Selection */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              <button className="px-4 py-2 bg-red-600 text-white font-medium rounded-full flex items-center">
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Restaurants
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 font-medium rounded-full shadow-sm flex items-center hover:bg-gray-50">
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Pharmacies
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 font-medium rounded-full shadow-sm flex items-center hover:bg-gray-50">
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Groceries
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 font-medium rounded-full shadow-sm flex items-center hover:bg-gray-50">
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Errands
              </button>
            </div>
          </div>
          
          {/* Map & Vendors */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="map-header flex items-center mb-4">
              <MapPinIcon className="h-6 w-6 text-red-600 mr-2" />
              <h2 className="text-xl font-semibold">Abeokuta Neighborhood Map</h2>
            </div>
            
            <NeighborhoodMap businessType="restaurant" />
          </div>
          
          {/* Call to Action */}
          <div className="mt-10 bg-gray-100 rounded-xl p-6 text-center">
            <h3 className="text-xl font-semibold mb-3">Don't see your neighborhood?</h3>
            <p className="text-gray-600 mb-4">
              We're continuously expanding our delivery zones throughout Abeokuta.
              Let us know where you'd like us to deliver next!
            </p>
            <button className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
              Request Your Neighborhood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExploreAbeokuta;