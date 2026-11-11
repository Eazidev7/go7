import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  GeoPoint,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vendor } from '../types/marketplace';
import { VendorFormData } from '../types/Vendor';

/**
 * Service class for vendor-related Firestore operations
 */
export class VendorService {
  /**
   * Create a new vendor in Firestore
   */
  static async createVendor(vendorData: VendorFormData, coords: { lat: number; lng: number }): Promise<string> {
    // Generate a unique vendor ID
    const vendorRef = doc(collection(db, 'vendors'));
    const vendorId = vendorRef.id;
    
    const now = Timestamp.now();
    
    const newVendor = {
      id: vendorId,
      ...vendorData,
      pickupCoords: new GeoPoint(coords.lat, coords.lng),
      createdAt: now,
      updatedAt: now,
      isActive: true
    };
    
    await setDoc(vendorRef, newVendor);
    
    return vendorId;
  }
  
  /**
   * Get vendor data by ID
   */
  static async getVendorById(vendorId: string): Promise<Vendor | null> {
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);
    
    if (!vendorSnap.exists()) {
      return null;
    }
    
    return vendorSnap.data() as Vendor;
  }
  
  /**
   * Update vendor information
   */
  static async updateVendor(vendorId: string, vendorData: Partial<VendorFormData>, coords?: { lat: number; lng: number }): Promise<void> {
    const vendorRef = doc(db, 'vendors', vendorId);
    
    const updateData: any = {
      ...vendorData,
      updatedAt: Timestamp.now()
    };
    
    if (coords) {
      updateData.pickupCoords = new GeoPoint(coords.lat, coords.lng);
    }
    
    await updateDoc(vendorRef, updateData);
  }
  
  /**
   * Subscribe to vendor's deliveries
   */
  static subscribeToVendorDeliveries(
    vendorId: string,
    callback: (deliveries: any[]) => void,
    constraints: { status?: string[]; limit?: number } = {}
  ): () => void {
    const queryConstraints: QueryConstraint[] = [
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    ];
    
    // Add status filter if provided
    if (constraints.status && constraints.status.length > 0) {
      queryConstraints.push(where('status', 'in', constraints.status));
    }
    
    // Add limit if provided
    if (constraints.limit) {
      queryConstraints.push(limit(constraints.limit));
    }
    
    const deliveriesQuery = query(
      collection(db, 'deliveries'),
      ...queryConstraints
    );
    
    const unsubscribe = onSnapshot(deliveriesQuery, (snapshot) => {
      const deliveries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(deliveries);
    });
    
    return unsubscribe;
  }
  
  /**
   * Check if phone number is associated with an existing vendor
   */
  static async getVendorByPhone(phone: string): Promise<Vendor | null> {
    const vendorsQuery = query(
      collection(db, 'vendors'),
      where('phone', '==', phone),
      limit(1)
    );

    const snapshot = await getDocs(vendorsQuery);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Vendor;
  }

  /**
   * Search vendors by name, business type, or category
   * Note: This uses client-side filtering since Firestore doesn't support full-text search
   */
  static async searchVendors(searchTerm: string, category?: string): Promise<Vendor[]> {
    try {
      let vendorsQuery = query(
        collection(db, 'vendors'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(50) // Limit to prevent excessive data transfer
      );

      // Add category filter if specified
      if (category && category !== 'all') {
        vendorsQuery = query(
          collection(db, 'vendors'),
          where('isActive', '==', true),
          where('businessType', '==', category),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }

      const snapshot = await getDocs(vendorsQuery);
      const vendors = snapshot.docs.map(doc => doc.data() as Vendor);

      // Client-side search filtering
      if (!searchTerm.trim()) {
        return vendors;
      }

      const searchLower = searchTerm.toLowerCase();
      return vendors.filter(vendor => 
        (vendor.businessName && vendor.businessName.toLowerCase().includes(searchLower)) ||
        (vendor.businessType && vendor.businessType.toLowerCase().includes(searchLower)) ||
        (vendor.description && vendor.description.toLowerCase().includes(searchLower)) ||
        (vendor.category && vendor.category.toLowerCase().includes(searchLower)) ||
        vendor.name.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching vendors:', error);
      throw new Error('Failed to search vendors');
    }
  }

  /**
   * Get all active vendors by category
   */
  static async getVendorsByCategory(category: string): Promise<Vendor[]> {
    try {
      const vendorsQuery = query(
        collection(db, 'vendors'),
        where('isActive', '==', true),
        where('businessType', '==', category),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(vendorsQuery);
      return snapshot.docs.map(doc => doc.data() as Vendor);
    } catch (error) {
      console.error('Error getting vendors by category:', error);
      throw new Error('Failed to get vendors by category');
    }
  }
  
  /**
   * Get vendors by neighborhood
   * Fetches vendors from Firestore that are tagged with a specific neighborhood
   * @param neighborhood - The neighborhood ID to filter by
   * @param businessType - Optional business type filter
   * @returns Promise with array of vendors in the specified neighborhood
   */
  static async getVendorsByNeighborhood(neighborhood: string, businessType?: string): Promise<Vendor[]> {
    try {
      // Create query constraints array
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        where('neighborhood', '==', neighborhood),
        orderBy('createdAt', 'desc'),
        limit(50)
      ];
      
      // Add business type filter if provided
      if (businessType && businessType !== 'all') {
        const businessTypeQuery = query(
          collection(db, 'vendors'),
          where('isActive', '==', true),
          where('neighborhood', '==', neighborhood),
          where('businessType', '==', businessType),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(businessTypeQuery);
        return snapshot.docs.map(doc => doc.data() as Vendor);
      }
      
      // Execute query
      const vendorsQuery = query(
        collection(db, 'vendors'),
        ...constraints
      );
      
      const snapshot = await getDocs(vendorsQuery);
      return snapshot.docs.map(doc => doc.data() as Vendor);
    } catch (error) {
      console.error('Error getting vendors by neighborhood:', error);
      throw new Error('Failed to get vendors by neighborhood');
    }
  }
}
