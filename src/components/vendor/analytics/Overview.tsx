import React, { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  CubeIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  PlusCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { useVendor } from '../../../contexts/VendorContext';
import { ProductService } from '../../../services/productService';
import { Product } from '../../../types/marketplace';

interface AnalyticsCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
}

interface CategoryData {
  name: string;
  count: number;
  percentage: number;
}

interface PriceDistribution {
  range: string;
  count: number;
  percentage: number;
}

const Overview: React.FC = () => {
  const { vendorId } = useVendor();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all products for analysis
  useEffect(() => {
    const fetchProducts = async () => {
      if (!vendorId) return;

      try {
        setLoading(true);
        const fetchedProducts = await ProductService.listProducts(vendorId, {
          limit: 1000 // Fetch all products for accurate analytics
        });
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error fetching products for analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [vendorId]);

  // Calculate analytics metrics using client-side aggregation
  const analytics = useMemo(() => {
    if (products.length === 0) {
      return {
        totalProducts: 0,
        availablePercentage: 0,
        averagePrice: 0,
        last7dCreations: 0,
        categoryData: [],
        priceDistribution: []
      };
    }

    // Basic metrics
    const totalProducts = products.length;
    const availableProducts = products.filter(p => p.available).length;
    const availablePercentage = totalProducts > 0 ? (availableProducts / totalProducts) * 100 : 0;
    
    // Average price calculation
    const totalPrice = products.reduce((sum, p) => sum + (p.price || 0), 0);
    const averagePrice = totalProducts > 0 ? totalPrice / totalProducts : 0;

    // Last 7 days creations
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7dCreations = products.filter(p => {
      const createdDate = new Date(p.createdAt);
      return createdDate >= sevenDaysAgo;
    }).length;

    // Category distribution
    const categoryMap = new Map<string, number>();
    products.forEach(p => {
      const category = p.category || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const categoryData: CategoryData[] = Array.from(categoryMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalProducts) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 categories

    // Price distribution
    const priceRanges = [
      { range: '₦0 - ₦1,000', min: 0, max: 100000 },
      { range: '₦1,000 - ₦5,000', min: 100000, max: 500000 },
      { range: '₦5,000 - ₦10,000', min: 500000, max: 1000000 },
      { range: '₦10,000 - ₦25,000', min: 1000000, max: 2500000 },
      { range: '₦25,000 - ₦50,000', min: 2500000, max: 5000000 },
      { range: '₦50,000+', min: 5000000, max: Infinity }
    ];

    const priceDistribution: PriceDistribution[] = priceRanges.map(range => {
      const count = products.filter(p => 
        p.price >= range.min && p.price < range.max
      ).length;
      return {
        range: range.range,
        count,
        percentage: totalProducts > 0 ? (count / totalProducts) * 100 : 0
      };
    }).filter(range => range.count > 0);

    return {
      totalProducts,
      availablePercentage,
      averagePrice,
      last7dCreations,
      categoryData,
      priceDistribution
    };
  }, [products]);

  // Format currency
  const formatPrice = (price: number) => {
    return `₦${(price / 100).toLocaleString()}`;
  };

  // Analytics cards configuration
  const cards: AnalyticsCard[] = [
    {
      title: 'Total Products',
      value: analytics.totalProducts,
      subtitle: 'In your catalog',
      icon: CubeIcon,
      color: 'blue'
    },
    {
      title: 'Available Products',
      value: `${analytics.availablePercentage.toFixed(1)}%`,
      subtitle: `${products.filter(p => p.available).length} of ${analytics.totalProducts}`,
      icon: CheckCircleIcon,
      color: 'green'
    },
    {
      title: 'Average Price',
      value: formatPrice(analytics.averagePrice),
      subtitle: 'Across all products',
      icon: CurrencyDollarIcon,
      color: 'yellow'
    },
    {
      title: 'New This Week',
      value: analytics.last7dCreations,
      subtitle: 'Last 7 days',
      icon: PlusCircleIcon,
      color: 'purple'
    }
  ];

  const getCardColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 text-blue-600 bg-blue-50',
      green: 'bg-green-500 text-green-600 bg-green-50',
      yellow: 'bg-yellow-500 text-yellow-600 bg-yellow-50',
      purple: 'bg-purple-500 text-purple-600 bg-purple-50'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading analytics data">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="sr-only">Loading analytics data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
        <p className="text-sm text-gray-600 mt-1">
          Insights about your product catalog and performance
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const colorClasses = getCardColorClasses(card.color).split(' ');
          const iconBg = colorClasses[0];
          const textColor = colorClasses[1];
          const cardBg = colorClasses[2];
          
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`flex items-center justify-center h-12 w-12 rounded-lg ${iconBg}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{card.title}</h3>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                    {card.trend && (
                      <div className={`ml-2 flex items-center text-sm ${
                        card.trend.isPositive ? 'text-green-600' : ''
                      }`}
                      style={!card.trend.isPositive ? { color: '#E1251B' } : {}}
                      >
                        {card.trend.isPositive ? (
                          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                        )}
                        {Math.abs(card.trend.value)}%
                      </div>
                    )}
                  </div>
                  {card.subtitle && (
                    <p className="text-sm text-gray-500">{card.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Analytics Charts">
        {/* Products per Category Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" aria-hidden="true" />
            <h3 className="text-lg font-medium text-gray-900">Products by Category</h3>
          </div>
          
          {analytics.categoryData.length > 0 ? (
            <div className="space-y-3">
              {analytics.categoryData.map((category, index) => (
                <div key={category.name} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {category.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {category.count} ({category.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-blue-${500 + (index % 3) * 100}`}
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No category data</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add some products to see category distribution.
              </p>
            </div>
          )}
        </div>

        {/* Price Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Price Distribution</h3>
          </div>
          
          {analytics.priceDistribution.length > 0 ? (
            <div className="space-y-3">
              {analytics.priceDistribution.map((range, index) => (
                <div key={range.range} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {range.range}
                      </span>
                      <span className="text-sm text-gray-500">
                        {range.count} ({range.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-green-${400 + (index % 3) * 100}`}
                        style={{ width: `${range.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No price data</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add some products to see price distribution.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Additional Insights */}
      {analytics.totalProducts > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900">Most Popular Category</h4>
              <p className="text-lg font-semibold text-blue-800">
                {analytics.categoryData[0]?.name || 'N/A'}
              </p>
              <p className="text-xs text-blue-600">
                {analytics.categoryData[0]?.count || 0} products
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900">Catalog Health</h4>
              <p className="text-lg font-semibold text-green-800">
                {analytics.availablePercentage >= 80 ? 'Excellent' : 
                 analytics.availablePercentage >= 60 ? 'Good' : 
                 analytics.availablePercentage >= 40 ? 'Fair' : 'Needs Attention'}
              </p>
              <p className="text-xs text-green-600">
                {analytics.availablePercentage.toFixed(1)}% available
              </p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-purple-900">Recent Activity</h4>
              <p className="text-lg font-semibold text-purple-800">
                {analytics.last7dCreations > 0 ? 'Active' : 'Quiet'}
              </p>
              <p className="text-xs text-purple-600">
                {analytics.last7dCreations} new this week
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {analytics.totalProducts === 0 && (
        <div className="text-center py-12">
          <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first product to see analytics.
          </p>
        </div>
      )}
    </div>
  );
};

export default Overview;