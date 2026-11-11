import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// TypeScript Interfaces
interface PayoutJob {
  vendorId: string;
  vendorName: string;
  businessName: string;
  amount: number;
  currency: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
  };
  reference: string;
}

interface PayoutResponse {
  success: boolean;
  reference?: string;
  error?: string;
  transactionId?: string;
}

// Constants
const PAYOUT_THRESHOLD = 10000; // ₦10,000 minimum payout
const MAX_RETRIES = 3;
const PAYOUT_SCHEDULE = '0 9 * * 1,4'; // Every Monday and Thursday at 9 AM Lagos time

// Payment provider simulation
class PaymentProvider {
  static async transferFunds(job: PayoutJob): Promise<PayoutResponse> {
    try {
      functions.logger.info(`Processing payout for ${job.vendorName}`, {
        amount: job.amount,
        accountNumber: job.bankDetails.accountNumber,
        reference: job.reference
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

      // Simulate different response scenarios
      const random = Math.random();
      
      if (random < 0.02) { // 2% insufficient funds
        return {
          success: false,
          error: 'Insufficient funds in payment provider account'
        };
      } else if (random < 0.05) { // 3% invalid account
        return {
          success: false,
          error: 'Invalid bank account details'
        };
      } else if (random < 0.08) { // 3% network error
        return {
          success: false,  
          error: 'Network timeout - please retry'
        };
      } else { // 92% success
        return {
          success: true,
          reference: job.reference,
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message || 'Payment processing failed' : String(error) || 'Payment processing failed'
      };
    }
  }

  static async verifyBankAccount(bankDetails: any): Promise<{ valid: boolean; accountName?: string }> {
    // Simulate bank account verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 95% accounts are valid for simulation
    if (Math.random() < 0.95) {
      return {
        valid: true,
        accountName: bankDetails.accountName
      };
    } else {
      return {
        valid: false
      };
    }
  }
}

// Helper functions
function generatePayoutReference(vendorId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAYOUT_${vendorId}_${timestamp}_${random}`;
}

function validateBankDetails(bankDetails: any): string[] {
  const errors: string[] = [];
  
  if (!bankDetails) {
    errors.push('Bank details are required');
    return errors;
  }
  
  if (!bankDetails.accountName?.trim()) {
    errors.push('Account name is required');
  }
  
  if (!bankDetails.accountNumber?.trim()) {
    errors.push('Account number is required');
  } else if (!/^\d{10}$/.test(bankDetails.accountNumber.trim())) {
    errors.push('Account number must be 10 digits');
  }
  
  if (!bankDetails.bankName?.trim()) {
    errors.push('Bank name is required');
  }
  
  if (!bankDetails.bankCode?.trim()) {
    errors.push('Bank code is required');
  } else if (!/^\d{3}$/.test(bankDetails.bankCode.trim())) {
    errors.push('Bank code must be 3 digits');
  }
  
  return errors;
}

async function processPayoutJob(job: PayoutJob, retryCount: number = 0): Promise<void> {
  const payoutRef = db.collection('payouts').doc();
  
  try {
    // Create payout record
    const payoutData = {
      vendorId: job.vendorId,
      vendorName: job.vendorName,
      businessName: job.businessName,
      amount: job.amount,
      currency: job.currency,
      status: 'processing',
      paymentMethod: 'bank_transfer',
      bankDetails: job.bankDetails,
      reference: job.reference,
      scheduledDate: admin.firestore.FieldValue.serverTimestamp(),
      processedDate: null,
      completedDate: null,
      failureReason: null,
      retryCount: retryCount,
      maxRetries: MAX_RETRIES,
      externalReference: null,
      transactionId: null,
      metadata: {
        isAutomatic: true,
        triggeredBy: 'scheduled_job',
        processingAttempt: retryCount + 1
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await payoutRef.set(payoutData);

    // Process payment with external provider
    const paymentResult = await PaymentProvider.transferFunds(job);
    
    if (paymentResult.success) {
      // Payment successful
      await db.runTransaction(async (transaction) => {
        // Update payout record
        transaction.update(payoutRef, {
          status: 'completed',
          processedDate: admin.firestore.FieldValue.serverTimestamp(),
          completedDate: admin.firestore.FieldValue.serverTimestamp(),
          externalReference: paymentResult.reference,
          transactionId: paymentResult.transactionId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update vendor balance (move from pending to paid)
        const vendorRef = db.collection('vendors').doc(job.vendorId);
        transaction.update(vendorRef, {
          'balance.pending': admin.firestore.FieldValue.increment(-job.amount),
          totalPayouts: admin.firestore.FieldValue.increment(1),
          totalPayoutAmount: admin.firestore.FieldValue.increment(job.amount),
          lastPayoutDate: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      functions.logger.info(`Payout completed successfully`, {
        vendorId: job.vendorId,
        amount: job.amount,
        reference: job.reference,
        transactionId: paymentResult.transactionId
      });

    } else {
      // Payment failed
      await payoutRef.update({
        status: retryCount >= MAX_RETRIES - 1 ? 'failed' : 'retry_scheduled',
        failureReason: paymentResult.error,
        retryCount: retryCount + 1,
        nextRetryDate: retryCount < MAX_RETRIES - 1 ? 
          admin.firestore.Timestamp.fromDate(new Date(Date.now() + (retryCount + 1) * 60 * 60 * 1000)) : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (retryCount < MAX_RETRIES - 1) {
        functions.logger.warn(`Payout failed, will retry`, {
          vendorId: job.vendorId,
          error: paymentResult.error,
          retryCount: retryCount + 1,
          maxRetries: MAX_RETRIES
        });
      } else {
        functions.logger.error(`Payout failed permanently`, {
          vendorId: job.vendorId,
          error: paymentResult.error,
          retryCount: retryCount + 1
        });

        // Move amount back to available balance if all retries failed
        await db.collection('vendors').doc(job.vendorId).update({
          'balance.available': admin.firestore.FieldValue.increment(job.amount),
          'balance.pending': admin.firestore.FieldValue.increment(-job.amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      throw new Error(paymentResult.error);
    }

  } catch (error) {
    functions.logger.error(`Error processing payout job`, {
      vendorId: job.vendorId,
      error: error instanceof Error ? error.message : String(error),
      retryCount
    });
    throw error;
  }
}

// Main scheduled payout function
export const autoPayout = functions.pubsub
  .schedule(PAYOUT_SCHEDULE)
  .timeZone('Africa/Lagos')
  .onRun(async (context) => {
    try {
      functions.logger.info('Starting automatic payout process');

      const startTime = Date.now();
      let processedCount = 0;
      let totalAmount = 0;
      let errorCount = 0;

      // Get eligible vendors
      const eligibleVendorsQuery = db.collection('vendors')
        .where('balance.available', '>=', PAYOUT_THRESHOLD)
        .where('isActive', '==', true);

      const vendorsSnapshot = await eligibleVendorsQuery.get();

      if (vendorsSnapshot.empty) {
        functions.logger.info('No vendors eligible for payout');
        return {
          success: true,
          message: 'No vendors eligible for payout',
          processedCount: 0,
          totalAmount: 0
        };
      }

      functions.logger.info(`Found ${vendorsSnapshot.size} eligible vendors for payout`);

      // Process payouts in batches to avoid timeout
      const BATCH_SIZE = 10;
      const vendors = vendorsSnapshot.docs;
      
      for (let i = 0; i < vendors.length; i += BATCH_SIZE) {
        const batch = vendors.slice(i, i + BATCH_SIZE);
        
        await Promise.allSettled(batch.map(async (vendorDoc) => {
          const vendor = vendorDoc.data();
          const vendorId = vendorDoc.id;
          
          try {
            // Validate bank details
            const bankValidationErrors = validateBankDetails(vendor.bankDetails);
            if (bankValidationErrors.length > 0) {
              functions.logger.warn(`Vendor ${vendorId} has invalid bank details`, {
                vendorId,
                businessName: vendor.businessName,
                errors: bankValidationErrors
              });
              return;
            }

            // Verify bank account (optional step)
            const accountVerification = await PaymentProvider.verifyBankAccount(vendor.bankDetails);
            if (!accountVerification.valid) {
              functions.logger.warn(`Bank account verification failed for vendor ${vendorId}`);
              return;
            }

            const payoutAmount = vendor.balance.available;
            
            // Create payout job
            const payoutJob: PayoutJob = {
              vendorId,
              vendorName: vendor.ownerName || vendor.businessName,
              businessName: vendor.businessName,
              amount: payoutAmount,
              currency: 'NGN',
              bankDetails: {
                accountName: vendor.bankDetails.accountName.trim(),
                accountNumber: vendor.bankDetails.accountNumber.trim(),
                bankName: vendor.bankDetails.bankName.trim(),
                bankCode: vendor.bankDetails.bankCode.trim()
              },
              reference: generatePayoutReference(vendorId)
            };

            // Update vendor balance immediately (move available to pending)
            await db.collection('vendors').doc(vendorId).update({
              'balance.available': 0,
              'balance.pending': admin.firestore.FieldValue.increment(payoutAmount),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Process the payout
            await processPayoutJob(payoutJob);
            
            processedCount++;
            totalAmount += payoutAmount;
            
            functions.logger.info(`Payout processed for vendor ${vendorId}`, {
              vendorId,
              businessName: vendor.businessName,
              amount: payoutAmount
            });

          } catch (error) {
            errorCount++;
            functions.logger.error(`Failed to process payout for vendor ${vendorId}`, {
              vendorId,
              businessName: vendor.businessName,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }));

        // Small delay between batches
        if (i + BATCH_SIZE < vendors.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const duration = Date.now() - startTime;
      
      functions.logger.info('Automatic payout process completed', {
        duration: `${duration}ms`,
        totalVendors: vendors.length,
        processedCount,
        errorCount,
        totalAmount: `₦${totalAmount.toLocaleString()}`,
        averageAmount: processedCount > 0 ? `₦${Math.round(totalAmount / processedCount).toLocaleString()}` : '₦0'
      });

      return {
        success: true,
        processedCount,
        totalAmount,
        errorCount,
        duration
      };

    } catch (error) {
      functions.logger.error('Error in automatic payout process:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw new functions.https.HttpsError('internal', 'Automatic payout process failed');
    }
  });

// Manual payout trigger (admin only)
export const triggerManualPayout = functions.https.onCall(async (
  data: { vendorId: string; amount?: number },
  context: functions.https.CallableContext
) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin permissions
    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // Get vendor data
    const vendorRef = db.collection('vendors').doc(data.vendorId);
    const vendorDoc = await vendorRef.get();
    
    if (!vendorDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Vendor not found');
    }

    const vendor = vendorDoc.data()!;
    
    if (!vendor.isActive) {
      throw new functions.https.HttpsError('failed-precondition', 'Vendor is not active');
    }

    // Validate bank details
    const bankValidationErrors = validateBankDetails(vendor.bankDetails);
    if (bankValidationErrors.length > 0) {
      throw new functions.https.HttpsError('invalid-argument', 
        `Invalid bank details: ${bankValidationErrors.join(', ')}`);
    }

    // Determine payout amount
    const payoutAmount = data.amount || vendor.balance.available;
    
    if (payoutAmount < 1000) {
      throw new functions.https.HttpsError('failed-precondition', 
        'Minimum payout amount is ₦1,000');
    }

    if (payoutAmount > vendor.balance.available) {
      throw new functions.https.HttpsError('failed-precondition', 
        `Insufficient balance. Available: ₦${vendor.balance.available.toLocaleString()}`);
    }

    // Create manual payout job
    const payoutJob: PayoutJob = {
      vendorId: data.vendorId,
      vendorName: vendor.ownerName || vendor.businessName,
      businessName: vendor.businessName,
      amount: payoutAmount,
      currency: 'NGN',
      bankDetails: vendor.bankDetails,
      reference: generatePayoutReference(data.vendorId)
    };

    // Update vendor balance
    await vendorRef.update({
      'balance.available': admin.firestore.FieldValue.increment(-payoutAmount),
      'balance.pending': admin.firestore.FieldValue.increment(payoutAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Process payout
    await processPayoutJob(payoutJob);

    functions.logger.info('Manual payout triggered successfully', {
      vendorId: data.vendorId,
      amount: payoutAmount,
      triggeredBy: context.auth.uid
    });

    return {
      success: true,
      message: `Manual payout of ₦${payoutAmount.toLocaleString()} initiated for ${vendor.businessName}`,
      reference: payoutJob.reference,
      amount: payoutAmount
    };

  } catch (error) {
    functions.logger.error('Error in manual payout:', {
      error: error instanceof Error ? error.message : String(error),
      vendorId: data.vendorId,
      triggeredBy: context.auth?.uid
    });
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to process manual payout');
  }
});

// Get payout history for vendor
export const getPayoutHistory = functions.https.onCall(async (
  data: { vendorId?: string; limit?: number; startAfter?: string },
  context: functions.https.CallableContext
) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    let query = db.collection('payouts').orderBy('createdAt', 'desc');

    // If vendorId provided, filter by vendor
    if (data.vendorId) {
      // Verify vendor ownership or admin access
      const vendorDoc = await db.collection('vendors').doc(data.vendorId).get();
      if (!vendorDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Vendor not found');
      }

      const isOwner = vendorDoc.data()!.userId === context.auth.uid;
      const isAdmin = (await db.collection('admins').doc(context.auth.uid).get()).exists;

      if (!isOwner && !isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized');
      }

      query = query.where('vendorId', '==', data.vendorId);
    } else {
      // If no vendorId, user must be admin
      const isAdmin = (await db.collection('admins').doc(context.auth.uid).get()).exists;
      if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
      }
    }

    // Apply pagination
    if (data.startAfter) {
      const startAfterDoc = await db.collection('payouts').doc(data.startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const limit = Math.min(data.limit || 20, 100);
    query = query.limit(limit);

    const snapshot = await query.get();
    
    const payouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Hide sensitive bank details from response
      bankDetails: {
        accountName: doc.data().bankDetails?.accountName,
        bankName: doc.data().bankDetails?.bankName,
        accountNumber: doc.data().bankDetails?.accountNumber?.replace(/\d(?=\d{4})/g, '*')
      }
    }));

    return {
      success: true,
      payouts,
      hasMore: snapshot.docs.length === limit,
      lastDocument: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null
    };

  } catch (error) {
    functions.logger.error('Error getting payout history:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to get payout history');
  }
});

// Get payout statistics
export const getPayoutStats = functions.https.onCall(async (
  data: { vendorId?: string; period?: 'week' | 'month' | 'year' },
  context: functions.https.CallableContext
) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const period = data.period || 'month';
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let query = db.collection('payouts')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate));

    if (data.vendorId) {
      // Verify access
      const vendorDoc = await db.collection('vendors').doc(data.vendorId).get();
      if (!vendorDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Vendor not found');
      }

      const isOwner = vendorDoc.data()!.userId === context.auth.uid;
      const isAdmin = (await db.collection('admins').doc(context.auth.uid).get()).exists;

      if (!isOwner && !isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized');
      }

      query = query.where('vendorId', '==', data.vendorId);
    }

    const snapshot = await query.get();
    
    let totalAmount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    snapshot.docs.forEach(doc => {
      const payout = doc.data();
      
      switch (payout.status) {
        case 'completed':
          completedCount++;
          totalAmount += payout.amount;
          break;
        case 'failed':
          failedCount++;
          break;
        default:
          pendingCount++;
      }
    });

    return {
      success: true,
      stats: {
        period,
        totalPayouts: snapshot.size,
        completedPayouts: completedCount,
        failedPayouts: failedCount,
        pendingPayouts: pendingCount,
        totalAmount,
        averageAmount: completedCount > 0 ? Math.round(totalAmount / completedCount) : 0,
        successRate: snapshot.size > 0 ? ((completedCount / snapshot.size) * 100).toFixed(1) : '0.0'
      }
    };

  } catch (error) {
    functions.logger.error('Error getting payout stats:', error);
    throw error;
  }
});