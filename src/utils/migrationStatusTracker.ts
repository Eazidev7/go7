/**
 * Migration Status Tracker
 * 
 * Tracks V1 to V2 migration progress with resumable operations
 */

import { 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

export interface MigrationStatus {
  id: string;
  timestamp: Timestamp;
  status: 'started' | 'in-progress' | 'completed' | 'failed' | 'paused';
  totalVendors: number;
  processedVendors: number;
  totalProducts: number;
  migratedProducts: number;
  failedProducts: number;
  errors: MigrationError[];
  progress: {
    percentage: number;
    currentVendor?: string;
    currentVendorName?: string;
    estimatedTimeRemaining?: number;
  };
  performance: {
    startTime: Timestamp;
    endTime?: Timestamp;
    duration?: number; // in seconds
    productsPerSecond?: number;
  };
  resumeData?: {
    lastProcessedVendorId: string;
    lastProcessedProductId: string;
    checkpoint: any;
  };
}

export interface MigrationError {
  vendorId: string;
  productId?: string;
  error: string;
  timestamp: Timestamp;
  severity: 'warning' | 'error' | 'critical';
}

export interface VendorMigrationResult {
  vendorId: string;
  vendorName: string;
  totalProducts: number;
  migratedProducts: number;
  failedProducts: number;
  errors: string[];
  duration: number; // in seconds
}

export class MigrationStatusTracker {
  private migrationId: string;
  private statusRef: any;
  private updateInterval: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();
  private processedCount: number = 0;
  private totalCount: number = 0;

  constructor(migrationId?: string) {
    this.migrationId = migrationId || `migration_${Date.now()}`;
    this.statusRef = doc(db, 'operations', 'migrations', this.migrationId);
  }

  /**
   * Initialize migration tracking
   */
  async initializeMigration(totalVendors: number, totalProducts: number): Promise<void> {
    const initialStatus: MigrationStatus = {
      id: this.migrationId,
      timestamp: serverTimestamp() as Timestamp,
      status: 'started',
      totalVendors,
      processedVendors: 0,
      totalProducts,
      migratedProducts: 0,
      failedProducts: 0,
      errors: [],
      progress: {
        percentage: 0
      },
      performance: {
        startTime: serverTimestamp() as Timestamp
      }
    };

    await setDoc(this.statusRef, initialStatus);
    this.totalCount = totalProducts;
    
    console.log(`📊 Migration tracking initialized: ${this.migrationId}`);
    console.log(`   Total vendors: ${totalVendors}`);
    console.log(`   Total products: ${totalProducts}`);
  }

  /**
   * Update migration progress
   */
  async updateProgress(data: Partial<MigrationStatus>): Promise<void> {
    try {
      await updateDoc(this.statusRef, {
        ...data,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to update migration progress:', error);
    }
  }

  /**
   * Record vendor processing start
   */
  async startVendorProcessing(vendorId: string, vendorName: string): Promise<void> {
    await this.updateProgress({
      status: 'in-progress',
      progress: {
        percentage: Math.round((this.processedCount / this.totalCount) * 100),
        currentVendor: vendorId,
        currentVendorName: vendorName,
        estimatedTimeRemaining: this.calculateETA()
      }
    });

    console.log(`🏪 Processing vendor: ${vendorName} (${vendorId})`);
  }

  /**
   * Record vendor processing completion
   */
  async completeVendorProcessing(result: VendorMigrationResult): Promise<void> {
    this.processedCount += result.migratedProducts;

    await this.updateProgress({
      processedVendors: (await this.getCurrentStatus())?.processedVendors + 1 || 1,
      migratedProducts: (await this.getCurrentStatus())?.migratedProducts + result.migratedProducts || result.migratedProducts,
      failedProducts: (await this.getCurrentStatus())?.failedProducts + result.failedProducts || result.failedProducts,
      progress: {
        percentage: Math.round((this.processedCount / this.totalCount) * 100),
        estimatedTimeRemaining: this.calculateETA()
      }
    });

    console.log(`✅ Completed vendor: ${result.vendorName}`);
    console.log(`   Migrated: ${result.migratedProducts}/${result.totalProducts} products`);
    console.log(`   Duration: ${result.duration}s`);
  }

  /**
   * Record migration error
   */
  async recordError(vendorId: string, productId: string | undefined, error: string, severity: 'warning' | 'error' | 'critical' = 'error'): Promise<void> {
    const migrationError: MigrationError = {
      vendorId,
      productId,
      error,
      timestamp: serverTimestamp() as Timestamp,
      severity
    };

    const currentStatus = await this.getCurrentStatus();
    if (currentStatus) {
      const updatedErrors = [...(currentStatus.errors || []), migrationError];
      
      await this.updateProgress({
        errors: updatedErrors
      });
    }

    console.error(`❌ Migration error (${severity}):`, error);
    console.error(`   Vendor: ${vendorId}`);
    if (productId) console.error(`   Product: ${productId}`);
  }

  /**
   * Save checkpoint for resumable migration
   */
  async saveCheckpoint(vendorId: string, productId: string, checkpointData: any): Promise<void> {
    await this.updateProgress({
      resumeData: {
        lastProcessedVendorId: vendorId,
        lastProcessedProductId: productId,
        checkpoint: checkpointData
      }
    });
  }

  /**
   * Complete migration
   */
  async completeMigration(success: boolean): Promise<void> {
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - this.startTime.getTime()) / 1000);
    const currentStatus = await this.getCurrentStatus();

    await this.updateProgress({
      status: success ? 'completed' : 'failed',
      performance: {
        startTime: currentStatus?.performance.startTime || serverTimestamp() as Timestamp,
        endTime: serverTimestamp() as Timestamp,
        duration,
        productsPerSecond: Math.round(this.processedCount / duration * 100) / 100
      },
      progress: {
        percentage: 100
      }
    });

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    console.log(`🎯 Migration ${success ? 'completed successfully' : 'failed'}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Products processed: ${this.processedCount}`);
    console.log(`   Rate: ${Math.round(this.processedCount / duration * 100) / 100} products/second`);
  }

  /**
   * Pause migration (for resumable operations)
   */
  async pauseMigration(reason?: string): Promise<void> {
    await this.updateProgress({
      status: 'paused'
    });

    if (reason) {
      await this.recordError('system', undefined, `Migration paused: ${reason}`, 'warning');
    }

    console.log('⏸️ Migration paused');
  }

  /**
   * Resume migration from checkpoint
   */
  async resumeMigration(): Promise<{ vendorId: string; productId: string; checkpoint: any } | null> {
    const currentStatus = await this.getCurrentStatus();
    
    if (currentStatus?.resumeData) {
      await this.updateProgress({
        status: 'in-progress'
      });

      console.log('▶️ Resuming migration from checkpoint');
      console.log(`   Last vendor: ${currentStatus.resumeData.lastProcessedVendorId}`);
      console.log(`   Last product: ${currentStatus.resumeData.lastProcessedProductId}`);

      return {
        vendorId: currentStatus.resumeData.lastProcessedVendorId,
        productId: currentStatus.resumeData.lastProcessedProductId,
        checkpoint: currentStatus.resumeData.checkpoint
      };
    }

    return null;
  }

  /**
   * Get current migration status
   */
  async getCurrentStatus(): Promise<MigrationStatus | null> {
    try {
      const doc = await getDoc(this.statusRef);
      return doc.exists() ? doc.data() as MigrationStatus : null;
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return null;
    }
  }

  /**
   * Listen to migration status changes
   */
  onStatusChange(callback: (status: MigrationStatus | null) => void): () => void {
    return onSnapshot(this.statusRef, (doc) => {
      callback(doc.exists() ? doc.data() as MigrationStatus : null);
    }, (error) => {
      console.error('Migration status listener error:', error);
      callback(null);
    });
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateETA(): number {
    if (this.processedCount === 0) return 0;
    
    const elapsed = (Date.now() - this.startTime.getTime()) / 1000;
    const rate = this.processedCount / elapsed;
    const remaining = this.totalCount - this.processedCount;
    
    return Math.round(remaining / rate);
  }

  /**
   * Get migration ID
   */
  getMigrationId(): string {
    return this.migrationId;
  }

  /**
   * Generate migration summary report
   */
  async generateSummaryReport(): Promise<string> {
    const status = await this.getCurrentStatus();
    if (!status) return 'Migration status not found';

    const report = `
=== MIGRATION SUMMARY REPORT ===
Migration ID: ${status.id}
Status: ${status.status.toUpperCase()}
Total Vendors: ${status.totalVendors}
Processed Vendors: ${status.processedVendors}
Total Products: ${status.totalProducts}
Migrated Products: ${status.migratedProducts}
Failed Products: ${status.failedProducts}
Success Rate: ${Math.round((status.migratedProducts / status.totalProducts) * 100)}%

Performance:
- Duration: ${status.performance.duration || 'N/A'}s
- Rate: ${status.performance.productsPerSecond || 'N/A'} products/second

Errors: ${status.errors?.length || 0}
${status.errors?.map(e => `- ${e.severity.toUpperCase()}: ${e.error}`).join('\n') || ''}

${status.status === 'paused' ? 'Migration can be resumed from checkpoint.' : ''}
=== END REPORT ===
`;

    return report;
  }
}

// Utility functions for migration management
export class MigrationManager {
  /**
   * List all migration records
   */
  static async listMigrations(): Promise<MigrationStatus[]> {
    const migrationsRef = collection(db, 'operations', 'migrations');
    const snapshot = await migrationsRef.get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MigrationStatus));
  }

  /**
   * Get latest migration status
   */
  static async getLatestMigration(): Promise<MigrationStatus | null> {
    const migrations = await this.listMigrations();
    if (migrations.length === 0) return null;
    
    return migrations.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)[0];
  }

  /**
   * Clean up old migration records (keep last 10)
   */
  static async cleanupOldMigrations(): Promise<void> {
    const migrations = await this.listMigrations();
    const sorted = migrations.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    
    // Keep last 10 migrations
    const toDelete = sorted.slice(10);
    
    for (const migration of toDelete) {
      const docRef = doc(db, 'operations', 'migrations', migration.id);
      await docRef.delete();
    }
    
    console.log(`🗑️ Cleaned up ${toDelete.length} old migration records`);
  }
}

export default MigrationStatusTracker;
