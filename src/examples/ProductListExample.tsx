import React, { useState } from 'react';
import { ProductList } from '../components/ProductList';
import { ProductSearchFilters, V2Product, V2Addon } from '../types/product';
import { Search, Filter, Grid, List } from 'lucide-react';

/**
 * Example usage of the V2 ProductList component
 * Demonstrates filtering, searching, and cart integration
 */
export function ProductListExample() {
  const [vendorId] = useState('demo-vendor-123');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<ProductSearchFilters>({
    searchTerm: '',
    category: '',
    measurementType: '',
    isAvailable: true
  });

  // Mock cart functionality
  const handleAddToCart = async (
    product: V2Product, 
    selectedAddons: V2Addon[], 
    quantity: number
  ) => {
    console.log('Adding to cart:', {
      product: product.name,
      addons: selectedAddons.map(a => a.name),
      quantity,
      totalPrice: (product.price + selectedAddons.reduce((sum, addon) => sum + addon.price, 0)) * quantity
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Show success message
    alert(`Added ${product.name} to cart! 🛒`);
  };

  const categories = [
    'All Categories',
    'Main Dishes',
    'Appetizers', 
    'Desserts',
    'Beverages',
    'Snacks'
  ];

  const measurementTypes = [
    'All Types',
    'unit',
    'portion', 
    'bundle',
    'weight'
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Restaurant Menu
        </h1>
        <p className="text-gray-600">
          Browse our delicious V2 products with enhanced features
        </p>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              value={filters.searchTerm || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            />
          </div>

          {/* Category Filter */}
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            value={filters.category || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
          >
            {categories.map(category => (
              <option key={category} value={category === 'All Categories' ? '' : category}>
                {category}
              </option>
            ))}
          </select>

          {/* Measurement Type Filter */}
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            value={filters.measurementType || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, measurementType: e.target.value || undefined }))}
          >
            {measurementTypes.map(type => (
              <option key={type} value={type === 'All Types' ? '' : type}>
                {type === 'All Types' ? type : `${type} items`}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.isAvailable !== false}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                isAvailable: e.target.checked ? undefined : false 
              }))}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Show available items only</span>
          </label>
        </div>
      </div>

      {/* Products Grid/List */}
      <ProductList
        vendorId={vendorId}
        category={filters.category}
        searchTerm={filters.searchTerm}
        measurementType={filters.measurementType}
        onAddToCart={handleAddToCart}
        className={viewMode === 'list' ? 'grid-cols-1 lg:grid-cols-2' : ''}
      />

      {/* Usage Instructions */}
      <div className="mt-12 bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          🚀 V2 Product System Features
        </h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li>✅ <strong>Real-time Updates:</strong> Products update automatically via Firestore listeners</li>
          <li>✅ <strong>Advanced Filtering:</strong> Filter by category, measurement type, availability, and search</li>
          <li>✅ <strong>Enhanced Addons:</strong> Rich addon system with images and categories</li>
          <li>✅ <strong>Premium UI:</strong> Beautiful cards with hover effects and animations</li>
          <li>✅ <strong>Type Safety:</strong> Full TypeScript support with proper interfaces</li>
          <li>✅ <strong>Error Handling:</strong> Graceful error boundaries and loading states</li>
          <li>✅ <strong>Mobile Responsive:</strong> Works perfectly on all device sizes</li>
        </ul>
      </div>
    </div>
  );
}