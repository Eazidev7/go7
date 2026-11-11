import React from 'react';
import { Coins, Star, Gift, TrendingUp } from 'lucide-react';
import { usePoints } from '../contexts/PointsContext';

const PointsDisplay = ({ variant = 'default', showDetails = false }) => {
  const { 
    pointsBalance, 
    totalPointsEarned, 
    totalPointsRedeemed, 
    transactionHistory, 
    isLoading 
  } = usePoints();

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  // Simple balance display for headers/navbars
  if (variant === 'simple') {
    return (
      <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
        <Coins className="w-4 h-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-900">
          {pointsBalance.toLocaleString()}
        </span>
      </div>
    );
  }

  // Compact display for mobile homepage
  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            <span className="font-medium">Go7 Points</span>
          </div>
          <span className="font-bold text-lg">{pointsBalance.toLocaleString()}</span>
        </div>
        {totalPointsEarned > 0 && (
          <p className="text-xs text-yellow-100 mt-1">
            Earned {totalPointsEarned.toLocaleString()} • Redeemed {totalPointsRedeemed.toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  // Full display for profile pages
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-500" />
          Go7 Points
        </h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {pointsBalance.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Available Points</p>
        </div>
      </div>

      {showDetails && (
        <>
          {/* Points Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Earned</span>
              </div>
              <p className="text-xl font-bold text-green-900">
                {totalPointsEarned.toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Redeemed</span>
              </div>
              <p className="text-xl font-bold text-blue-900">
                {totalPointsRedeemed.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Recent Transactions */}
          {transactionHistory.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transactionHistory.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
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
            </div>
          )}

          {/* Points Guide */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-2">How to Earn Points</h5>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Rate your delivery: 50-140 points</li>
              <li>• Complete orders: 25+ bonus points</li>
              <li>• Reach milestones: Up to 500 points</li>
              <li>• Special promotions: Bonus rewards</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default PointsDisplay;