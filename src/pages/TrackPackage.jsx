import React, { useState } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

const TrackPackage = () => {
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);

  const handleTrack = () => {
    if (trackingId.trim()) {
      // Mock tracking result
      setTrackingResult({
        id: trackingId,
        status: 'In Transit',
        location: 'Abeokuta Distribution Center',
        estimatedDelivery: 'Today, 6:00 PM',
        updates: [
          { time: '2:30 PM', status: 'Package picked up from sender', location: 'Oke-Ilewo' },
          { time: '3:15 PM', status: 'In transit to distribution center', location: 'En route' },
          { time: '4:00 PM', status: 'Arrived at distribution center', location: 'Abeokuta DC' },
          { time: '4:30 PM', status: 'Out for delivery', location: 'Abeokuta DC' }
        ]
      });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-500 to-red-600" style={{
      background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
    }}>
      {/* Header Section */}
      <header className="text-center text-white px-5 py-10">
        {/* Back Button */}
        <div className="flex items-center justify-start mb-8">
          <Link 
            to="/" 
            className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
          >
            <ChevronLeftIcon className="h-6 w-6 text-white" />
          </Link>
        </div>

        {/* Header Content */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold leading-tight">
            Track your delivery in real-time 🚴
          </h1>
          <p className="text-white/90 text-base leading-relaxed">
            Enter your tracking ID to get live updates
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="bg-gray-50 min-h-screen rounded-t-3xl pt-6 px-5">
        
        {/* Tracking Input Card */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter tracking ID"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base"
            />
            <button
              onClick={handleTrack}
              className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-red-700 transition-colors text-base shadow-lg"
              style={{ background: '#dc2626' }}
            >
              Track Now
            </button>
          </div>
        </section>

        {/* Illustration Section */}
        <section className="text-center mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="mb-4">
              {/* Map Background with Scooter Overlay */}
              <div className="relative w-40 h-40 mx-auto mb-4 flex items-center justify-center">
                {/* Map Background */}
                <img 
                  src="/assets/map-background.png" 
                  alt="Location map" 
                  className="absolute inset-0 w-full h-full object-contain opacity-80"
                />
                {/* Delivery Scooter on top */}
                <img 
                  src="/assets/go7-bike.png" 
                  alt="Go7 delivery scooter" 
                  className="relative z-10 w-3/4 h-3/4 object-contain"
                />
              </div>
            </div>
            <p className="text-gray-600 text-base font-medium">
              Fast & reliable delivery tracking
            </p>
          </div>
        </section>

        {/* Tracking Results */}
        {trackingResult && (
          <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="border-b border-gray-100 pb-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Package Details</h3>
              <p className="text-sm text-gray-500">Tracking ID: {trackingResult.id}</p>
            </div>

            {/* Status Card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-800 font-semibold">{trackingResult.status}</p>
                  <p className="text-green-600 text-sm">{trackingResult.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Estimated Delivery</p>
                  <p className="font-semibold text-gray-800">{trackingResult.estimatedDelivery}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Tracking History</h4>
              <div className="space-y-4">
                {trackingResult.updates.map((update, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-red-600' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">{update.status}</p>
                        <p className="text-xs text-gray-500">{update.time}</p>
                      </div>
                      <p className="text-xs text-gray-600">{update.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Help Section */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Need Help?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Can't find your tracking ID or having issues? We're here to help.
            </p>
            <button 
              className="bg-blue-600 text-white py-3 px-8 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg"
              style={{ background: '#2563EB' }}
            >
              Contact Support
            </button>
          </div>
        </section>

      </div>
    </main>
  );
};

export default TrackPackage;