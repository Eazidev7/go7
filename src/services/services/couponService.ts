import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  increment,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Coupon, CouponValidationResult } from '../types/vendor';

export class CouponService {
  /**
   * Create a new coupon for a vendor
   */
  static async createCoupon(vendorId: string, couponData: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<string> {
    try {
      const couponsRef = collection(db, 'vendors', vendorId, 'coupons');
      
      // Check if coupon code already exists
      const existingCoupon = await this.getCouponByCode(vendorId, couponData.code);
      if (existingCoupon) {
        throw new Error('Coupon code already exists');
      }

      const coupon = {
        ...couponData,
        usageCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(couponsRef, coupon);
      return docRef.id;
    } catch (error) {
      console.error('Error creating coupon:', error);
      throw error;
    }
  }

  /**
   * Get all coupons for a vendor
   */
  static async getVendorCoupons(vendorId: string, activeOnly: boolean = false): Promise<Coupon[]> {
    try {
      const couponsRef = collection(db, 'vendors', vendorId, 'coupons');
      let q = query(couponsRef, orderBy('createdAt', 'desc'));
      
      if (activeOnly) {
        q = query(couponsRef, where('active', '==', true), orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expiresAt: doc.data().expiresAt.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Coupon[];
    } catch (error) {
      console.error('Error fetching vendor coupons:', error);
      throw error;
    }
  }

  /**
   * Get coupon by code
   */
  static async getCouponByCode(vendorId: string, code: string): Promise<Coupon | null> {
    try {
      const couponsRef = collection(db, 'vendors', vendorId, 'coupons');
      const q = query(couponsRef, where('code', '==', code.toUpperCase()), limit(1));
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        expiresAt: doc.data().expiresAt.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      } as Coupon;
    } catch (error) {
      console.error('Error fetching coupon by code:', error);
      throw error;
    }
  }

  /**
   * Validate and apply coupon
   */
  static async validateCoupon(
    vendorId: string, 
    code: string, 
    orderAmount: number,
    customerId?: string
  ): Promise<CouponValidationResult> {
    try {
      const coupon = await this.getCouponByCode(vendorId, code);
      
      if (!coupon) {
        return { valid: false, discount: 0, message: 'Coupon not found' };
      }

      // Check if coupon is active
      if (!coupon.active) {
        return { valid: false, discount: 0, message: 'Coupon is not active' };
      }

      // Check expiry
      if (new Date() > coupon.expiresAt) {
        return { valid: false, discount: 0, message: 'Coupon has expired' };
      }

      // Check usage limit
      if (coupon.usageCount && coupon.usageCount >= coupon.usageLimit) {
        return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
      }

      // Check minimum order amount
      if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
        return { 
          valid: false, 
          discount: 0, 
          message: `Minimum order amount of ₦${(coupon.minOrderAmount / 100).toFixed(2)} required` 
        };
      }

      // Calculate discount
      let discount = 0;
      if (coupon.type === 'percent') {
        discount = Math.round((orderAmount * coupon.value) / 100);
        
        // Apply max discount limit if specified
        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
          discount = coupon.maxDiscountAmount;
        }
      } else {
        discount = coupon.value;
      }

      // Ensure discount doesn't exceed order amount
      discount = Math.min(discount, orderAmount);

      return {
        valid: true,
        discount,
        message: `Coupon applied! You saved ₦${(discount / 100).toFixed(2)}`,
        coupon
      };
    } catch (error) {
      console.error('Error validating coupon:', error);
      return { valid: false, discount: 0, message: 'Error validating coupon' };
    }
  }

  /**
   * Apply coupon (increment usage count)
   */
  static async applyCoupon(vendorId: string, couponId: string): Promise<void> {
    try {
      const couponRef = doc(db, 'vendors', vendorId, 'coupons', couponId);
      await updateDoc(couponRef, {
        usageCount: increment(1),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error applying coupon:', error);
      throw error;
    }
  }

  /**
   * Update coupon
   */
  static async updateCoupon(vendorId: string, couponId: string, updates: Partial<Coupon>): Promise<void> {
    try {
      const couponRef = doc(db, 'vendors', vendorId, 'coupons', couponId);
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      // Convert Date objects to Timestamps
      if (updates.expiresAt) {
        updateData.expiresAt = Timestamp.fromDate(updates.expiresAt);
      }

      await updateDoc(couponRef, updateData);
    } catch (error) {
      console.error('Error updating coupon:', error);
      throw error;
    }
  }

  /**
   * Delete coupon
   */
  static async deleteCoupon(vendorId: string, couponId: string): Promise<void> {
    try {
      const couponRef = doc(db, 'vendors', vendorId, 'coupons', couponId);
      await deleteDoc(couponRef);
    } catch (error) {
      console.error('Error deleting coupon:', error);
      throw error;
    }
  }

  /**
   * Toggle coupon active status
   */
  static async toggleCouponStatus(vendorId: string, couponId: string): Promise<void> {
    try {
      const couponRef = doc(db, 'vendors', vendorId, 'coupons', couponId);
      const couponDoc = await getDoc(couponRef);
      
      if (!couponDoc.exists()) {
        throw new Error('Coupon not found');
      }

      const currentStatus = couponDoc.data().active;
      await updateDoc(couponRef, {
        active: !currentStatus,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      throw error;
    }
  }
}
