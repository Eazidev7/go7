import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  startAfter,
  Timestamp,
  DocumentSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuditLog, AuditLogType, AuditLogQuery } from '../types/audit';

export class AuditLogService {
  private static readonly COLLECTION_NAME = 'audit_logs';

  /**
   * Log an audit event
   */
  static async logEvent(auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
    try {
      const auditLog: Omit<AuditLog, 'id'> = {
        ...auditData,
        timestamp: new Date()
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...auditLog,
        timestamp: Timestamp.fromDate(auditLog.timestamp)
      });

      console.log('Audit log created:', docRef.id, auditLog.type);
      return docRef.id;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }

  /**
   * Log product creation
   */
  static async logProductCreated(
    actorUid: string,
    vendorId: string,
    productId: string,
    productData: any,
    actorName?: string
  ): Promise<void> {
    await this.logEvent({
      actorUid,
      actorName,
      actorType: 'vendor',
      vendorId,
      type: 'product_created',
      resourceType: 'product',
      resourceId: productId,
      after: productData,
      metadata: {
        productTitle: productData.title,
        category: productData.category,
        price: productData.price
      }
    });
  }

  /**
   * Log product update
   */
  static async logProductUpdated(
    actorUid: string,
    vendorId: string,
    productId: string,
    beforeData: any,
    afterData: any,
    actorName?: string
  ): Promise<void> {
    await this.logEvent({
      actorUid,
      actorName,
      actorType: 'vendor',
      vendorId,
      type: 'product_updated',
      resourceType: 'product',
      resourceId: productId,
      before: beforeData,
      after: afterData,
      metadata: {
        productTitle: afterData.title,
        changes: this.getChangedFields(beforeData, afterData)
      }
    });
  }

