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
import { isVendorPubliclyVisible } from '../utils/vendorVisibility';

// Type alias for vendor form data (subset of Vendor interface)
type VendorFormData = Omit<Vendor, 'id' | 'createdAt' | 'active'>;

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
   * Get all active vendors, optionally filtered by category
   */
  static async getVendors(category?: string): Promise<Vendor[]> {
    try {
      let vendorsQuery;
      
      if (category && category !== 'All') {
        vendorsQuery = query(
          collection(db, 'vendors'),
          where('businessType', '==', category),
          limit(50)
        );
      } else {
        vendorsQuery = query(
          collection(db, 'vendors'),
          limit(50)
        );
      }

      const snapshot = await getDocs(vendorsQuery);
      const vendors = snapshot.docs
        .map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Vendor))
        .filter(vendor => isVendorPubliclyVisible(vendor));
      
      console.log('📍 VendorService.getVendors returning', vendors.length, 'vendors');
      vendors.forEach(v => console.log('  -', v.name || v.businessName, '(ID:', v.id, ')'));
      
      return vendors;
    } catch (error) {
      console.error('Error getting vendors:', error);
      throw new Error('Failed to get vendors');
    }
  }

  /**
   * Get all active vendors by category
   */
  static async getVendorsByCategory(category: string): Promise<Vendor[]> {
    try {
      const vendorsQuery = query(
        collection(db, 'vendors'),
        where('businessType', '==', category),
        limit(50)
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

  /**
   * Get market vendors
   */
  static async getMarketVendors(): Promise<any[]> {
    try {
      const marketsQuery = query(
        collection(db, 'vendors'),
        where('type', '==', 'market'),
        where('isActive', '==', true),
        orderBy('featured', 'desc'),
        orderBy('rating', 'desc')
      );
      
      const snapshot = await getDocs(marketsQuery);
      const markets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Return mock data if no markets found
      if (markets.length === 0) {
        return this.getMockMarkets();
      }
      
      return markets;
    } catch (error) {
      console.error('Error getting market vendors:', error);
      // Return mock data as fallback
      return this.getMockMarkets();
    }
  }

  /**
   * Get pharmacy vendors
   */
  static async getPharmacyVendors(): Promise<any[]> {
    try {
      const pharmaciesQuery = query(
        collection(db, 'vendors'),
        where('type', '==', 'pharmacy'),
        where('isActive', '==', true),
        orderBy('featured', 'desc'),
        orderBy('rating', 'desc')
      );
      
      const snapshot = await getDocs(pharmaciesQuery);
      const pharmacies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Return mock data if no pharmacies found
      if (pharmacies.length === 0) {
        return this.getMockPharmacies();
      }
      
      return pharmacies;
    } catch (error) {
      console.error('Error getting pharmacy vendors:', error);
      // Return mock data as fallback
      return this.getMockPharmacies();
    }
  }

  /**
   * Mock market data for fallback
   */
  static getMockMarkets() {
    return [
      {
        id: '1',
        name: 'Ibara Market',
        image: '/images/ibara-market.jpg',
        logo: '/images/ibara-logo.png',
        categories: ['Groceries', 'Fresh Produce', 'Meat & Fish'],
        rating: 4.8,
        distance: '0.8 km',
        deliveryTime: '15-25 mins',
        deliveryFee: '₦200',
        isOpen: true,
        description: 'Fresh groceries and local produce daily',
        featured: true,
        type: 'market',
        address: 'Ibara Road, Abeokuta',
        phone: '+234 803 123 4567'
      },
      {
        id: '2',
        name: 'Adatan Market',
        image: '/images/adatan-market.jpg',
        categories: ['Fresh Produce', 'Meat & Fish', 'Dairy'],
        rating: 4.6,
        distance: '1.2 km',
        deliveryTime: '20-30 mins',
        deliveryFee: '₦250',
        isOpen: true,
        description: 'Traditional market with fresh local products',
        featured: false,
        type: 'market',
        address: 'Adatan Area, Abeokuta',
        phone: '+234 803 234 5678'
      },
      {
        id: '3',
        name: 'ShopRite Abeokuta',
        image: '/images/shoprite.jpg',
        logo: '/images/shoprite-logo.png',
        categories: ['Groceries', 'Household', 'Beverages', 'Dairy'],
        rating: 4.7,
        distance: '2.1 km',
        deliveryTime: '25-35 mins',
        deliveryFee: '₦300',
        isOpen: true,
        description: 'Modern supermarket with wide selection',
        featured: true,
        type: 'market',
        address: 'Oke Ilewo, Abeokuta',
        phone: '+234 803 345 6789'
      },
      {
        id: '4',
        name: 'Olumo Bakery',
        image: '/images/olumo-bakery.jpg',
        categories: ['Bakery', 'Beverages'],
        rating: 4.5,
        distance: '0.5 km',
        deliveryTime: '10-20 mins',
        deliveryFee: '₦150',
        isOpen: true,
        description: 'Fresh bread and baked goods daily',
        featured: false,
        type: 'market',
        address: 'Kuto Road, Abeokuta',
        phone: '+234 803 456 7890'
      },
      {
        id: '5',
        name: 'Kuto Market',
        image: '/images/kuto-market.jpg',
        categories: ['Fresh Produce', 'Groceries', 'Household'],
        rating: 4.4,
        distance: '1.8 km',
        deliveryTime: '30-40 mins',
        deliveryFee: '₦350',
        isOpen: false,
        description: 'Local market - Opens 6 AM daily',
        featured: false,
        type: 'market',
        address: 'Kuto Area, Abeokuta',
        phone: '+234 803 567 8901'
      }
    ];
  }

  /**
   * Mock pharmacy data for fallback
   */
  static getMockPharmacies() {
    return [
      {
        id: '1',
        name: 'Alpha Pharmacy',
        image: '/images/alpha-pharmacy.jpg',
        logo: '/images/alpha-logo.png',
        categories: ['Prescription', 'Pain Relief', 'Vitamins'],
        rating: 4.9,
        distance: '0.3 km',
        deliveryTime: '10-20 mins',
        deliveryFee: '₦150',
        isOpen: true,
        is24Hours: true,
        hasPharmacist: true,
        description: '24/7 pharmacy with licensed pharmacist',
        featured: true,
        type: 'pharmacy',
        address: 'Oke Ilewo, Abeokuta',
        phone: '+234 803 123 4567'
      },
      {
        id: '2',
        name: 'MedPlus Pharmacy',
        image: '/images/medplus-pharmacy.jpg',
        categories: ['Prescription', 'Baby Care', 'Personal Care'],
        rating: 4.7,
        distance: '0.7 km',
        deliveryTime: '15-25 mins',
        deliveryFee: '₦200',
        isOpen: true,
        is24Hours: false,
        hasPharmacist: true,
        description: 'Trusted pharmacy with baby and personal care',
        featured: true,
        type: 'pharmacy',
        address: 'Kuto Road, Abeokuta',
        phone: '+234 803 234 5678'
      },
      {
        id: '3',
        name: 'HealthPlus Pharmacy',
        image: '/images/healthplus-pharmacy.jpg',
        logo: '/images/healthplus-logo.png',
        categories: ['Prescription', 'Health Devices', 'First Aid'],
        rating: 4.8,
        distance: '1.1 km',
        deliveryTime: '20-30 mins',
        deliveryFee: '₦250',
        isOpen: true,
        is24Hours: false,
        hasPharmacist: true,
        description: 'Complete health solutions and medical devices',
        featured: false,
        type: 'pharmacy',
        address: 'Ibara Road, Abeokuta',
        phone: '+234 803 345 6789'
      },
      {
        id: '4',
        name: 'Remedy Pharmacy',
        image: '/images/remedy-pharmacy.jpg',
        categories: ['Pain Relief', 'Vitamins', 'Personal Care'],
        rating: 4.5,
        distance: '0.9 km',
        deliveryTime: '15-25 mins',
        deliveryFee: '₦200',
        isOpen: true,
        is24Hours: false,
        hasPharmacist: false,
        description: 'Affordable medicines and health products',
        featured: false,
        type: 'pharmacy',
        address: 'Adatan Area, Abeokuta',
        phone: '+234 803 456 7890'
      },
      {
        id: '5',
        name: 'CareFirst Pharmacy',
        image: '/images/carefirst-pharmacy.jpg',
        categories: ['Prescription', 'First Aid', 'Baby Care'],
        rating: 4.6,
        distance: '1.5 km',
        deliveryTime: '25-35 mins',
        deliveryFee: '₦300',
        isOpen: false,
        is24Hours: false,
        hasPharmacist: true,
        description: 'Family pharmacy - Opens 8 AM daily',
        featured: false,
        type: 'pharmacy',
        address: 'Lantoro Road, Abeokuta',
        phone: '+234 803 567 8901'
      }
    ];
  }
}
