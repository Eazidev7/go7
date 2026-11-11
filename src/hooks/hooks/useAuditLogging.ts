import { useState, useCallback } from 'react';
import { AuditLogService } from '../services/auditLogService';
import { CustomerEventService } from '../services/customerEventService';
import { AuditLog, CustomerEvent, AuditLogQuery, CustomerEventQuery } from '../types/audit';

/**
 * Custom hook for audit logging operations
 */
export const useAuditLogging = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product audit methods
  const logProductCreated = useCallback(async (
    actorUid: string,
    vendorId: string,
    productId: string,
    productData: any
  ) => {
    try {
      setLoading(true);
      setError(null);
      await AuditLogService.logProductCreated(actorUid, vendorId, productId, productData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log product creation';
      setError(errorMessage);
      console.error('Audit logging error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logProductUpdated = useCallback(async (
    actorUid: string,
    vendorId: string,
    productId: string,
    beforeData: any,
    afterData: any
  ) => {
    try {
      setLoading(true);
      setError(null);
      await AuditLogService.logProductUpdated(actorUid, vendorId, productId, beforeData, afterData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log product update';
      setError(errorMessage);
      console.error('Audit logging error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logProductPriceChanged = useCallback(async (
    actorUid: string,
    vendorId: string,
    productId: string,
    oldPrice: number,
    newPrice: number
  ) => {
    try {
      setLoading(true);
      setError(null);
      await AuditLogService.logProductPriceChanged(actorUid, vendorId, productId, oldPrice, newPrice);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log price change';
      setError(errorMessage);
      console.error('Audit logging error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logProductDeleted = useCallback(async (
    actorUid: string,
    vendorId: string,
    productId: string,
    productData: any
  ) => {
    try {
      setLoading(true);
      setError(null);
      await AuditLogService.logProductDeleted(actorUid, vendorId, productId, productData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log product deletion';
      setError(errorMessage);
      console.error('Audit logging error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Order audit methods
  const logOrderEvent = useCallback(async (
    actorUid: string,
    vendorId: string,
    orderId: string,
    eventType: string,
    beforeData?: any,
    afterData?: any
  ) => {
    try {
      setLoading(true);
      setError(null);
      await AuditLogService.logOrderEvent(actorUid, vendorId, orderId, eventType, beforeData, afterData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log order event';
      setError(errorMessage);
      console.error('Audit logging error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Coupon audit methods
  const logCouponEvent = useCallback(async (
    actorUid: string,
    vendorId: string,
    couponId: string,
    eventType: string,
    beforeData?: any,
    afterData?: any
  ) => {
    try {
      setLoading(true);
      setError(null);
      await AuditLogService.logCouponEvent(actorUid, vendorId, couponId, eventType, beforeData, afterData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log coupon event';
      setError(errorMessage);
      console.error('Audit logging error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Config audit methods
  const logConfigUpdate = useCallback(async (
    actorUid: string,
    vendorId: string,
    configType: string,
    beforeData?: any,
    afterData?: any
  ) => {
    try {
      setLoading(true);
      setError(null);
      await AuditLogService.logConfigUpdate(actorUid, vendorId, configType, beforeData, afterData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log config update';
      setError(errorMessage);
      console.error('Audit logging error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    logProductCreated,
    logProductUpdated,
    logProductPriceChanged,
    logProductDeleted,
    logOrderEvent,
    logCouponEvent,
    logConfigUpdate,
    clearError: () => setError(null)
  };
};

/**
 * Custom hook for querying audit logs
 */
export const useAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryLogs = useCallback(async (queryParams: AuditLogQuery) => {
    try {
      setLoading(true);
      setError(null);
      const auditLogs = await AuditLogService.queryLogs(queryParams);
      setLogs(auditLogs);
      return auditLogs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to query audit logs';
      setError(errorMessage);
      console.error('Audit query error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getLogsByVendor = useCallback(async (vendorId: string, limit?: number) => {
    return queryLogs({ vendorId, limit });
  }, [queryLogs]);

  const getLogsByResource = useCallback(async (vendorId: string, resourceId: string, limit?: number) => {
    return queryLogs({ vendorId, resourceId, limit });
  }, [queryLogs]);

  const getLogsByType = useCallback(async (vendorId: string, type: string, limit?: number) => {
    return queryLogs({ vendorId, type, limit });
  }, [queryLogs]);

  const getLogsByDateRange = useCallback(async (
    vendorId: string,
    startDate: Date,
    endDate: Date,
    limit?: number
  ) => {
    return queryLogs({ vendorId, startDate, endDate, limit });
  }, [queryLogs]);

  return {
    logs,
    loading,
    error,
    queryLogs,
    getLogsByVendor,
    getLogsByResource,
    getLogsByType,
    getLogsByDateRange,
    clearError: () => setError(null)
  };
};

/**
 * Custom hook for customer events
 */
export const useCustomerEvents = () => {
  const [events, setEvents] = useState<CustomerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryEvents = useCallback(async (queryParams: CustomerEventQuery) => {
    try {
      setLoading(true);
      setError(null);
      const customerEvents = await CustomerEventService.queryEvents(queryParams);
      setEvents(customerEvents);
      return customerEvents;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to query customer events';
      setError(errorMessage);
      console.error('Customer events query error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrderTimeline = useCallback(async (orderId: string) => {
    return queryEvents({ orderId, visibleOnly: true });
  }, [queryEvents]);

  const getAllOrderEvents = useCallback(async (orderId: string) => {
    return queryEvents({ orderId });
  }, [queryEvents]);

  const getDeliveryEvents = useCallback(async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      const deliveryEvents = await CustomerEventService.getDeliveryEvents(orderId);
      setEvents(deliveryEvents);
      return deliveryEvents;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get delivery events';
      setError(errorMessage);
      console.error('Delivery events error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getPaymentEvents = useCallback(async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      const paymentEvents = await CustomerEventService.getPaymentEvents(orderId);
      setEvents(paymentEvents);
      return paymentEvents;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get payment events';
      setError(errorMessage);
      console.error('Payment events error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Customer event logging methods
  const logOrderPlaced = useCallback(async (orderId: string, orderData: any) => {
    try {
      setLoading(true);
      setError(null);
      await CustomerEventService.logOrderPlaced(orderId, orderData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log order placed';
      setError(errorMessage);
      console.error('Customer event error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logRiderAssigned = useCallback(async (
    orderId: string,
    riderId: string,
    riderName: string,
    riderPhone: string,
    eta?: number
  ) => {
    try {
      setLoading(true);
      setError(null);
      await CustomerEventService.logRiderAssigned(orderId, riderId, riderName, riderPhone, eta);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log rider assignment';
      setError(errorMessage);
      console.error('Customer event error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logOrderDelivered = useCallback(async (
    orderId: string,
    riderId: string,
    riderName: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      await CustomerEventService.logDelivered(orderId, riderId, riderName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log order delivery';
      setError(errorMessage);
      console.error('Customer event error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    events,
    loading,
    error,
    queryEvents,
    getOrderTimeline,
    getAllOrderEvents,
    getDeliveryEvents,
    getPaymentEvents,
    logOrderPlaced,
    logRiderAssigned,
    logOrderDelivered,
    clearError: () => setError(null)
  };
};

/**
 * Combined hook for both audit logging and customer events
 */
export const useOrderTracking = (orderId?: string) => {
  const auditLogging = useAuditLogging();
  const auditLogs = useAuditLogs();
  const customerEvents = useCustomerEvents();

  const refreshOrderData = useCallback(async () => {
    if (!orderId) return;

    try {
      // Load both audit logs and customer events
      await Promise.all([
        auditLogs.getLogsByResource('', orderId), // Will need vendorId
        customerEvents.getOrderTimeline(orderId)
      ]);
    } catch (error) {
      console.error('Error refreshing order data:', error);
    }
  }, [orderId, auditLogs, customerEvents]);

  return {
    auditLogging,
    auditLogs,
    customerEvents,
    refreshOrderData,
    loading: auditLogging.loading || auditLogs.loading || customerEvents.loading,
    error: auditLogging.error || auditLogs.error || customerEvents.error
  };
};
