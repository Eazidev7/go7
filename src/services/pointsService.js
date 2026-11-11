import { 
  doc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Go7 Points configuration
export const POINTS_CONFIG = {
  ORDER_COMPLETION: 50,
  RATING_BONUS: 25,
  COMMENT_BONUS: 15,
  EXCELLENT_RATING_BONUS: 50, // 5 stars
  WEEKLY_STREAK_BONUS: 100,
  REFERRAL_BONUS: 500,
  MILESTONE_BONUSES: {
    100: 100,   // 100 points = 100 bonus
    500: 300,   // 500 points = 300 bonus
    1000: 500,  // 1000 points = 500 bonus
    2500: 1000, // 2500 points = 1000 bonus
    5000: 2000  // 5000 points = 2000 bonus
  }
};

// Points redemption values (points to naira)
export const REDEMPTION_RATES = {
  100: 50,   // 100 points = ₦50
  200: 120,  // 200 points = ₦120 (bonus value)
  500: 350,  // 500 points = ₦350 (bonus value)
  1000: 750, // 1000 points = ₦750 (bonus value)
  2000: 1600 // 2000 points = ₦1600 (bonus value)
};

/**
 * Add rating to an order and award points
 * @param {string} orderId - Order ID
 * @param {object} ratingData - Rating data {stars, comment, userId}
 * @returns {Promise<object>} Points awarded and updated balance
 */
export async function addOrderRating(orderId, ratingData) {
  try {
    const { stars, comment = '', userId } = ratingData;
    
    // Validate rating
    if (stars < 1 || stars > 5) {
      throw new Error('Rating must be between 1 and 5 stars');
    }

    // Update order with rating
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      rating: {
        stars: stars,
        comment: comment.trim(),
        timestamp: serverTimestamp(),
        userId: userId
      },
      updatedAt: serverTimestamp()
    });

    // Calculate points to award
    let pointsAwarded = POINTS_CONFIG.ORDER_COMPLETION;
    
    // Bonus for rating
    if (stars > 0) {
      pointsAwarded += POINTS_CONFIG.RATING_BONUS;
    }
    
    // Bonus for comment
    if (comment.trim().length > 0) {
      pointsAwarded += POINTS_CONFIG.COMMENT_BONUS;
    }
    
    // Bonus for excellent rating
    if (stars === 5) {
      pointsAwarded += POINTS_CONFIG.EXCELLENT_RATING_BONUS;
    }

    // Award points to user
    const newBalance = await awardPoints(userId, pointsAwarded, 'order_rating', {
      orderId: orderId,
      rating: stars,
      hasComment: comment.length > 0
    });

    console.log(`✅ Rating added and ${pointsAwarded} points awarded to user ${userId}`);
    
    return {
      pointsAwarded,
      newBalance,
      rating: {
        stars,
        comment,
        timestamp: new Date()
      }
    };

  } catch (error) {
    console.error('❌ Error adding order rating:', error);
    throw new Error('Failed to add rating');
  }
}

/**
 * Award points to a user
 * @param {string} userId - User ID
 * @param {number} points - Points to award
 * @param {string} reason - Reason for points
 * @param {object} metadata - Additional metadata
 * @returns {Promise<number>} New points balance
 */
export async function awardPoints(userId, points, reason, metadata = {}) {
  try {
    // Update user's points balance
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'points.balance': increment(points),
      'points.totalEarned': increment(points),
      'points.lastUpdated': serverTimestamp()
    });

    // Record points transaction
    await addDoc(collection(db, 'pointsTransactions'), {
      userId: userId,
      points: points,
      reason: reason,
      metadata: metadata,
      timestamp: serverTimestamp(),
      type: 'earned'
    });

    // Get updated balance
    const newBalance = await getUserPointsBalance(userId);
    
    // Check for milestone bonuses
    await checkMilestoneBonuses(userId, newBalance);

    console.log(`✅ Awarded ${points} points to user ${userId}. New balance: ${newBalance}`);
    return newBalance;

  } catch (error) {
    console.error('❌ Error awarding points:', error);
    throw new Error('Failed to award points');
  }
}

/**
 * Get user's current points balance
 * @param {string} userId - User ID
 * @returns {Promise<number>} Current points balance
 */
export async function getUserPointsBalance(userId) {
  try {
    const userDoc = await getDocs(query(
      collection(db, 'users'),
      where('uid', '==', userId)
    ));
    
    if (userDoc.empty) {
      return 0;
    }
    
    const userData = userDoc.docs[0].data();
    return userData.points?.balance || 0;

  } catch (error) {
    console.error('❌ Error getting points balance:', error);
    return 0;
  }
}

/**
 * Get user's points transaction history
 * @param {string} userId - User ID
 * @param {number} limit - Number of transactions to fetch
 * @returns {Promise<Array>} Array of transactions
 */
