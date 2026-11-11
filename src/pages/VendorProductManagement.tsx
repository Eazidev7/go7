import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/solid';
import ProductForm from '../components/products/ProductForm';
import { ToastContainer, useToasts } from '../components/addons/ToastNotifications';
import productService, { Product } from '../services/productServiceNew';

interface VendorProductManagementProps {
  vendorId?: string;
}

const VendorProductManagement: React.FC<VendorProductManagementProps> = ({ 
  vendorId = 'current-vendor-id' // Default for demo
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filter, setFilter] = useState<'all' | 'food' | 'market'>('all');
  
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToasts();

  useEffect(() => {
    fetchProducts();
  }, [vendorId]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      console.log('🍽️ Fetching products for vendor:', vendorId);
      
      const vendorProducts = await productService.getVendorProducts(vendorId);
      setProducts(vendorProducts);
      console.log('✅ Products loaded:', vendorProducts.length);
      
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      showError('Load Failed', 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProduct = async (productData: any) => {
    try {
      if (editingProduct) {
        // Update existing product
        await productService.updateProduct(editingProduct.id!, productData);
        showSuccess('Updated', 'Product updated successfully');
      } else {
        // Create new product
        const newProduct = await productService.createProduct({
          ...productData,
          vendorId
        });
        showSuccess('Created', 'Product created successfully');
      }
      
      await fetchProducts(); // Refresh the list
      setShowForm(false);
      setEditingProduct(null);
      
    } catch (error) {
      console.error('❌ Error saving product:', error);
      showError('Save Failed', 'Failed to save product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productService.toggleProductStatus(vendorId, productId, false);
      showSuccess('Deleted', 'Product removed successfully');
      await fetchProducts();
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      showError('Delete Failed', 'Failed to delete product');
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: boolean) => {
    try {
      await productService.toggleProductStatus(vendorId, productId, !currentStatus);
      showSuccess('Updated', `Product ${!currentStatus ? 'activated' : 'deactivated'}`);
      await fetchProducts();
    } catch (error) {
      console.error('❌ Error toggling product status:', error);
      showError('Update Failed', 'Failed to update product status');
    }
  };

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    return product.productType === filter;
  });

  const getProductTypeIcon = (type: 'food' | 'market') => {
    return type === 'food' ? '🍽️' : '🛒';
  };

  const getProductTypeColor = (type: 'food' | 'market') => {
    return type === 'food' 
      ? 'from-orange-100 to-red-100 border-orange-200' 
      : 'from-blue-100 to-cyan-100 border-blue-200';
  };

  if (showForm) {
    return (
      <ProductForm
        onSave={handleSaveProduct}
        onCancel={() => {
          setShowForm(false);
          setEditingProduct(null);
        }}
        initialData={editingProduct}
        vendorId={vendorId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600 mt-1">
              Manage your food items and market products with add-ons and variants
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Product
          </motion.button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="text-3xl">📦</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Food Items</p>
                <p className="text-2xl font-bold text-orange-600">
                  {products.filter(p => p.productType === 'food').length}
                </p>
              </div>
              <div className="text-3xl">🍽️</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Market Items</p>
                <p className="text-2xl font-bold text-blue-600">
                  {products.filter(p => p.productType === 'market').length}
                </p>
              </div>
              <div className="text-3xl">🛒</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-green-600">
                  {products.reduce((sum, p) => sum + (p.orderCount || 0), 0)}
                </p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'all', label: 'All Products', count: products.length },
            { key: 'food', label: '🍽️ Food Items', count: products.filter(p => p.productType === 'food').length },
            { key: 'market', label: '🛒 Market Items', count: products.filter(p => p.productType === 'market').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                filter === tab.key
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-1 rounded-full text-xs ${
                filter === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-md animate-pulse">
                <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              {filter === 'food' ? '🍽️' : filter === 'market' ? '🛒' : '📦'}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No {filter === 'all' ? '' : filter} products yet
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'food' 
                ? 'Add your first food item with delicious add-ons'
                : filter === 'market'
                ? 'Add your first market item with different variants'
                : 'Start building your product catalog'
              }
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-gradient-to-r ${getProductTypeColor(product.productType)} rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border ${!product.active ? 'opacity-60' : ''}`}
                >
                  {/* Product Image */}
                  <div className="relative mb-4">
                    <div className="h-48 rounded-xl overflow-hidden bg-white">
                      <img
                        src={product.imageUrl || `/api/placeholder/300/200?text=${encodeURIComponent(product.name)}`}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `/api/placeholder/300/200?text=${encodeURIComponent(product.name)}`;
                        }}
                      />
                    </div>
                    
                    {/* Product Type Badge */}
                    <div className="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full flex items-center gap-1">
                      <span className="text-lg">{getProductTypeIcon(product.productType)}</span>
                      <span className="text-sm font-medium capitalize">{product.productType}</span>
                    </div>

                    {/* Status Badge */}
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-medium ${
                      product.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">{product.name}</h3>
                    <p className="text-gray-700 text-sm mb-3 line-clamp-2">{product.desc}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-gray-900">₦{product.basePrice.toLocaleString()}</span>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>📦 {product.orderCount || 0} orders</span>
                      </div>
                    </div>
                  </div>

                  {/* Add-ons/Variants Info */}
                  <div className="mb-4">
                    {product.productType === 'food' && product.addons && product.addons.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <span className="text-lg">✨</span>
                        <span>{product.addons.length} add-ons available</span>
                      </div>
                    )}
                    {product.productType === 'market' && product.variants && product.variants.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <span className="text-lg">📋</span>
                        <span>{product.variants.length} variants available</span>
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      Category: <span className="font-medium">{product.category}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="flex-1 bg-white/80 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(product.id!, product.active)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        product.active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {product.active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id!)}
                      className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-200 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default VendorProductManagement;