  /**
   * Log product price change
   */
  static async logProductPriceChanged(
    actorUid: string,
    vendorId: string,
    productId: string,
    productTitle: string,
    oldPrice: number,
    newPrice: number,
    actorName?: string
  ): Promise<void> {
    await this.logEvent({
      actorUid,
      actorName,
      actorType: 'vendor',
      vendorId,
      type: 'product_price_changed',
      resourceType: 'product',
      resourceId: productId,
      before: { price: oldPrice },
      after: { price: newPrice },
      metadata: {
        productTitle,
        priceChange: newPrice - oldPrice,
        percentageChange: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2)
      }
    });
  }

  /**
   * Log product deletion
   */
  static async logProductDeleted(
    actorUid: string,
    vendorId: string,
    productId: string,
    productData: any,
    actorName?: string
  ): Promise<void> {
    await this.logEvent({
      actorUid,
      actorName,
      actorType: 'vendor',
      vendorId,
      type: 'product_deleted',
      resourceType: 'product',
      resourceId: productId,
      before: productData,
      metadata: {
        productTitle: productData.title,
        category: productData.category,
        deletedPrice: productData.price
      }
    });
  }

  /**
   * Log coupon events
   */
  static async logCouponEvent(
    type: 'coupon_created' | 'coupon_updated' | 'coupon_deleted' | 'coupon_applied',
    actorUid: string,
    vendorId: string,
    couponId: string,
    couponData: any,
    actorName?: string,
    metadata?: any
  ): Promise<void> {
    await this.logEvent({
      actorUid,
      actorName,
      actorType: 'vendor',
      vendorId,
      type,
      resourceType: 'coupon',
      resourceId: couponId,
      after: couponData,
      metadata: {
        couponCode: couponData.code,
        couponType: couponData.type,
        couponValue: couponData.value,
        ...metadata
      }
    });
  }

  /**
   * Log order events
   */
  static async logOrderEvent(
    type: AuditLogType,
    actorUid: string,
    orderId: string,
    orderData: any,
    actorType: 'vendor' | 'admin' | 'system' = 'vendor',
    actorName?: string,
    metadata?: any
  ): Promise<void> {
    await this.logEvent({
      actorUid,
      actorName,
      actorType,
      vendorId: orderData.vendorId,
      type,
      resourceType: 'order',
      resourceId: orderId,
      after: orderData,
      metadata: {
        orderStatus: orderData.status,
        orderValue: orderData.subtotal,
        customerName: orderData.customer?.name,
        ...metadata
      }
    });
  }

  /**
   * Log vendor configuration changes
   */
  static async logConfigUpdate(
    actorUid: string,
    vendorId: string,
    beforeConfig: any,
    afterConfig: any,
    actorName?: string
  ): Promise<void> {
    await this.logEvent({
      actorUid,
      actorName,
      actorType: 'vendor',
      vendorId,
      type: 'config_updated',
      resourceType: 'config',
      resourceId: vendorId,
      before: beforeConfig,
      after: afterConfig,
      metadata: {
        changes: this.getChangedFields(beforeConfig, afterConfig)
      }
    });
  }

  /**
   * Query audit logs
   */
  static async queryLogs(queryParams: AuditLogQuery): Promise<AuditLog[]> {
    try {
      let q = query(collection(db, this.COLLECTION_NAME));

      // Add filters
      if (queryParams.vendorId) {
        q = query(q, where('vendorId', '==', queryParams.vendorId));
      }
      if (queryParams.actorUid) {
        q = query(q, where('actorUid', '==', queryParams.actorUid));
      }
      if (queryParams.type) {
        if (Array.isArray(queryParams.type)) {
          q = query(q, where('type', 'in', queryParams.type));
        } else {
          q = query(q, where('type', '==', queryParams.type));
        }
      }
      if (queryParams.resourceType) {
        q = query(q, where('resourceType', '==', queryParams.resourceType));
      }
      if (queryParams.resourceId) {
        q = query(q, where('resourceId', '==', queryParams.resourceId));
      }
      if (queryParams.startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(queryParams.startDate)));
      }
      if (queryParams.endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(queryParams.endDate)));
      }

      // Add ordering and limit
      q = query(q, orderBy('timestamp', 'desc'));
      if (queryParams.limit) {
        q = query(q, firestoreLimit(queryParams.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as AuditLog[];
    } catch (error) {
      console.error('Error querying audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getResourceLogs(resourceType: string, resourceId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.queryLogs({
      resourceType,
      resourceId,
      limit
    });
  }

  /**
   * Get audit logs for a vendor
   */
  static async getVendorLogs(vendorId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.queryLogs({
      vendorId,
      limit
    });
  }

  /**
   * Get recent audit logs
   */
  static async getRecentLogs(limit: number = 50): Promise<AuditLog[]> {
    return this.queryLogs({ limit });
  }

  /**
   * Get audit logs by type
   */
  static async getLogsByType(type: AuditLogType | AuditLogType[], limit: number = 50): Promise<AuditLog[]> {
    return this.queryLogs({
      type,
      limit
    });
  }

  /**
   * Get audit logs for date range
   */
  static async getLogsByDateRange(
    startDate: Date, 
    endDate: Date, 
    vendorId?: string, 
    limit: number = 100
  ): Promise<AuditLog[]> {
    return this.queryLogs({
      startDate,
      endDate,
      vendorId,
      limit
    });
  }

  /**
   * Helper method to get changed fields between two objects
   */
  private static getChangedFields(before: any, after: any): string[] {
    const changes: string[] = [];
    
    if (!before || !after) return changes;

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes.push(key);
      }
    }
    
    return changes;
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(vendorId?: string, days: number = 30): Promise<{
    totalLogs: number;
    logsByType: Record<string, number>;
    logsByDay: Record<string, number>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await this.queryLogs({
        vendorId,
        startDate,
        limit: 1000
      });

      const logsByType: Record<string, number> = {};
      const logsByDay: Record<string, number> = {};

      logs.forEach(log => {
        // Count by type
        logsByType[log.type] = (logsByType[log.type] || 0) + 1;

        // Count by day
        const day = log.timestamp.toISOString().split('T')[0];
        logsByDay[day] = (logsByDay[day] || 0) + 1;
      });

      return {
        totalLogs: logs.length,
        logsByType,
        logsByDay
      };
    } catch (error) {
      console.error('Error getting audit stats:', error);
      throw error;
    }
  }
}
