import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Coins, Star, TrendingUp, Award, Calendar } from 'lucide-react';
import PointsDisplay from '../components/PointsDisplay';
import { usePoints } from '../contexts/PointsContext';

const Go7PointsPage = () => {
  const navigate = useNavigate();
  const { 
    pointsBalance, 
    totalPointsEarned, 
    totalPointsRedeemed, 
    transactionHistory, 
    redeemPoints,
    isLoading 
  } = usePoints();
  
  const [activeTab, setActiveTab] = useState('overview');

  const redeemOptions = [
    {
      id: 'delivery-5',
      title: '₦500 Delivery Discount',
      points: 500,
      description: 'Get ₦500 off your next delivery',
      icon: '🚚',
      color: 'bg-blue-500'
    },
    {
      id: 'delivery-10',
      title: '₦1,000 Delivery Discount',
      points: 1000,
      description: 'Get ₦1,000 off your next delivery',
      icon: '🚚',
      color: 'bg-green-500'
    },
    {
      id: 'free-delivery',
      title: 'Free Delivery',
      points: 200,
      description: 'Enjoy free delivery on your next order',
      icon: '🆓',
      color: 'bg-purple-500'
    },
    {
      id: 'priority-delivery',
      title: 'Priority Delivery',
      points: 300,
      description: 'Get your order delivered first',
      icon: '⚡',
      color: 'bg-yellow-500'
    }
  ];

  const handleRedeem = async (option) => {
    if (pointsBalance >= option.points) {
      try {
        await redeemPoints(option.points, option.title);
        alert(`Successfully redeemed ${option.points} points for ${option.title}!`);
      } catch (error) {
        alert('Failed to redeem points. Please try again.');
      }
    } else {
      alert(`You need ${option.points - pointsBalance} more points to redeem this reward.`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E50914] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your Go7 Points...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#E50914] to-red-700 text-white">
        <div className="px-4 py-6">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/profile')}
              className="mr-3 p-2 rounded-full hover:bg-red-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Go7 Points</h1>
          </div>

          {/* Points Balance Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Your Balance</p>
                <p className="text-3xl font-bold">{pointsBalance.toLocaleString()}</p>
                <p className="text-red-100 text-sm">Go7 Points</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Coins className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4">
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-[#E50914]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('redeem')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'redeem'
                  ? 'bg-white text-[#E50914]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Redeem
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-[#E50914]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 rounded-full p-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Earned</p>
                    <p className="font-bold text-lg">{totalPointsEarned.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-full p-2">
                    <Gift className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Redeemed</p>
                    <p className="font-bold text-lg">{totalPointsRedeemed.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How to Earn Points */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                How to Earn Points
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="text-gray-700">Rate your delivery</span>
                  </div>
                  <span className="font-medium text-[#E50914]">50-140 pts</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-700">Complete orders</span>
                  </div>
                  <span className="font-medium text-[#E50914]">25+ pts</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-purple-500" />
                    <span className="text-gray-700">Reach milestones</span>
                  </div>
                  <span className="font-medium text-[#E50914]">Up to 500 pts</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Preview */}
            {transactionHistory.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {transactionHistory.slice(0, 3).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        {transaction.type === 'earned' ? (
                          <Star className="w-4 h-4 text-green-500" />
                        ) : (
                          <Gift className="w-4 h-4 text-blue-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${
                        transaction.type === 'earned' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {transaction.type === 'earned' ? '+' : '-'}{transaction.points}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('history')}
                  className="mt-3 text-sm text-[#E50914] font-medium"
                >
                  View All Activity →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Redeem Tab */}
        {activeTab === 'redeem' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Available Balance:</strong> {pointsBalance.toLocaleString()} points
              </p>
            </div>

            {redeemOptions.map((option) => (
              <div key={option.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`${option.color} rounded-full p-3 text-white text-xl`}>
                      {option.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{option.title}</h3>
                      <p className="text-sm text-gray-600">{option.description}</p>
                      <p className="text-sm font-medium text-[#E50914] mt-1">
                        {option.points.toLocaleString()} points required
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRedeem(option)}
                    disabled={pointsBalance < option.points}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      pointsBalance >= option.points
                        ? 'bg-[#E50914] text-white hover:bg-[#CC0812]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {pointsBalance >= option.points ? 'Redeem' : 'Not Enough Points'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {transactionHistory.length === 0 ? (
              <div className="bg-white rounded-lg p-8 shadow-sm text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No Transaction History</h3>
                <p className="text-gray-600">Complete your first order and rate it to start earning points!</p>
              </div>
            ) : (
              transactionHistory.map((transaction) => (
                <div key={transaction.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {transaction.type === 'earned' ? (
                        <div className="bg-green-100 rounded-full p-2">
                          <Star className="w-4 h-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="bg-blue-100 rounded-full p-2">
                          <Gift className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()} • 
                          {new Date(transaction.createdAt).toLocaleTimeString()}
                        </p>
                        {transaction.orderId && (
                          <p className="text-xs text-gray-400">Order: {transaction.orderId}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${
                        transaction.type === 'earned' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {transaction.type === 'earned' ? '+' : '-'}{transaction.points}
                      </span>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Go7PointsPage;