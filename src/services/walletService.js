import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp,
  runTransaction 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Get rider earnings summary and details
 * @param {string} riderId - Rider ID
 * @returns {Promise<Object>} Rider earnings data
 */
export async function getRiderEarnings(riderId) {
  try {
    const earningsRef = doc(db, 'rider_earnings', riderId);
    const earningsDoc = await getDoc(earningsRef);
    
    if (!earningsDoc.exists()) {
      // No wallet doc yet — fall back to aggregating from delivered orders so
      // existing earnings are not shown as zero.
      const getPayout = (order) =>
        Number(order.riderPayout ?? order.riderEarnings ?? order.feeBreakdown?.riderPayout ?? 0);
      const isDelivered = (order) =>
        order.status === 'delivered' || order.orderStatus === 'delivered';

      let totalEarned = 0;
      let deliveryCount = 0;
      let lastDeliveryCompleted = null;
      let lastMs = 0;

      for (const colName of ['orders', 'fuelOrders']) {
        try {
          const q = query(collection(db, colName), where('riderId', '==', riderId), limit(500));
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const order = docSnap.data();
            if (!isDelivered(order)) return;
            totalEarned += getPayout(order);
            deliveryCount += 1;
            const ms =
              order.deliveredAt?.toMillis?.() ??
              (typeof order.deliveredAt === 'number' ? order.deliveredAt : 0);
            if (ms > lastMs) {
              lastMs = ms;
              lastDeliveryCompleted = ms ? new Date(ms) : null;
            }
          });
        } catch (err) {
          console.warn(`getRiderEarnings: ${colName} fallback query failed`, err?.message);
        }
      }

      return {
        riderId,
        totalEarned,
        availableBalance: totalEarned,
        totalWithdrawn: 0,
        pendingWithdrawals: 0,
        deliveryCount,
        lastDeliveryCompleted,
        completedDeliveriesArray: [],
        createdAt: new Date(),
        lastUpdated: new Date()
      };
    }

    const data = earningsDoc.data();
    return {
      riderId,
      totalEarned: data.totalEarned || 0,
      availableBalance: data.availableBalance || data.totalEarned || 0,
      totalWithdrawn: data.totalWithdrawn || 0,
      pendingWithdrawals: data.pendingWithdrawals || 0,
      deliveryCount: data.deliveryCount || 0,
      completedDeliveries: data.completedDeliveries || 0,
      lastDeliveryCompleted: data.lastDeliveryCompleted?.toDate(),
      completedDeliveriesArray: data.completedDeliveriesArray || [],
      averageEarningsPerDelivery: data.deliveryCount > 0 ? (data.totalEarned / data.deliveryCount) : 0,
      createdAt: data.createdAt?.toDate(),
      lastUpdated: data.lastUpdated?.toDate() || data.updatedAt?.toDate()
    };

  } catch (error) {
    console.error('❌ Error fetching rider earnings:', error);
    throw error;
  }
}

/**
 * Get rider withdrawal history
 * @param {string} riderId - Rider ID
 * @param {number} limitCount - Number of withdrawals to fetch
 * @returns {Promise<Array>} Array of withdrawal records
 */
export async function getRiderWithdrawals(riderId, limitCount = 10) {
  try {
    const withdrawalsQuery = query(
      collection(db, 'withdrawals'),
      where('riderId', '==', riderId)
    );

    const snapshot = await getDocs(withdrawalsQuery);
    const withdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate(),
      processedAt: doc.data().processedAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate()
    }));

    return withdrawals
      .sort((a, b) => (b.requestedAt?.getTime?.() || 0) - (a.requestedAt?.getTime?.() || 0))
      .slice(0, limitCount);

  } catch (error) {
    console.error('❌ Error fetching rider withdrawals:', error);
    throw error;
  }
}

/**
 * Request withdrawal for rider
 * @param {string} riderId - Rider ID
 * @param {number} amount - Withdrawal amount
 * @param {string} paymentMethod - Payment method (bank, mobile_money, etc.)
 * @param {Object} paymentDetails - Payment details (account number, etc.)
 * @returns {Promise<string>} Withdrawal request ID
 */
