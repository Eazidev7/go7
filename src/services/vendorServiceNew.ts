import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

// TypeScript interfaces
export interface VendorAvailability {
  [day: string]: string[]; // e.g., { "monday": ["09:00-17:00", "19:00-22:00"] }
}

export interface Vendor {
  id?: string;
  name: string;
  userId: string;
  payoutAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    routingNumber?: string;
  };
  verified: boolean;
  categories: string[]; // ["restaurants", "markets"]
  availability: VendorAvailability;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  phone?: string;
  email?: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  totalOrders?: number;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface VendorBalance {
  vendorId: string;
  availableBalance: number; // Available for payout
  pendingBalance: number;   // From pending orders
  totalEarnings: number;    // Lifetime earnings
  lastPayoutAt?: Timestamp;
  minimumPayout: number;    // Default: 10000 (₦10,000)
  payoutSchedule: 'weekly' | 'monthly' | 'on-demand';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

class VendorServiceNew {
  private vendorsCollection = collection(db, 'vendors');
  private balancesCollection = collection(db, 'vendorBalances');

  // Create new vendor
  async createVendor(vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(this.vendorsCollection, {
        ...vendorData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Initialize vendor balance
      await addDoc(this.balancesCollection, {
        vendorId: docRef.id,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        minimumPayout: 10000, // ₦10,000 default
        payoutSchedule: 'weekly',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Vendor created successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  }

  // Get vendor by ID
  async getVendor(vendorId: string): Promise<Vendor | null> {
    try {
      const docRef = doc(this.vendorsCollection, vendorId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Vendor;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting vendor:', error);
      throw error;
    }
  }

  // Get vendor by userId
  async getVendorByUserId(userId: string): Promise<Vendor | null> {
    try {
      const q = query(this.vendorsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Vendor;
      }
      return null;
    } catch (error) {
      console.error('Error getting vendor by userId:', error);
      throw error;
    }
  }

  // Update vendor
  async updateVendor(vendorId: string, updates: Partial<Vendor>): Promise<void> {
    try {
      const docRef = doc(this.vendorsCollection, vendorId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('Vendor updated successfully');
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  }

  // Get vendors by category
  async getVendorsByCategory(category: string, limitCount: number = 20): Promise<Vendor[]> {
    try {
      const q = query(
        this.vendorsCollection,
        where('categories', 'array-contains', category),
        where('isActive', '==', true),
        orderBy('rating', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vendor[];
    } catch (error) {
      console.error('Error getting vendors by category:', error);
      throw error;
    }
  }

  // Get all active vendors
  async getActiveVendors(limitCount: number = 50): Promise<Vendor[]> {
    try {
      const q = query(
        this.vendorsCollection,
        where('isActive', '==', true),
        orderBy('totalOrders', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vendor[];
    } catch (error) {
      console.error('Error getting active vendors:', error);
      throw error;
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
  async updateVendorBalance(vendorId: string, updates: Partial<VendorBalance>): Promise<void> {
    try {
      const q = query(this.balancesCollection, where('vendorId', '==', vendorId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
        console.log('Vendor balance updated successfully');
      } else {
        throw new Error('Vendor balance not found');
      }
    } catch (error) {
      console.error('Error updating vendor balance:', error);
      throw error;
    }
  }

  // Check if vendor is available now
  isVendorAvailable(vendor: Vendor): boolean {
    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = days[now.getDay()]; // 'mon', 'tue', etc.
    const currentTime = now.toTimeString().substring(0, 5); // 'HH:MM'
    
    const daySchedule = vendor.availability[currentDay] || vendor.availability[currentDay + 'day'];
    if (!daySchedule || daySchedule.length === 0) {
      return false;
    }

    return daySchedule.some(timeRange => {
      const [start, end] = timeRange.split('-');
      return currentTime >= start && currentTime <= end;
    });
  }
}

export const vendorServiceNew = new VendorServiceNew();