export async function getPointsHistory(userId, limit = 20) {
  try {
    const transactionsQuery = query(
      collection(db, 'pointsTransactions'),
      where('userId', '==', userId),
      // orderBy('timestamp', 'desc'),
      // limit(limit)
    );
    
    const snapshot = await getDocs(transactionsQuery);
    const transactions = [];
    
    snapshot.forEach(doc => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return transactions.sort((a, b) => {
      const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
      const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
      return bTime - aTime;
    });

  } catch (error) {
    console.error('❌ Error getting points history:', error);
    return [];
  }
}

/**
 * Check and award milestone bonuses
 * @param {string} userId - User ID
 * @param {number} currentBalance - Current points balance
 */
async function checkMilestoneBonuses(userId, currentBalance) {
  try {
    // Check if user has reached any milestone
    const milestones = Object.keys(POINTS_CONFIG.MILESTONE_BONUSES)
      .map(Number)
      .sort((a, b) => b - a); // Sort descending
    
    for (const milestone of milestones) {
      if (currentBalance >= milestone) {
        // Check if bonus already awarded
        const existingBonus = await getDocs(query(
          collection(db, 'pointsTransactions'),
          where('userId', '==', userId),
          where('reason', '==', 'milestone_bonus'),
          where('metadata.milestone', '==', milestone)
        ));
        
        if (existingBonus.empty) {
          // Award milestone bonus
          const bonusPoints = POINTS_CONFIG.MILESTONE_BONUSES[milestone];
          await awardPoints(userId, bonusPoints, 'milestone_bonus', {
            milestone: milestone,
            currentBalance: currentBalance
          });
          break; // Only award one milestone bonus at a time
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking milestone bonuses:', error);
  }
}

/**
 * Redeem points for cash value
 * @param {string} userId - User ID
 * @param {number} pointsToRedeem - Points to redeem
 * @returns {Promise<object>} Redemption result
 */
export async function redeemPoints(userId, pointsToRedeem) {
  try {
    const currentBalance = await getUserPointsBalance(userId);
    
    if (currentBalance < pointsToRedeem) {
      throw new Error('Insufficient points balance');
    }
    
    if (!REDEMPTION_RATES[pointsToRedeem]) {
      throw new Error('Invalid redemption amount');
    }
    
    const cashValue = REDEMPTION_RATES[pointsToRedeem];
    
    // Deduct points
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'points.balance': increment(-pointsToRedeem),
      'points.totalRedeemed': increment(pointsToRedeem),
      'points.lastUpdated': serverTimestamp()
    });
    
    // Record redemption transaction
    await addDoc(collection(db, 'pointsTransactions'), {
      userId: userId,
      points: -pointsToRedeem,
      reason: 'redemption',
      metadata: {
        cashValue: cashValue,
        redemptionRate: `${pointsToRedeem} points = ₦${cashValue}`
      },
      timestamp: serverTimestamp(),
      type: 'redeemed'
    });
    
    // Add to user's wallet (you would integrate with your wallet system)
    await addDoc(collection(db, 'walletTransactions'), {
      userId: userId,
      amount: cashValue,
      type: 'points_redemption',
      description: `Points redemption: ${pointsToRedeem} points`,
      timestamp: serverTimestamp(),
      status: 'completed'
    });
    
    const newBalance = currentBalance - pointsToRedeem;
    
    console.log(`✅ Redeemed ${pointsToRedeem} points for ₦${cashValue}. New balance: ${newBalance}`);
    
    return {
      pointsRedeemed: pointsToRedeem,
      cashValue: cashValue,
      newBalance: newBalance
    };

  } catch (error) {
    console.error('❌ Error redeeming points:', error);
    throw new Error('Failed to redeem points');
  }
}

/**
 * Get available redemption options for user
 * @param {number} currentBalance - User's current points balance
 * @returns {Array} Available redemption options
 */
export function getAvailableRedemptions(currentBalance) {
  return Object.entries(REDEMPTION_RATES)
    .map(([points, cash]) => ({
      points: Number(points),
      cash: cash,
      available: currentBalance >= Number(points)
    }))
    .sort((a, b) => a.points - b.points);
}

/**
 * Calculate points for an order (before rating)
 * @param {object} orderData - Order data
 * @returns {number} Base points for order
 */
export function calculateOrderPoints(orderData) {
  let points = POINTS_CONFIG.ORDER_COMPLETION;
  
  // Add bonus based on order value
  const orderValue = orderData.total || 0;
  if (orderValue >= 5000) points += 25; // Bonus for large orders
  if (orderValue >= 10000) points += 50; // Extra bonus for very large orders
  
  return points;
}

export default {
  POINTS_CONFIG,
  REDEMPTION_RATES,
  addOrderRating,
  awardPoints,
  getUserPointsBalance,
  getPointsHistory,
  redeemPoints,
  getAvailableRedemptions,
  calculateOrderPoints
};