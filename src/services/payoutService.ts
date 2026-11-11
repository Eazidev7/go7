import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Payout Status Types
export type PayoutStatus = 
  | 'pending'
  | 'processing' 
  | 'completed'
  | 'failed'
  | 'cancelled';

// Payout Interface
export interface Payout {
  id?: string;
  vendorId: string;
  amount: number;
  currency: 'NGN';
  payoutAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    routingNumber?: string;
  };
  status: PayoutStatus;
  reference: string;
  transactionId?: string; // From payment provider
  failureReason?: string;
  processedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Vendor Balance Interface (extended)
export interface VendorBalance {
  vendorId: string;
  availableBalance: number; // Available for payout
  pendingBalance: number;   // From pending orders
  totalEarnings: number;    // Lifetime earnings
  totalPayouts: number;     // Total amount paid out
  lastPayoutAt?: Timestamp;
  minimumPayout: number;    // Default: 10000 (₦10,000)
  payoutSchedule: 'weekly' | 'monthly' | 'on-demand';
  autoPayoutEnabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Payout History Item
export interface PayoutHistoryItem extends Payout {
  vendorName: string;
}

class PayoutService {
  private payoutsCollection = collection(db, 'payouts');
  private balancesCollection = collection(db, 'vendorBalances');

  // Request manual payout
  async requestPayout(vendorId: string, amount?: number): Promise<string> {
    try {
      // Get vendor balance
      const balance = await this.getVendorBalance(vendorId);
      if (!balance) {
        throw new Error('Vendor balance not found');
      }

      // Determine payout amount
      const payoutAmount = amount || balance.availableBalance;

      // Validate payout amount
      if (payoutAmount < balance.minimumPayout) {
        throw new Error(`Minimum payout amount is ₦${balance.minimumPayout.toLocaleString()}`);
      }

      if (payoutAmount > balance.availableBalance) {
        throw new Error('Insufficient available balance');
      }

      // Get vendor payout details
      const vendor = await this.getVendorPayoutDetails(vendorId);
      if (!vendor.payoutAccount) {
        throw new Error('Vendor payout account not configured');
      }

      // Create payout request
      const payoutData: Omit<Payout, 'id'> = {
        vendorId,
        amount: payoutAmount,
        currency: 'NGN',
        payoutAccount: vendor.payoutAccount,
        status: 'pending',
        reference: this.generatePayoutReference(vendorId),
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      const docRef = await addDoc(this.payoutsCollection, payoutData);

      // Update vendor balance (move from available to processing)
      await this.updateVendorBalance(vendorId, {
        availableBalance: balance.availableBalance - payoutAmount,
        updatedAt: serverTimestamp() as Timestamp
      });

      console.log('Payout requested successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error requesting payout:', error);
      throw error;
    }
  }

  // Process payout (typically called by backend functions)
  async processPayout(payoutId: string, transactionId?: string): Promise<void> {
    try {
      const payoutRef = doc(this.payoutsCollection, payoutId);
      const payoutDoc = await getDoc(payoutRef);
      
      if (!payoutDoc.exists()) {
        throw new Error('Payout not found');
      }

      const payout = payoutDoc.data() as Payout;

      // Here you would integrate with payment provider (Paystack, Flutterwave, etc.)
      // For simulation, we'll mark as processing then completed
      
      // Update to processing
      await updateDoc(payoutRef, {
        status: 'processing',
        transactionId: transactionId || `txn_${Date.now()}`,
        updatedAt: serverTimestamp()
      });

      // Simulate payment processing delay
      setTimeout(async () => {
        try {
          // Update to completed
          await updateDoc(payoutRef, {
            status: 'completed',
            processedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Update vendor balance
          await this.updateVendorBalance(payout.vendorId, {
            totalPayouts: increment(payout.amount) as any,
            lastPayoutAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp
          });

          console.log('Payout completed successfully:', payoutId);
        } catch (error) {
          // Handle failure
          await this.handlePayoutFailure(payoutId, 'Processing failed');
        }
      }, 5000); // 5 second delay for simulation

    } catch (error) {
      console.error('Error processing payout:', error);
      await this.handlePayoutFailure(payoutId, error.message);
    }
  }

  // Handle payout failure
  private async handlePayoutFailure(payoutId: string, reason: string): Promise<void> {
    try {
      const payoutRef = doc(this.payoutsCollection, payoutId);
      const payoutDoc = await getDoc(payoutRef);
      
      if (!payoutDoc.exists()) return;

      const payout = payoutDoc.data() as Payout;

      // Update payout status
      await updateDoc(payoutRef, {
        status: 'failed',
        failureReason: reason,
        updatedAt: serverTimestamp()
      });

      // Refund amount back to available balance
      await this.updateVendorBalance(payout.vendorId, {
        availableBalance: increment(payout.amount),
        updatedAt: serverTimestamp() as any
      });

      console.log('Payout failed, amount refunded:', payoutId);
    } catch (error) {
      console.error('Error handling payout failure:', error);
    }
  }

  // Get vendor balance
  async getVendorBalance(vendorId: string): Promise<VendorBalance | null> {
    try {
      const q = query(this.balancesCollection, where('vendorId', '==', vendorId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { ...doc.data() } as VendorBalance;
      }
      return null;
    } catch (error) {
      console.error('Error getting vendor balance:', error);
      throw error;
    }
  }

  // Update vendor balance
  private async updateVendorBalance(vendorId: string, updates: Partial<VendorBalance>): Promise<void> {
    try {
      const q = query(this.balancesCollection, where('vendorId', '==', vendorId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, updates);
      }
    } catch (error) {
      console.error('Error updating vendor balance:', error);
      throw error;
    }
  }

  // Get vendor payout details
  private async getVendorPayoutDetails(vendorId: string): Promise<any> {
    try {
      const vendorRef = doc(db, 'vendors', vendorId);
      const vendorDoc = await getDoc(vendorRef);
      
      if (!vendorDoc.exists()) {
        throw new Error('Vendor not found');
      }

      return vendorDoc.data();
    } catch (error) {
      console.error('Error getting vendor payout details:', error);
      throw error;
    }
  }

  // Get vendor payout history
  async getVendorPayouts(vendorId: string, limitCount: number = 50): Promise<Payout[]> {
    try {
      const q = query(
        this.payoutsCollection,
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payout[];
    } catch (error) {
      console.error('Error getting vendor payouts:', error);
      throw error;
    }
  }

  // Get all payouts (admin function)
  async getAllPayouts(status?: PayoutStatus, limitCount: number = 100): Promise<PayoutHistoryItem[]> {
    try {
      let q = query(
        this.payoutsCollection,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (status) {
        q = query(
          this.payoutsCollection,
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const payouts: PayoutHistoryItem[] = [];

      for (const payoutDoc of querySnapshot.docs) {
        const payoutData = { id: payoutDoc.id, ...payoutDoc.data() } as Payout;
        
        // Get vendor name
        const vendorDoc = await getDoc(doc(db, 'vendors', payoutData.vendorId));
        const vendorName = vendorDoc.exists() ? vendorDoc.data().name : 'Unknown Vendor';
        
        payouts.push({
          ...payoutData,
          vendorName
        });
      }

      return payouts;
    } catch (error) {
      console.error('Error getting all payouts:', error);
      throw error;
    }
  }

  // Configure auto-payout settings
  async configureAutoPayout(
    vendorId: string, 
    enabled: boolean, 
    schedule: 'weekly' | 'monthly' | 'on-demand',
    minimumAmount?: number
  ): Promise<void> {
    try {
      const updates: Partial<VendorBalance> = {
        autoPayoutEnabled: enabled,
        payoutSchedule: schedule,
        updatedAt: serverTimestamp() as Timestamp
      };

      if (minimumAmount !== undefined) {
        updates.minimumPayout = Math.max(10000, minimumAmount); // Enforce minimum of ₦10,000
      }

      await this.updateVendorBalance(vendorId, updates);
      console.log('Auto-payout settings updated');
    } catch (error) {
      console.error('Error configuring auto-payout:', error);
      throw error;
    }
  }

  // Get payout statistics
  async getPayoutStats(vendorId: string, days: number = 30): Promise<{
    totalPayouts: number;
    totalAmount: number;
    successfulPayouts: number;
    failedPayouts: number;
    avgPayoutAmount: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const q = query(
        this.payoutsCollection,
        where('vendorId', '==', vendorId),
        where('createdAt', '>=', cutoffDate)
      );
      
      const querySnapshot = await getDocs(q);
      const payouts = querySnapshot.docs.map(doc => doc.data()) as Payout[];
      
      const totalPayouts = payouts.length;
      const successfulPayouts = payouts.filter(p => p.status === 'completed').length;
      const failedPayouts = payouts.filter(p => p.status === 'failed').length;
      const totalAmount = payouts
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      const avgPayoutAmount = successfulPayouts > 0 ? totalAmount / successfulPayouts : 0;
      
      return {
        totalPayouts,
        totalAmount,
        successfulPayouts,
        failedPayouts,
        avgPayoutAmount
      };
    } catch (error) {
      console.error('Error getting payout stats:', error);
      throw error;
    }
  }

  // Real-time balance subscription
  subscribeToVendorBalance(vendorId: string, callback: (balance: VendorBalance | null) => void): () => void {
    const q = query(this.balancesCollection, where('vendorId', '==', vendorId));
    
    return onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        callback({ ...doc.data() } as VendorBalance);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in balance subscription:', error);
      callback(null);
    });
  }

  // Real-time payouts subscription
  subscribeToVendorPayouts(
    vendorId: string,
    callback: (payouts: Payout[]) => void,
    limitCount: number = 20
  ): () => void {
    const q = query(
      this.payoutsCollection,
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const payouts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payout[];
      callback(payouts);
    }, (error) => {
      console.error('Error in payouts subscription:', error);
      callback([]);
    });
  }

  // Generate unique payout reference
  private generatePayoutReference(vendorId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `payout_${vendorId}_${timestamp}_${random}`;
  }

  // Cancel pending payout
  async cancelPayout(payoutId: string): Promise<void> {
    try {
      const payoutRef = doc(this.payoutsCollection, payoutId);
      const payoutDoc = await getDoc(payoutRef);
      
      if (!payoutDoc.exists()) {
        throw new Error('Payout not found');
      }

      const payout = payoutDoc.data() as Payout;

      if (payout.status !== 'pending') {
        throw new Error('Can only cancel pending payouts');
      }

      // Update payout status
      await updateDoc(payoutRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });

      // Refund amount back to available balance
      await this.updateVendorBalance(payout.vendorId, {
        availableBalance: increment(payout.amount),
        updatedAt: serverTimestamp() as any
      });

      console.log('Payout cancelled successfully:', payoutId);
    } catch (error) {
      console.error('Error cancelling payout:', error);
      throw error;
    }
  }

  // Get earnings projection
  async getEarningsProjection(vendorId: string): Promise<{
    nextPayoutDate: Date | null;
    projectedAmount: number;
    daysUntilPayout: number;
  }> {
    try {
      const balance = await this.getVendorBalance(vendorId);
      if (!balance) {
        throw new Error('Vendor balance not found');
      }

      let nextPayoutDate: Date | null = null;
      let daysUntilPayout = 0;

      if (balance.autoPayoutEnabled && balance.payoutSchedule !== 'on-demand') {
        const lastPayout = balance.lastPayoutAt ? balance.lastPayoutAt.toDate() : new Date(0);
        const now = new Date();

        switch (balance.payoutSchedule) {
          case 'weekly':
            nextPayoutDate = new Date(lastPayout.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            nextPayoutDate = new Date(lastPayout.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
        }

        if (nextPayoutDate) {
          daysUntilPayout = Math.max(0, Math.ceil((nextPayoutDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        }
      }

      return {
        nextPayoutDate,
        projectedAmount: balance.availableBalance,
        daysUntilPayout
      };
    } catch (error) {
      console.error('Error getting earnings projection:', error);
      throw error;
    }
  }
}

export const payoutService = new PayoutService();