export async function requestWithdrawal(riderId, amount, paymentMethod, paymentDetails) {
  try {
    if (!riderId || !amount || amount <= 0) {
      throw new Error('Invalid withdrawal request parameters');
    }

    const result = await runTransaction(db, async (transaction) => {
      // Get current earnings
      const earningsRef = doc(db, 'rider_earnings', riderId);
      const earningsDoc = await transaction.get(earningsRef);
      
      if (!earningsDoc.exists()) {
        throw new Error('Rider earnings record not found');
      }

      const earningsData = earningsDoc.data();
      const availableBalance = earningsData.availableBalance || earningsData.totalEarned || 0;
      
      // Check sufficient balance
      if (amount > availableBalance) {
        throw new Error(`Insufficient balance. Available: ₦${availableBalance.toLocaleString()}`);
      }

      // Create withdrawal request
      const withdrawalRef = doc(collection(db, 'withdrawals'));
      transaction.set(withdrawalRef, {
        riderId,
        amount,
        paymentMethod,
        paymentDetails,
        status: 'pending',
        requestedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Update rider earnings (reduce available balance, increase pending)
      transaction.update(earningsRef, {
        availableBalance: availableBalance - amount,
        pendingWithdrawals: (earningsData.pendingWithdrawals || 0) + amount,
        lastWithdrawalRequest: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return withdrawalRef.id;
    });

    console.log('✅ Withdrawal request created:', result);
    return result;

  } catch (error) {
    console.error('❌ Error requesting withdrawal:', error);
    throw error;
  }
}

/**
 * Get vendor payout summary and details
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} Vendor payout data
 */
export async function getVendorPayouts(vendorId) {
  try {
    const payoutsRef = doc(db, 'vendor_payouts', vendorId);
    const payoutsDoc = await getDoc(payoutsRef);
    
    if (!payoutsDoc.exists()) {
      // Return default structure if no payouts document exists
      return {
        vendorId,
        totalDeliverySpend: 0,
        totalDeliveries: 0,
        averageCostPerDelivery: 0,
        pendingPayments: 0,
        completedPayments: 0,
        lastDeliveryDate: null,
        createdAt: new Date(),
        lastUpdated: new Date()
      };
    }

    const data = payoutsDoc.data();
    return {
      vendorId,
      totalDeliverySpend: data.totalDeliverySpend || 0,
      totalDeliveries: data.totalDeliveries || 0,
      averageCostPerDelivery: data.totalDeliveries > 0 ? (data.totalDeliverySpend / data.totalDeliveries) : 0,
      pendingPayments: data.pendingPayments || 0,
      completedPayments: data.completedPayments || 0,
      currentBalance: data.currentBalance || 0,
      lastDeliveryDate: data.lastDeliveryDate?.toDate(),
      monthlySpend: data.monthlySpend || 0,
      createdAt: data.createdAt?.toDate(),
      lastUpdated: data.lastUpdated?.toDate() || data.updatedAt?.toDate()
    };

  } catch (error) {
    console.error('❌ Error fetching vendor payouts:', error);
    throw error;
  }
}

/**
 * Get vendor delivery payment history
 * @param {string} vendorId - Vendor ID
 * @param {number} limitCount - Number of payments to fetch
 * @returns {Promise<Array>} Array of payment records
 */
export async function getVendorPaymentHistory(vendorId, limitCount = 20) {
  try {
    const paymentsQuery = query(
      collection(db, 'vendor_payments'),
      where('vendorId', '==', vendorId)
    );

    const snapshot = await getDocs(paymentsQuery);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      paidAt: doc.data().paidAt?.toDate()
    }));

    return payments
      .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
      .slice(0, limitCount);

  } catch (error) {
    console.error('❌ Error fetching vendor payment history:', error);
    throw error;
  }
}

/**
 * Get earnings/payout statistics for a date range
 * @param {string} userId - User ID (rider or vendor)
 * @param {string} userType - 'rider' or 'vendor'
 * @param {Date} startDate - Start date for statistics
 * @param {Date} endDate - End date for statistics
 * @returns {Promise<Object>} Statistics data
 */
export async function getWalletStatistics(userId, userType, startDate, endDate) {
  try {
    const collectionName = userType === 'rider' ? 'withdrawals' : 'vendor_payments';
    const userField = userType === 'rider' ? 'riderId' : 'vendorId';
    
    const statsQuery = query(
      collection(db, collectionName),
      where(userField, '==', userId)
    );

    const snapshot = await getDocs(statsQuery);
    const records = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }))
      .filter(record => record.createdAt >= startDate && record.createdAt <= endDate)
      .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

    // Calculate statistics
    const totalAmount = records.reduce((sum, record) => sum + (record.amount || 0), 0);
    const completedRecords = records.filter(record => 
      record.status === 'completed' || record.status === 'paid'
    );
    const pendingRecords = records.filter(record => 
      record.status === 'pending' || record.status === 'processing'
    );

    return {
      totalRecords: records.length,
      totalAmount,
      completedAmount: completedRecords.reduce((sum, record) => sum + (record.amount || 0), 0),
      pendingAmount: pendingRecords.reduce((sum, record) => sum + (record.amount || 0), 0),
      completedCount: completedRecords.length,
      pendingCount: pendingRecords.length,
      averageAmount: records.length > 0 ? totalAmount / records.length : 0,
      records
    };

  } catch (error) {
    console.error('❌ Error fetching wallet statistics:', error);
    throw error;
  }
}

/**
 * Get payment methods for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of payment methods
 */
export async function getUserPaymentMethods(userId) {
  try {
    const methodsQuery = query(
      collection(db, 'payment_methods'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(methodsQuery);
    const methods = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    return methods.sort((a, b) =>
      (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0)
    );

  } catch (error) {
    console.error('❌ Error fetching payment methods:', error);
    return []; // Return empty array on error
  }
}

/**
 * Add payment method for a user
 * @param {string} userId - User ID
 * @param {Object} methodData - Payment method data
 * @returns {Promise<string>} Payment method ID
 */
export async function addPaymentMethod(userId, methodData) {
  try {
    const methodRef = await addDoc(collection(db, 'payment_methods'), {
      userId,
      ...methodData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Payment method added:', methodRef.id);
    return methodRef.id;

  } catch (error) {
    console.error('❌ Error adding payment method:', error);
    throw error;
  }
}