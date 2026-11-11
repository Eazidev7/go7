import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  getUserPointsBalance, 
  getPointsHistory, 
  redeemPoints,
  getAvailableRedemptions 
} from '../services/pointsService';

const PointsContext = createContext();

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
};

export const PointsProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user points data when user changes
  useEffect(() => {
    if (user?.uid) {
      loadPointsData();
    } else {
      // Reset when user logs out
      setPointsBalance(0);
      setPointsHistory([]);
    }
  }, [user]);

  const loadPointsData = async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Load balance and history in parallel
      const [balance, history] = await Promise.all([
        getUserPointsBalance(user.uid),
        getPointsHistory(user.uid, 50)
      ]);
      
      setPointsBalance(balance);
      setPointsHistory(history);
      
    } catch (err) {
      console.error('Error loading points data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!user?.uid) return;
    
    try {
      const balance = await getUserPointsBalance(user.uid);
      setPointsBalance(balance);
      return balance;
    } catch (err) {
      console.error('Error refreshing balance:', err);
      throw err;
    }
  };

  const refreshHistory = async () => {
    if (!user?.uid) return;
    
    try {
      const history = await getPointsHistory(user.uid, 50);
      setPointsHistory(history);
      return history;
    } catch (err) {
      console.error('Error refreshing history:', err);
      throw err;
    }
  };

  const handlePointsEarned = async (points) => {
    // Update local balance immediately for better UX
    setPointsBalance(prev => prev + points);
    
    // Refresh data from server
    setTimeout(() => {
      loadPointsData();
    }, 1000);
  };

  const handleRedemption = async (pointsToRedeem) => {
    try {
      const result = await redeemPoints(user.uid, pointsToRedeem);
      
      // Update local state
      setPointsBalance(result.newBalance);
      
      // Refresh history to show redemption transaction
      await refreshHistory();
      
      return result;
      
    } catch (err) {
      console.error('Error redeeming points:', err);
      throw err;
    }
  };

  const getRedemptionOptions = () => {
    return getAvailableRedemptions(pointsBalance);
  };

  const formatPoints = (points) => {
    return points.toLocaleString();
  };

  const getPointsValue = (points) => {
    // Rough conversion: 100 points ≈ ₦50
    return Math.floor(points * 0.5);
  };

  const getTotalEarned = () => {
    return pointsHistory
      .filter(transaction => transaction.type === 'earned')
      .reduce((total, transaction) => total + transaction.points, 0);
  };

  const getTotalRedeemed = () => {
    return pointsHistory
      .filter(transaction => transaction.type === 'redeemed')
      .reduce((total, transaction) => total + Math.abs(transaction.points), 0);
  };

  const getRecentEarnings = (days = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return pointsHistory
      .filter(transaction => {
        const transactionDate = transaction.timestamp?.toDate?.() || new Date(transaction.timestamp);
        return transactionDate >= cutoffDate && transaction.type === 'earned';
      })
      .reduce((total, transaction) => total + transaction.points, 0);
  };

  const getPointsBreakdown = () => {
    const breakdown = {
      orderCompletion: 0,
      ratings: 0,
      bonuses: 0,
      milestones: 0,
      other: 0
    };

    pointsHistory
      .filter(transaction => transaction.type === 'earned')
      .forEach(transaction => {
        switch (transaction.reason) {
          case 'order_rating':
            breakdown.orderCompletion += transaction.points;
            break;
          case 'rating_bonus':
            breakdown.ratings += transaction.points;
            break;
          case 'milestone_bonus':
            breakdown.milestones += transaction.points;
            break;
          case 'referral_bonus':
          case 'streak_bonus':
            breakdown.bonuses += transaction.points;
            break;
          default:
            breakdown.other += transaction.points;
        }
      });

    return breakdown;
  };

  const value = {
    // State
    pointsBalance,
    pointsHistory,
    isLoading,
    error,
    
    // Actions
    loadPointsData,
    refreshBalance,
    refreshHistory,
    handlePointsEarned,
    handleRedemption,
    
    // Utilities
    getRedemptionOptions,
    formatPoints,
    getPointsValue,
    getTotalEarned,
    getTotalRedeemed,
    getRecentEarnings,
    getPointsBreakdown,
    
    // Computed values
    hasPoints: pointsBalance > 0,
    canRedeem: pointsBalance >= 100, // Minimum redemption
    estimatedValue: getPointsValue(pointsBalance)
  };

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
};

export default PointsContext;