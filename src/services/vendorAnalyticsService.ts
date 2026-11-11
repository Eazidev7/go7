/**
 * 📊 VENDOR ANALYTICS SERVICE V2
 * 
 * Comprehensive analytics service for vendor performance tracking:
 * - Real-time metrics calculation
 * - Revenue and order analytics
 * - Customer behavior analysis
 * - Product performance tracking
 * - Trend analysis and forecasting
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc,
  onSnapshot,
  Timestamp,
  startAfter,
  endBefore
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subDays, format, startOfDay, endOfDay, parseISO } from 'date-fns';

export interface VendorAnalytics {
  vendorId: string;
  dateRange: string;
  overview: AnalyticsOverview;
  trends: AnalyticsTrends;
  insights: AnalyticsInsights;
  alerts: AnalyticsAlert[];
}

export interface AnalyticsOverview {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  customerCount: number;
  rating: number;
  reviewCount: number;
}

export interface AnalyticsTrends {
  revenueData: Array<{date: string; revenue: number; orders: number}>;
  productPerformance: Array<{name: string; orders: number; revenue: number}>;
  hourlyDistribution: Array<{hour: string; orders: number}>;
  categoryBreakdown: Array<{name: string; value: number; color: string}>;
}

export interface AnalyticsInsights {
  topProducts: Array<{id: string; name: string; orders: number; revenue: number}>;
  customerSegments: Array<{type: string; count: number; percentage: number}>;
  orderSources: Array<{source: string; count: number; percentage: number}>;
  deliveryAreas: Array<{area: string; orders: number; avgTime: number}>;
}

export interface AnalyticsAlert {
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
}

class VendorAnalyticsService {
  /**
   * Get comprehensive analytics for a vendor
   */
  async getVendorAnalytics(vendorId: string, dateRange: string = '7d'): Promise<VendorAnalytics> {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);
      
      // Fetch all required data in parallel
      const [
        overview,
        trends,
        insights,
        alerts
      ] = await Promise.all([
        this.getAnalyticsOverview(vendorId, startDate, endDate),
        this.getAnalyticsTrends(vendorId, startDate, endDate),
        this.getAnalyticsInsights(vendorId, startDate, endDate),
        this.getAnalyticsAlerts(vendorId)
      ]);

      return {
        vendorId,
        dateRange,
        overview,
        trends,
        insights,
        alerts
      };
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
      throw error;
    }
  }

  /**
   * Set up real-time analytics listener
   */
  setupAnalyticsListener(
    vendorId: string, 
    dateRange: string,
    callback: (analytics: VendorAnalytics | null, error?: Error) => void
  ): () => void {
    try {
      // Set up listener on orders collection for real-time updates
      const ordersQuery = query(
        collection(db, 'orders'),
        where('vendorId', '==', vendorId),
        where('status', 'in', ['delivered', 'completed']),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(ordersQuery, async (snapshot) => {
        try {
          // Recalculate analytics when orders change
          const analytics = await this.getVendorAnalytics(vendorId, dateRange);
          callback(analytics);
        } catch (error) {
          callback(null, error as Error);
        }
      });

      return unsubscribe;
    } catch (error) {
      callback(null, error as Error);
      return () => {};
    }
  }

  /**
   * Get analytics overview
   */
  private async getAnalyticsOverview(
    vendorId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<AnalyticsOverview> {
    try {
      // Fetch completed orders in date range
      const ordersQuery = query(
        collection(db, 'orders'),
        where('vendorId', '==', vendorId),
        where('status', 'in', ['delivered', 'completed']),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // Calculate metrics
      const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || order.amount || 0), 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get unique customers
      const uniqueCustomers = new Set(orders.map((order: any) => order.customerId || order.userId)).size;

      // Get vendor rating
      const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
      const vendorData = vendorDoc.data();
      const rating = vendorData?.rating || 0;
      const reviewCount = vendorData?.reviewCount || 0;

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        customerCount: uniqueCustomers,
        rating,
        reviewCount
      };
    } catch (error) {
      console.error('Error calculating analytics overview:', error);
      throw error;
    }
  }

  /**
   * Get analytics trends
   */
  private async getAnalyticsTrends(
    vendorId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<AnalyticsTrends> {
    try {
      // Fetch orders for trends
      const ordersQuery = query(
        collection(db, 'orders'),
        where('vendorId', '==', vendorId),
        where('status', 'in', ['delivered', 'completed']),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'asc')
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Generate revenue data by day
      const revenueData = this.generateDailyRevenue(orders, startDate, endDate);

      // Calculate product performance
      const productPerformance = await this.calculateProductPerformance(orders);

      // Calculate hourly distribution
      const hourlyDistribution = this.calculateHourlyDistribution(orders);

      // Calculate category breakdown
      const categoryBreakdown = await this.calculateCategoryBreakdown(vendorId, orders);

      return {
        revenueData,
        productPerformance,
        hourlyDistribution,
        categoryBreakdown
      };
    } catch (error) {
      console.error('Error calculating analytics trends:', error);
      throw error;
    }
  }

  /**
   * Get analytics insights
   */
  private async getAnalyticsInsights(
    vendorId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<AnalyticsInsights> {
    try {
      // Fetch orders for insights
      const ordersQuery = query(
        collection(db, 'orders'),
        where('vendorId', '==', vendorId),
        where('status', 'in', ['delivered', 'completed']),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate insights
      const topProducts = await this.getTopProducts(orders);
      const customerSegments = await this.getCustomerSegments(orders);
      const orderSources = this.getOrderSources(orders);
      const deliveryAreas = this.getDeliveryAreas(orders);

      return {
        topProducts,
        customerSegments,
        orderSources,
        deliveryAreas
      };
    } catch (error) {
      console.error('Error calculating analytics insights:', error);
      throw error;
    }
  }

  /**
   * Generate daily revenue data
   */
  private generateDailyRevenue(orders: any[], startDate: Date, endDate: Date) {
    const dailyData = new Map();
    
    // Initialize all days with zero
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      dailyData.set(dateKey, { date: dateKey, revenue: 0, orders: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate with actual data
    orders.forEach(order => {
      if (order.createdAt) {
        const dateKey = format(order.createdAt, 'yyyy-MM-dd');
        const existing = dailyData.get(dateKey) || { date: dateKey, revenue: 0, orders: 0 };
        existing.revenue += (order.total || order.amount || 0);
        existing.orders += 1;
        dailyData.set(dateKey, existing);
      }
    });

    return Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate product performance
   */
  private async calculateProductPerformance(orders: any[]) {
    const productStats = new Map();

    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const productId = item.productId || item.id;
          const productName = item.name || item.productName || 'Unknown Product';
          const quantity = item.quantity || 1;
          const price = item.price || item.total || 0;

          if (!productStats.has(productId)) {
            productStats.set(productId, {
              name: productName,
              orders: 0,
              revenue: 0
            });
          }

          const stats = productStats.get(productId);
          stats.orders += quantity;
          stats.revenue += (price * quantity);
        });
      }
    });

    return Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  /**
   * Calculate hourly distribution
   */
  private calculateHourlyDistribution(orders: any[]) {
    const hourlyStats = new Map();

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourlyStats.set(hourKey, { hour: hourKey, orders: 0 });
    }

    orders.forEach(order => {
      if (order.createdAt) {
        const hour = order.createdAt.getHours();
        const hourKey = `${hour.toString().padStart(2, '0')}:00`;
        const stats = hourlyStats.get(hourKey);
        if (stats) {
          stats.orders += 1;
        }
      }
    });

    return Array.from(hourlyStats.values());
  }

  /**
   * Calculate category breakdown
   */
  private async calculateCategoryBreakdown(vendorId: string, orders: any[]) {
    const categoryStats = new Map();
    const categoryColors = {
      food: '#3b82f6',
      beverages: '#10b981',
      snacks: '#f59e0b',
      grocery: '#8b5cf6',
      other: '#6b7280'
    };

    // Get vendor products to map categories
    const productsQuery = query(
      collection(db, 'vendors', vendorId, 'productsV2')
    );
    const productsSnapshot = await getDocs(productsQuery);
    const productCategories = new Map();
    
    productsSnapshot.docs.forEach(doc => {
      const product = doc.data();
      productCategories.set(doc.id, product.category || 'other');
    });

    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const productId = item.productId || item.id;
          const category = productCategories.get(productId) || 'other';
          const revenue = (item.price || 0) * (item.quantity || 1);

          if (!categoryStats.has(category)) {
            categoryStats.set(category, 0);
          }
          categoryStats.set(category, categoryStats.get(category) + revenue);
        });
      }
    });

    const total = Array.from(categoryStats.values()).reduce((sum, value) => sum + value, 0);
    
    return Array.from(categoryStats.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: total > 0 ? Math.round((value / total) * 100) : 0,
      color: categoryColors[name as keyof typeof categoryColors] || categoryColors.other
    }));
  }

  /**
   * Get top products
   */
  private async getTopProducts(orders: any[]) {
    const productPerformance = await this.calculateProductPerformance(orders);
    return productPerformance.slice(0, 5);
  }

  /**
   * Get customer segments
   */
  private async getCustomerSegments(orders: any[]) {
    const customerOrderCounts = new Map();
    
    orders.forEach(order => {
      const customerId = order.customerId || order.userId;
      if (customerId) {
        customerOrderCounts.set(customerId, (customerOrderCounts.get(customerId) || 0) + 1);
      }
    });

    const totalCustomers = customerOrderCounts.size;
    let newCustomers = 0;
    let returningCustomers = 0;
    let vipCustomers = 0;

    customerOrderCounts.forEach(orderCount => {
      if (orderCount === 1) {
        newCustomers++;
      } else if (orderCount >= 5) {
        vipCustomers++;
      } else {
        returningCustomers++;
      }
    });

    return [
      { 
        type: 'New Customers', 
        count: newCustomers, 
        percentage: totalCustomers > 0 ? Math.round((newCustomers / totalCustomers) * 100) : 0 
      },
      { 
        type: 'Returning', 
        count: returningCustomers, 
        percentage: totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0 
      },
      { 
        type: 'VIP', 
        count: vipCustomers, 
        percentage: totalCustomers > 0 ? Math.round((vipCustomers / totalCustomers) * 100) : 0 
      }
    ];
  }

  /**
   * Get order sources
   */
  private getOrderSources(orders: any[]) {
    const sources = new Map();
    const totalOrders = orders.length;

    orders.forEach(order => {
      const source = order.source || order.platform || 'Mobile App';
      sources.set(source, (sources.get(source) || 0) + 1);
    });

    return Array.from(sources.entries()).map(([source, count]) => ({
      source,
      count,
      percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
    }));
  }

  /**
   * Get delivery areas
   */
  private getDeliveryAreas(orders: any[]) {
    const areas = new Map();

    orders.forEach(order => {
      const area = order.deliveryArea || order.area || 'Unknown Area';
      const deliveryTime = order.deliveryTime || 30; // Default 30 minutes

      if (!areas.has(area)) {
        areas.set(area, { orders: 0, totalTime: 0 });
      }

      const areaStats = areas.get(area);
      areaStats.orders += 1;
      areaStats.totalTime += deliveryTime;
    });

    return Array.from(areas.entries()).map(([area, stats]) => ({
      area,
      orders: stats.orders,
      avgTime: Math.round(stats.totalTime / stats.orders)
    }));
  }

  /**
   * Get analytics alerts
   */
  private async getAnalyticsAlerts(vendorId: string): Promise<AnalyticsAlert[]> {
    const alerts: AnalyticsAlert[] = [];
    
    try {
      // Check for low stock items
      const productsQuery = query(
        collection(db, 'vendors', vendorId, 'productsV2'),
        where('stock', '<=', 5)
      );
      const lowStockSnapshot = await getDocs(productsQuery);
      
      if (!lowStockSnapshot.empty) {
        lowStockSnapshot.docs.forEach(doc => {
          const product = doc.data();
          alerts.push({
            type: 'warning',
            title: 'Low Stock Alert',
            message: `${product.name} is running low (${product.stock || 0} remaining)`,
            timestamp: new Date()
          });
        });
      }

      // Check for high demand periods
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 11 && hour <= 14) {
        alerts.push({
          type: 'info',
          title: 'Peak Hours',
          message: 'Lunch time - expect higher order volume',
          timestamp: new Date()
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error generating alerts:', error);
      return [];
    }
  }

  /**
   * Parse date range string to start and end dates
   */
  private parseDateRange(dateRange: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate: Date;

    switch (dateRange) {
      case '1d':
        startDate = startOfDay(endDate);
        break;
      case '7d':
        startDate = subDays(endDate, 7);
        break;
      case '30d':
        startDate = subDays(endDate, 30);
        break;
      case '90d':
        startDate = subDays(endDate, 90);
        break;
      default:
        startDate = subDays(endDate, 7);
    }

    return { startDate, endDate };
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    vendorId: string, 
    dateRange: string, 
    format: 'csv' | 'pdf'
  ): Promise<Blob> {
    const analytics = await this.getVendorAnalytics(vendorId, dateRange);
    
    if (format === 'csv') {
      return this.exportToCSV(analytics);
    } else {
      return this.exportToPDF(analytics);
    }
  }

  /**
   * Export to CSV
   */
  private exportToCSV(analytics: VendorAnalytics): Blob {
    const csvContent = [
      // Overview
      'VENDOR ANALYTICS OVERVIEW',
      `Vendor ID,${analytics.vendorId}`,
      `Date Range,${analytics.dateRange}`,
      `Total Revenue,${analytics.overview.totalRevenue}`,
      `Total Orders,${analytics.overview.totalOrders}`,
      `Average Order Value,${analytics.overview.averageOrderValue}`,
      `Customer Count,${analytics.overview.customerCount}`,
      '',
      // Revenue Data
      'DAILY REVENUE DATA',
      'Date,Revenue,Orders',
      ...analytics.trends.revenueData.map(item => 
        `${item.date},${item.revenue},${item.orders}`
      ),
      '',
      // Top Products
      'TOP PRODUCTS',
      'Product,Orders,Revenue',
      ...analytics.insights.topProducts.map(product => 
        `${product.name},${product.orders},${product.revenue}`
      )
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  }

  /**
   * Export to PDF (simplified - would use proper PDF library in production)
   */
  private exportToPDF(analytics: VendorAnalytics): Blob {
    // This would use a proper PDF library like jsPDF in production
    const content = `
      VENDOR ANALYTICS REPORT
      =======================
      
      Vendor ID: ${analytics.vendorId}
      Date Range: ${analytics.dateRange}
      
      OVERVIEW
      --------
      Total Revenue: ₦${analytics.overview.totalRevenue.toLocaleString()}
      Total Orders: ${analytics.overview.totalOrders}
      Average Order Value: ₦${analytics.overview.averageOrderValue.toLocaleString()}
      Customer Count: ${analytics.overview.customerCount}
      
      TOP PRODUCTS
      ------------
      ${analytics.insights.topProducts.map(product => 
        `${product.name}: ${product.orders} orders, ₦${product.revenue.toLocaleString()}`
      ).join('\n')}
    `;

    return new Blob([content], { type: 'application/pdf' });
  }
}

export const vendorAnalyticsService = new VendorAnalyticsService();
export default vendorAnalyticsService;