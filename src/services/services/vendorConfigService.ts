import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { VendorConfig, DeliveryFeeCalculation } from '../types/vendor';

export class VendorConfigService {
  /**
   * Get vendor configuration
   */
  static async getVendorConfig(vendorId: string): Promise<VendorConfig | null> {
    try {
      const configRef = doc(db, 'vendors', vendorId, 'config', 'settings');
      const configDoc = await getDoc(configRef);
      
      if (!configDoc.exists()) {
        return null;
      }

      return {
        vendorId,
        ...configDoc.data(),
        createdAt: configDoc.data().createdAt.toDate(),
        updatedAt: configDoc.data().updatedAt.toDate()
      } as VendorConfig;
    } catch (error) {
      console.error('Error fetching vendor config:', error);
      throw error;
    }
  }

  /**
   * Create or update vendor configuration
   */
  static async setVendorConfig(vendorId: string, config: Omit<VendorConfig, 'vendorId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const configRef = doc(db, 'vendors', vendorId, 'config', 'settings');
      const existingConfig = await getDoc(configRef);
      
      const configData = {
        ...config,
        vendorId,
        updatedAt: Timestamp.now(),
        ...(existingConfig.exists() ? {} : { createdAt: Timestamp.now() })
      };

      await setDoc(configRef, configData, { merge: true });
    } catch (error) {
      console.error('Error setting vendor config:', error);
      throw error;
    }
  }

  /**
   * Update specific vendor configuration fields
   */
  static async updateVendorConfig(vendorId: string, updates: Partial<VendorConfig>): Promise<void> {
    try {
      const configRef = doc(db, 'vendors', vendorId, 'config', 'settings');
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      await updateDoc(configRef, updateData);
    } catch (error) {
      console.error('Error updating vendor config:', error);
      throw error;
    }
  }

  /**
   * Get default vendor configuration
   */
  static getDefaultConfig(): Omit<VendorConfig, 'vendorId' | 'createdAt' | 'updatedAt'> {
    return {
      baseFare: 50000, // ₦500 in kobo
      perKm: 10000, // ₦100 per km in kobo
      podFeePercent: 2, // 2% POD fee
      freeDeliveryThreshold: 1000000, // ₦10,000 in kobo
      deliveryAreas: ['Victoria Island', 'Ikeja', 'Lekki', 'Surulere'],
      avgDeliveryTime: 45 // 45 minutes
    };
  }

  /**
   * Calculate delivery fee based on vendor config
   */
  static async calculateDeliveryFee(
    vendorId: string, 
    orderAmount: number, 
    distanceKm: number = 5, // Default 5km
    isPOD: boolean = false
  ): Promise<DeliveryFeeCalculation> {
    try {
      let config = await this.getVendorConfig(vendorId);
      
      // Use default config if vendor config doesn't exist
      if (!config) {
        const defaultConfig = this.getDefaultConfig();
        config = {
          vendorId,
          ...defaultConfig,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      const baseFare = config.baseFare;
      const distanceFee = Math.round(distanceKm * config.perKm);
      const subtotal = baseFare + distanceFee;
      
      // Calculate POD fee
      const podFee = isPOD ? Math.round((orderAmount * config.podFeePercent) / 100) : 0;
      
      // Check for free delivery
      const isFreeDelivery = orderAmount >= config.freeDeliveryThreshold;
      const totalFee = isFreeDelivery ? podFee : subtotal + podFee;

      return {
        baseFare,
        distanceFee,
        podFee,
        totalFee,
        isFreeDelivery,
        freeDeliveryThreshold: config.freeDeliveryThreshold
      };
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      throw error;
    }
  }

  /**
   * Calculate delivery fee with custom parameters (for testing)
   */
  static calculateDeliveryFeeWithConfig(
    config: VendorConfig,
    orderAmount: number,
    distanceKm: number = 5,
    isPOD: boolean = false
  ): DeliveryFeeCalculation {
    const baseFare = config.baseFare;
    const distanceFee = Math.round(distanceKm * config.perKm);
    const subtotal = baseFare + distanceFee;
    
    // Calculate POD fee
    const podFee = isPOD ? Math.round((orderAmount * config.podFeePercent) / 100) : 0;
    
    // Check for free delivery
    const isFreeDelivery = orderAmount >= config.freeDeliveryThreshold;
    const totalFee = isFreeDelivery ? podFee : subtotal + podFee;

    return {
      baseFare,
      distanceFee,
      podFee,
      totalFee,
      isFreeDelivery,
      freeDeliveryThreshold: config.freeDeliveryThreshold
    };
  }

  /**
   * Get estimated delivery time
   */
  static async getEstimatedDeliveryTime(vendorId: string): Promise<number> {
    try {
      const config = await this.getVendorConfig(vendorId);
      return config?.avgDeliveryTime || 45; // Default 45 minutes
    } catch (error) {
      console.error('Error getting delivery time:', error);
      return 45; // Default fallback
    }
  }

  /**
   * Check if area is served by vendor
   */
  static async isAreaServed(vendorId: string, area: string): Promise<boolean> {
    try {
      const config = await this.getVendorConfig(vendorId);
      return config?.deliveryAreas.includes(area) || false;
    } catch (error) {
      console.error('Error checking delivery area:', error);
      return false;
    }
  }
}
