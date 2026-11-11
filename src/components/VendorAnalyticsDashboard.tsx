/**
 * 📊 ENHANCED VENDOR ANALYTICS DASHBOARD
 * 
 * Comprehensive analytics dashboard for vendors with:
 * - Real-time sales metrics
 * - Product performance tracking
 * - Customer insights
 * - Revenue analytics
 * - Order trends
 * - Inventory analytics
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Star,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Package,
  Clock,
  MapPin,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

interface VendorAnalyticsDashboardProps {
  vendorId: string;
  vendorName?: string;
}

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    customerCount: number;
    rating: number;
    reviewCount: number;
  };
  trends: {
    revenueData: Array<{date: string; revenue: number; orders: number}>;
    productPerformance: Array<{name: string; orders: number; revenue: number}>;
    hourlyDistribution: Array<{hour: string; orders: number}>;
    categoryBreakdown: Array<{name: string; value: number; color: string}>;
  };
  insights: {
    topProducts: Array<{id: string; name: string; orders: number; revenue: number}>;
    customerSegments: Array<{type: string; count: number; percentage: number}>;
    orderSources: Array<{source: string; count: number; percentage: number}>;
    deliveryAreas: Array<{area: string; orders: number; avgTime: number}>;
  };
  alerts: Array<{
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
  }>;
}

const VendorAnalyticsDashboard: React.FC<VendorAnalyticsDashboardProps> = ({ 
  vendorId, 
  vendorName = 'Vendor Dashboard' 
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
    
    // Set up real-time updates
    const interval = setInterval(loadAnalyticsData, 300000); // Update every 5 minutes
    
    return () => clearInterval(interval);
  }, [vendorId, dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setRefreshing(true);
      
      // Simulate API call - replace with actual service
      const data = await fetchVendorAnalytics(vendorId, dateRange);
      setAnalyticsData(data);
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportData = async (format: 'csv' | 'pdf') => {
    try {
      toast.loading('Exporting data...');
      
      // Implementation for data export
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate export
      
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Unable to load analytics data for this vendor.</p>
      </div>
    );
  }

  const { overview, trends, insights, alerts } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vendorName} Analytics</h1>
          <p className="text-sm text-gray-600">
            Comprehensive insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 3 Months</option>
          </select>
          
          {/* Export Buttons */}
          <button
            onClick={() => exportData('csv')}
            className="px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download className="h-4 w-4 inline mr-1" />
            CSV
          </button>
          
          <button
            onClick={() => exportData('pdf')}
            className="px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download className="h-4 w-4 inline mr-1" />
            PDF
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={loadAnalyticsData}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">Alerts & Notifications</h3>
          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert, index) => (
              <div key={index} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">{alert.title}</p>
                  <p className="text-xs text-yellow-700">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Total Revenue"
          value={`₦${overview.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
          trend={15.5}
          color="green"
        />
        <AnalyticsCard
          title="Total Orders"
          value={overview.totalOrders.toLocaleString()}
          icon={<ShoppingBag className="h-6 w-6" />}
          trend={8.2}
          color="blue"
        />
        <AnalyticsCard
          title="Avg Order Value"
          value={`₦${overview.averageOrderValue.toLocaleString()}`}
          icon={<TrendingUp className="h-6 w-6" />}
          trend={-2.1}
          color="purple"
        />
        <AnalyticsCard
          title="Customers"
          value={overview.customerCount.toLocaleString()}
          icon={<Users className="h-6 w-6" />}
          trend={12.3}
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends.revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`₦${value}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={trends.categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {trends.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Product Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends.productPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends.hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Table */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Product</th>
                  <th className="py-2">Orders</th>
                  <th className="py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {insights.topProducts.map((product, index) => (
                  <tr key={product.id} className="border-b">
                    <td className="py-2 font-medium">{product.name}</td>
                    <td className="py-2">{product.orders}</td>
                    <td className="py-2">₦{product.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Areas */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Areas</h3>
          <div className="space-y-3">
            {insights.deliveryAreas.map((area, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">{area.area}</span>
                </div>
                <div className="text-right text-sm">
                  <div>{area.orders} orders</div>
                  <div className="text-gray-600">{area.avgTime}min avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Insights */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Customer Segments</h4>
            <div className="space-y-2">
              {insights.customerSegments.map((segment, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{segment.type}</span>
                  <span className="font-medium">{segment.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Order Sources</h4>
            <div className="space-y-2">
              {insights.orderSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{source.source}</span>
                  <span className="font-medium">{source.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Rating Overview</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="font-medium">{overview.rating.toFixed(1)}</span>
                <span className="text-sm text-gray-600">
                  ({overview.reviewCount} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Analytics Card Component
const AnalyticsCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
  color: 'green' | 'blue' | 'purple' | 'orange';
}> = ({ title, value, icon, trend, color }) => {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border p-6"
    >
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`h-3 w-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </motion.div>
  );
};

// Mock data fetcher - replace with actual API call
const fetchVendorAnalytics = async (vendorId: string, dateRange: string): Promise<AnalyticsData> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    overview: {
      totalRevenue: 245600,
      totalOrders: 156,
      averageOrderValue: 1575,
      customerCount: 89,
      rating: 4.7,
      reviewCount: 42
    },
    trends: {
      revenueData: [
        { date: '2024-01-01', revenue: 12000, orders: 8 },
        { date: '2024-01-02', revenue: 15000, orders: 12 },
        { date: '2024-01-03', revenue: 18000, orders: 14 },
        { date: '2024-01-04', revenue: 22000, orders: 16 },
        { date: '2024-01-05', revenue: 19000, orders: 13 },
        { date: '2024-01-06', revenue: 25000, orders: 18 },
        { date: '2024-01-07', revenue: 28000, orders: 20 }
      ],
      productPerformance: [
        { name: 'Jollof Rice', orders: 45, revenue: 67500 },
        { name: 'Fried Rice', orders: 32, revenue: 48000 },
        { name: 'Chicken', orders: 28, revenue: 42000 },
        { name: 'Plantain', orders: 25, revenue: 25000 }
      ],
      hourlyDistribution: [
        { hour: '08:00', orders: 2 },
        { hour: '09:00', orders: 5 },
        { hour: '10:00', orders: 8 },
        { hour: '11:00', orders: 12 },
        { hour: '12:00', orders: 18 },
        { hour: '13:00', orders: 22 },
        { hour: '14:00', orders: 15 },
        { hour: '15:00', orders: 10 },
        { hour: '16:00', orders: 8 },
        { hour: '17:00', orders: 12 },
        { hour: '18:00', orders: 16 },
        { hour: '19:00', orders: 20 },
        { hour: '20:00', orders: 14 },
        { hour: '21:00', orders: 8 }
      ],
      categoryBreakdown: [
        { name: 'Food', value: 60, color: '#3b82f6' },
        { name: 'Beverages', value: 25, color: '#10b981' },
        { name: 'Snacks', value: 15, color: '#f59e0b' }
      ]
    },
    insights: {
      topProducts: [
        { id: '1', name: 'Jollof Rice Special', orders: 45, revenue: 67500 },
        { id: '2', name: 'Fried Rice Combo', orders: 32, revenue: 48000 },
        { id: '3', name: 'Grilled Chicken', orders: 28, revenue: 42000 },
        { id: '4', name: 'Fried Plantain', orders: 25, revenue: 25000 }
      ],
      customerSegments: [
        { type: 'New Customers', count: 23, percentage: 26 },
        { type: 'Returning', count: 45, percentage: 51 },
        { type: 'VIP', count: 21, percentage: 23 }
      ],
      orderSources: [
        { source: 'Mobile App', count: 89, percentage: 57 },
        { source: 'Website', count: 45, percentage: 29 },
        { source: 'Phone', count: 22, percentage: 14 }
      ],
      deliveryAreas: [
        { area: 'Abeokuta North', orders: 45, avgTime: 25 },
        { area: 'Abeokuta South', orders: 38, avgTime: 32 },
        { area: 'Odeda', orders: 28, avgTime: 45 },
        { area: 'Ewekoro', orders: 15, avgTime: 38 }
      ]
    },
    alerts: [
      {
        type: 'warning',
        title: 'Low Stock Alert',
        message: 'Jollof Rice ingredients running low',
        timestamp: new Date()
      },
      {
        type: 'info',
        title: 'Peak Hours',
        message: 'Lunch time orders are 30% higher today',
        timestamp: new Date()
      }
    ]
  };
};

export default VendorAnalyticsDashboard;