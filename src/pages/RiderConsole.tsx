/**
 * RiderConsole.tsx - A TypeScript React component for rider management
 * Simple implementation of the rider console with TypeScript
 */

import React, { useState, useEffect } from 'react';

interface Rider {
  id: string;
  name: string;
  status: 'offline' | 'online' | 'on-trip';
  phone: string;
  location?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  vehicle: string;
  stats: {
    todayTrips: number;
    todayEarnings: number;
  }
}

interface Order {
  id: string;
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  dropoff: {
    address: string;
    lat: number;
    lng: number;
  };
  status: string;
  customer: {
    name: string;
    phone: string;
  };
  total: number;
  createdAt: string;
}

const RiderConsole: React.FC = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('all');

  // Simulated data loading
  useEffect(() => {
    const loadData = () => {
      // This would be replaced with actual API calls in production
      const mockRiders: Rider[] = [
        {
          id: 'rider_001',
          name: 'Samuel Johnson',
          status: 'online',
          phone: '+2348012345678',
          location: {
            lat: 6.4281,
            lng: 3.4219,
            timestamp: new Date().toISOString()
          },
          vehicle: 'motorcycle',
          stats: {
            todayTrips: 12,
            todayEarnings: 15000
          }
        },
        {
          id: 'rider_002',
          name: 'David Williams',
          status: 'on-trip',
          phone: '+2348023456789',
          location: {
            lat: 6.4300,
            lng: 3.4250,
            timestamp: new Date().toISOString()
          },
          vehicle: 'motorcycle',
          stats: {
            todayTrips: 8,
            todayEarnings: 9500
          }
        },
        {
          id: 'rider_003',
          name: 'Mary Johnson',
          status: 'offline',
          phone: '+2348034567890',
          location: {
            lat: 6.4320,
            lng: 3.4180,
            timestamp: new Date().toISOString()
          },
          vehicle: 'bicycle',
          stats: {
            todayTrips: 5,
            todayEarnings: 6000
          }
        }
      ];

      const mockOrders: Order[] = [
        {
          id: 'order_001',
          pickup: {
            address: '123 Victoria Island, Lagos',
            lat: 6.4281,
            lng: 3.4219
          },
          dropoff: {
            address: '456 Ikoyi, Lagos',
            lat: 6.4474,
            lng: 3.4653
          },
          status: 'in_progress',
          customer: {
            name: 'John Doe',
            phone: '+2348012345678'
          },
          total: 5000,
          createdAt: new Date().toISOString()
        },
        {
          id: 'order_002',
          pickup: {
            address: '789 Lekki, Lagos',
            lat: 6.4698,
            lng: 3.5852
          },
          dropoff: {
            address: '101 Ajah, Lagos',
            lat: 6.4698,
            lng: 3.5852
          },
          status: 'pending',
          customer: {
            name: 'Jane Smith',
            phone: '+2348023456789'
          },
          total: 7500,
          createdAt: new Date().toISOString()
        }
      ];

      setRiders(mockRiders);
      setOrders(mockOrders);
      setLoading(false);
    };

    // Simulate API delay
    setTimeout(loadData, 800);
  }, []);

  const filteredRiders = riders.filter(rider => {
    if (filter === 'all') return true;
    return rider.status === filter;
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rider Management Console</h1>
          <p className="mt-2 text-lg text-gray-600">Monitor and manage all rider operations</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Active Riders</h3>
            <p className="text-3xl font-bold text-green-600">
              {riders.filter(r => r.status === 'online' || r.status === 'on-trip').length}
              <span className="text-sm font-normal text-gray-500 ml-2">/ {riders.length}</span>
            </p>
            <p className="mt-2 text-sm text-gray-500">Currently online or on trip</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Pending Orders</h3>
            <p className="text-3xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'pending').length}
            </p>
            <p className="mt-2 text-sm text-gray-500">Awaiting assignment</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total Earnings Today</h3>
            <p className="text-3xl font-bold text-purple-600">
              {formatCurrency(riders.reduce((sum, rider) => sum + rider.stats.todayEarnings, 0))}
            </p>
            <p className="mt-2 text-sm text-gray-500">From {riders.reduce((sum, rider) => sum + rider.stats.todayTrips, 0)} trips</p>
          </div>
        </div>

        {/* Rider List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Riders List</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setFilter('all')} 
                  className={`px-4 py-2 text-sm rounded-md ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter('online')} 
                  className={`px-4 py-2 text-sm rounded-md ${filter === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                >
                  Online
                </button>
                <button 
                  onClick={() => setFilter('on-trip')} 
                  className={`px-4 py-2 text-sm rounded-md ${filter === 'on-trip' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                >
                  On Trip
                </button>
                <button 
                  onClick={() => setFilter('offline')} 
                  className={`px-4 py-2 text-sm rounded-md ${filter === 'offline' ? 'bg-gray-100 text-gray-800 font-medium' : 'bg-gray-100 text-gray-800'}`}
                >
                  Offline
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rider</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today's Trips</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today's Earnings</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Location</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRiders.map((rider) => (
                  <tr key={rider.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{rider.name}</div>
                          <div className="text-sm text-gray-500">{rider.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${rider.status === 'online' ? 'bg-green-100 text-green-800' : 
                          rider.status === 'on-trip' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {rider.status === 'online' ? '🟢 Online' : 
                         rider.status === 'on-trip' ? '🚚 On Trip' : 
                         '⚪ Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rider.vehicle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rider.stats.todayTrips}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(rider.stats.todayEarnings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rider.location ? 
                        <>
                          <div className="text-xs font-mono">{rider.location.lat.toFixed(4)}, {rider.location.lng.toFixed(4)}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(rider.location.timestamp).toLocaleTimeString()}
                          </div>
                        </> : 
                        'Unknown'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integration Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-lg font-medium text-blue-800">
            This is a simple rider console prototype
          </p>
          <p className="text-sm text-blue-600 mt-2">
            In production, this would integrate with Firebase Authentication, Firestore, and real-time location updates
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiderConsole;