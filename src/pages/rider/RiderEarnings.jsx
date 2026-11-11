import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRiderEarnings } from '../../services/riderService';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Calendar,
  ArrowLeft,
  Award,
  Target
} from 'lucide-react';

const RiderEarnings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState({
    today: 0,
    total: 0,
    completedDeliveries: 0
  });
  const [loading, setLoading] = useState(true);

  const riderId = currentUser?.uid;

  useEffect(() => {
    if (!riderId) {
      navigate('/rider/login');
      return;
    }
    loadEarnings();
  }, [riderId]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const earningsData = await getRiderEarnings(riderId);
      setEarnings(earningsData);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate averages and stats
  const averagePerDelivery = earnings.completedDeliveries > 0 
    ? (earnings.total / earnings.completedDeliveries).toFixed(2)
    : 0;

  const weeklyEstimate = earnings.today * 7; // Simple estimate
  const monthlyEstimate = earnings.today * 30; // Simple estimate

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading earnings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/rider/dashboard')}
            className="flex items-center space-x-2 mb-4 text-red-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold">My Earnings</h1>
          <p className="text-red-100 mt-1">Track your delivery income</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Main Earnings Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Total Earnings</p>
              <p className="text-5xl font-bold">₦{earnings.total.toLocaleString()}</p>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <DollarSign className="w-10 h-10" />
            </div>
          </div>
          <div className="flex items-center space-x-4 pt-4 border-t border-green-400/30">
            <div>
              <p className="text-green-100 text-xs mb-1">Today</p>
              <p className="text-xl font-bold">₦{earnings.today.toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-green-400/30"></div>
            <div>
              <p className="text-green-100 text-xs mb-1">Deliveries</p>
              <p className="text-xl font-bold">{earnings.completedDeliveries}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Average Per Delivery */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Average</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">₦{averagePerDelivery}</p>
            <p className="text-sm text-gray-600 mt-1">Per Delivery</p>
          </div>

          {/* Total Deliveries */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Package className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Completed</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{earnings.completedDeliveries}</p>
            <p className="text-sm text-gray-600 mt-1">Total Deliveries</p>
          </div>
        </div>

        {/* Estimates */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Earnings Estimates</h2>
          </div>

          <div className="space-y-4">
            {/* Weekly Estimate */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">Weekly Estimate</p>
                  <p className="text-xs text-gray-600">Based on today's performance</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-600">₦{weeklyEstimate.toLocaleString()}</p>
            </div>

            {/* Monthly Estimate */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">Monthly Estimate</p>
                  <p className="text-xs text-gray-600">Based on today's performance</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">₦{monthlyEstimate.toLocaleString()}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            * Estimates are based on your current daily average and may vary
          </p>
        </div>

        {/* Achievement Badge */}
        {earnings.completedDeliveries >= 10 && (
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-4 rounded-full">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-lg">Achievement Unlocked!</p>
                <p className="text-yellow-100 text-sm">You've completed {earnings.completedDeliveries} deliveries</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/rider/dashboard')}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <Package className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Back to Deliveries</p>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Print Statement</p>
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">Need Help?</p>
          <p className="text-sm text-blue-700">
            Contact support for payout requests or earnings inquiries at{' '}
            <a href="mailto:support@go7.com" className="underline font-medium">
              support@go7.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiderEarnings;
