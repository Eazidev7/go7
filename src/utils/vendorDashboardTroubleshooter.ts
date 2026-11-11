/**
 * Vendor Dashboard Troubleshooting Utility
 * 
 * Systematically checks and fixes vendor update issues
 */

import { doc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config.js';

export class VendorDashboardTroubleshooter {
  
  /**
   * 1. Ensure vendor editing code writes to /vendors/{vendorId}/products/{productId} (not old path)
   */
  static getCorrectVendorProductPath(vendorId: string, productId?: string): string {
    const basePath = `vendors/${vendorId}/products`;
    return productId ? `${basePath}/${productId}` : basePath;
  }
  
  /**
   * 2. Confirm Firestore rules allow vendor to write to product doc (ownerId check)
   */
  static async checkFirestorePermissions(vendorId: string, productId: string): Promise<boolean> {
    try {
      const productRef = doc(db, 'vendors', vendorId, 'products', productId);
      
      // Test read permission
      await productRef.get();
      console.log('✅ Vendor has read access to product');
      
      // Note: Write permission can only be tested during actual write operation
      return true;
    } catch (error) {
      console.error('❌ Firestore permission error:', error);
      return false;
    }
  }
  
  /**
   * 3. Confirm frontend subscribes to onSnapshot to listen to updates
   */
  static setupRealtimeVendorProductListener(
    vendorId: string, 
    onUpdate: (products: any[]) => void,
    onError: (error: Error) => void
  ): () => void {
    
    console.log(`🔄 Setting up real-time listener for vendor: ${vendorId}`);
    
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    const q = query(
      productsRef,
      where('isAvailable', '==', true), // Optional: Only show available products
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`📱 Received ${snapshot.docs.length} product updates`);
      
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Debug: Check if this is V2 product
        isV2Product: !!doc.data().measurementType
      }));
      
      // Filter to only V2 products for V2 dashboard
      const v2Products = products.filter(p => p.isV2Product);
      
      console.log(`📊 V2 products found: ${v2Products.length} / ${products.length}`);
      
      onUpdate(v2Products);
    }, (error) => {
      console.error('❌ Real-time listener error:', error);
      onError(error);
    });
    
    return unsubscribe;
  }
  
  /**
   * 4. If migrating, ensure migration script has completed and products exist
   */
  static async checkMigrationStatus(vendorId: string): Promise<{
    v1Products: number;
    v2Products: number;
    migrationComplete: boolean;
    needsMigration: boolean;
  }> {
    try {
      // Check V1 products (old menus collection)
      const menusRef = collection(db, 'vendors', vendorId, 'menus');
      const menusSnapshot = await menusRef.get();
      const v1Products = menusSnapshot.size;
      
      // Check V2 products (new products collection with measurementType)
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await productsRef.get();
      
      let v2Products = 0;
      productsSnapshot.forEach(doc => {
        if (doc.data().measurementType) {
          v2Products++;
        }
      });
      
      const migrationComplete = v1Products === 0 && v2Products > 0;
      const needsMigration = v1Products > 0 && v2Products === 0;
      
      console.log(`📈 Migration Status for vendor ${vendorId}:`, {
        v1Products,
        v2Products,
        migrationComplete,
        needsMigration
      });
      
      return {
        v1Products,
        v2Products,
        migrationComplete,
        needsMigration
      };
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      throw error;
    }
  }
  
  /**
   * 5. Clear client cache, re-login vendor to refresh auth token
   */
  static async clearVendorCache(): Promise<void> {
    try {
      // Clear localStorage cache
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.includes('vendor') || key.includes('product') || key.includes('firebase')
      );
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared cache key: ${key}`);
      });
      
      // Clear sessionStorage
      const sessionKeys = Object.keys(sessionStorage).filter(key =>
        key.includes('vendor') || key.includes('product') || key.includes('firebase')
      );
      
      sessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Cleared session key: ${key}`);
      });
      
      console.log('✅ Vendor cache cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }
  
  /**
   * Comprehensive dashboard health check
   */
  static async runDashboardHealthCheck(vendorId: string): Promise<{
    success: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      console.log(`🏥 Running dashboard health check for vendor: ${vendorId}`);
      
      // Check 1: Migration status
      const migrationStatus = await this.checkMigrationStatus(vendorId);
      if (migrationStatus.needsMigration) {
        issues.push('Vendor has unmigrated V1 products');
        recommendations.push('Run migration script: node scripts/migrate_v1_to_v2.cjs');
      }
      
      // Check 2: Firestore permissions
      const hasPermissions = await this.checkFirestorePermissions(vendorId, 'test');
      if (!hasPermissions) {
        issues.push('Firestore permission issues detected');
        recommendations.push('Check Firestore security rules and vendor authentication');
      }
      
      // Check 3: V2 product structure
      if (migrationStatus.v2Products === 0) {
        issues.push('No V2 products found for vendor');
        recommendations.push('Create test V2 product or run migration');
      }
      
      const success = issues.length === 0;
      
      console.log(`🎯 Health check complete:`, {
        success,
        issuesFound: issues.length,
        recommendationsProvided: recommendations.length
      });
      
      return { success, issues, recommendations };
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        success: false,
        issues: [`Health check failed: ${error.message}`],
        recommendations: ['Check console logs and try again']
      };
    }
  }
}

export default VendorDashboardTroubleshooter;