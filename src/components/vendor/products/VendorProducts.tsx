import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { useVendor } from '../../../contexts/VendorContext';
import { ProductService } from '../../../services/productService';
import { CategoryService } from '../../../services/categoryService';
import { Product } from '../../../types/marketplace';
import { VendorCategory } from '../../../types/models';
import ImportFromUrl from './ImportFromUrl';

// Custom debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface VendorProductsProps {
  onEditProduct?: (product: Product) => void;
  onAddProduct?: () => void;
}

interface ProductFilters {
  searchTerm: string;
  debouncedSearchTerm: string;
  category: string;
  availability: 'all' | 'available' | 'unavailable';
}

interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

const VendorProducts: React.FC<VendorProductsProps> = ({
  onEditProduct,
  onAddProduct
}) => {
  const navigate = useNavigate();
  const { currentVendor, vendorId } = useVendor();
  const [user] = useAuthState(getAuth());
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({
    searchTerm: '',
    debouncedSearchTerm: '',
    category: '',
    availability: 'all'
  });
  
  // Selection state for bulk actions
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Debounced search term
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);
  
  // Update debounced search term in filters
  useEffect(() => {
    setFilters(prev => ({ ...prev, debouncedSearchTerm }));
  }, [debouncedSearchTerm]);
  
  // Pagination state
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });
  
  // UI state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({ isOpen: false, product: null });
  
  // Bulk action modals
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [bulkCategoryModal, setBulkCategoryModal] = useState<{
    isOpen: boolean;
    selectedCategory: string;
  }>({ isOpen: false, selectedCategory: '' });
  
  // Import modal
  const [importModal, setImportModal] = useState(false);
  
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'title' | 'price' | 'updatedAt' | 'createdAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Categories (you might want to fetch these from a service)
  // Fetch categories from CategoryService
  const fetchCategories = useCallback(async () => {
    if (!vendorId) return;
    
    try {
      const fetchedCategories = await CategoryService.getVendorCategories(vendorId);
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to empty array on error
      setCategories([]);
    }
  }, [vendorId]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!vendorId) return;
    
    try {
      setLoading(true);
      // Fetch all products without server-side sorting since we do client-side sorting
      const fetchedProducts = await ProductService.listProducts(vendorId, {
        limit: 1000 // Fetch a large number for client-side filtering/sorting
      });
      
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  // Filter products with debounced search
  const applyFilters = useCallback(() => {
    let filtered = [...products];

    // Debounced search filter
    if (filters.debouncedSearchTerm) {
      const searchLower = filters.debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchLower) ||
        product.desc?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Availability filter
    if (filters.availability !== 'all') {
      const isAvailable = filters.availability === 'available';
      filtered = filtered.filter(product => product.available === isAvailable);
    }

    // Client-side sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'updatedAt':
          // Use createdAt as fallback since updatedAt may not exist yet
          aValue = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 
                  a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 
                  b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredProducts(filtered);
    setPagination(prev => ({
      ...prev,
      totalItems: filtered.length,
      currentPage: 1 // Reset to first page when filters change
    }));
  }, [products, filters.debouncedSearchTerm, filters.category, filters.availability, sortBy, sortOrder]);

  // Get paginated products
  const getPaginatedProducts = useCallback(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, pagination]);

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Selection handlers
  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allIds = getPaginatedProducts().map(p => p.id);
      setSelectedProducts(new Set(allIds));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
    setSelectAll(false);
  };

  // Bulk action handlers with Firestore batching (max 500 per batch)
  const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const handleBulkToggleAvailability = async (makeAvailable: boolean) => {
    if (!vendorId || selectedProducts.size === 0) return;

    try {
      setBulkActionLoading(true);
      const selectedProductsList = Array.from(selectedProducts);
      const chunks = chunkArray(selectedProductsList, 500);

      for (const chunk of chunks) {
        const promises = chunk.map(productId => 
          ProductService.toggleAvailability(vendorId, productId, makeAvailable)
        );
        await Promise.all(promises);
      }

      // Update local state
      setProducts(prev =>
        prev.map(p =>
          selectedProducts.has(p.id) ? { ...p, available: makeAvailable } : p
        )
      );

      toast.success(
        `${selectedProducts.size} products ${makeAvailable ? 'enabled' : 'disabled'} successfully`
      );
      clearSelection();
    } catch (error) {
      console.error('Error in bulk availability toggle:', error);
      toast.error('Failed to update product availability');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!vendorId || !user || selectedProducts.size === 0) return;

    try {
      setBulkActionLoading(true);
      const selectedProductsList = Array.from(selectedProducts);
      const chunks = chunkArray(selectedProductsList, 500);

      for (const chunk of chunks) {
        const promises = chunk.map(productId => 
          ProductService.deleteProduct(vendorId, productId, user.uid)
        );
        await Promise.all(promises);
      }

      // Update local state
      setProducts(prev => prev.filter(p => !selectedProducts.has(p.id)));

      toast.success(`${selectedProducts.size} products deleted successfully`);
      clearSelection();
      setBulkDeleteModal(false);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast.error('Failed to delete products');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkAssignCategory = async () => {
    if (!vendorId || !user || selectedProducts.size === 0 || !bulkCategoryModal.selectedCategory) return;

    try {
      setBulkActionLoading(true);
      const selectedProductsList = Array.from(selectedProducts);
      const chunks = chunkArray(selectedProductsList, 500);

      for (const chunk of chunks) {
        const promises = chunk.map(productId => 
          ProductService.updateProduct(vendorId, productId, {
            category: bulkCategoryModal.selectedCategory
          }, user.uid)
        );
        await Promise.all(promises);
      }

      // Update local state
      setProducts(prev =>
        prev.map(p =>
          selectedProducts.has(p.id) 
            ? { ...p, category: bulkCategoryModal.selectedCategory } 
            : p
        )
      );

      toast.success(
        `${selectedProducts.size} products assigned to category successfully`
      );
      clearSelection();
      setBulkCategoryModal({ isOpen: false, selectedCategory: '' });
    } catch (error) {
      console.error('Error in bulk category assignment:', error);
      toast.error('Failed to assign category');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Handlers
  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  };

  const handleCategoryFilter = (category: string) => {
    setFilters(prev => ({ ...prev, category }));
  };

  const handleAvailabilityFilter = (availability: ProductFilters['availability']) => {
    setFilters(prev => ({ ...prev, availability }));
  };

  const handleToggleAvailability = async (product: Product) => {
    if (!vendorId) return;
    
    try {
      await ProductService.toggleAvailability(
        vendorId,
        product.id,
        !product.available
      );
      
      // Update local state
      setProducts(prev =>
        prev.map(p =>
          p.id === product.id ? { ...p, available: !p.available } : p
        )
      );
      
      toast.success(
        `Product ${!product.available ? 'enabled' : 'disabled'} successfully`
      );
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to update product availability');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!vendorId || !user) return;
    
    try {
      await ProductService.deleteProduct(
        vendorId,
        product.id,
        user.uid
      );
      
      // Update local state
      setProducts(prev => prev.filter(p => p.id !== product.id));
      
      toast.success('Product deleted successfully');
      setDeleteModal({ isOpen: false, product: null });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (field === sortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  // Import handlers
  const handleImportSuccess = (product: Product) => {
    setProducts(prev => [product, ...prev]);
    toast.success('Product imported successfully!');
  };

  // Format currency
  const formatPrice = (price: number) => {
    return `₦${(price / 100).toLocaleString()}`;
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate pagination info
  const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);
  const paginatedProducts = getPaginatedProducts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your product catalog
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setImportModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Import from URL
          </button>
          <button
            onClick={onAddProduct}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <label htmlFor="product-search" className="sr-only">Search products</label>
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="product-search"
              type="text"
              placeholder="Search products..."
              value={filters.searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleSearch('');
                  e.currentTarget.blur();
                }
              }}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              aria-describedby="search-help"
            />
            <div id="search-help" className="sr-only">
              Search by product name or description. Press Escape to clear.
            </div>
            {filters.searchTerm && filters.searchTerm !== filters.debouncedSearchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={filters.availability}
            onChange={(e) => handleAvailabilityFilter(e.target.value as ProductFilters['availability'])}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="all">All Products</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'table'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-l-0 border ${
                viewMode === 'grid'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Grid
            </button>
          </div>
        </div>

        {/* Results Count and Clear Filters */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {paginatedProducts.length} of {pagination.totalItems} products
            {filters.debouncedSearchTerm && (
              <span className="ml-2 text-blue-600">
                • Filtered by "{filters.debouncedSearchTerm}"
              </span>
            )}
            {filters.category && (
              <span className="ml-2 text-blue-600">
                • Category: {filters.category}
              </span>
            )}
            {filters.availability !== 'all' && (
              <span className="ml-2 text-blue-600">
                • {filters.availability === 'available' ? 'Available only' : 'Unavailable only'}
              </span>
            )}
          </div>
          {(filters.debouncedSearchTerm || filters.category || filters.availability !== 'all') && (
            <button
              onClick={() => setFilters({
                searchTerm: '',
                debouncedSearchTerm: '',
                category: '',
                availability: 'all'
              })}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedProducts.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button
                  disabled={bulkActionLoading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  Toggle Availability
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => handleBulkToggleAvailability(true)}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                          >
                            <CheckCircleIcon className="w-4 h-4 mr-3 text-green-500" />
                            Make Available
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => handleBulkToggleAvailability(false)}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                          >
                            <XCircleIcon className="w-4 h-4 mr-3" style={{ color: '#E1251B' }} />
                            Make Unavailable
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>

              <button
                onClick={() => setBulkCategoryModal({ isOpen: true, selectedCategory: '' })}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Assign Category
              </button>

              <button
                onClick={() => setBulkDeleteModal(true)}
                disabled={bulkActionLoading}
                aria-label="Delete selected products"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                style={{ 
                  backgroundColor: '#E1251B',
                  borderColor: '#E1251B'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C41E17'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E1251B'}
                onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px rgba(225, 37, 27, 0.5)'}
                onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                {bulkActionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table/Grid */}
      {viewMode === 'table' ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Title
                      {sortBy === 'title' && (
                        sortOrder === 'asc' ? 
                          <ChevronUpIcon className="w-4 h-4 ml-1" /> :
                          <ChevronDownIcon className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center">
                      Price
                      {sortBy === 'price' && (
                        sortOrder === 'asc' ? 
                          <ChevronUpIcon className="w-4 h-4 ml-1" /> :
                          <ChevronDownIcon className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center">
                      Updated
                      {sortBy === 'updatedAt' && (
                        sortOrder === 'asc' ? 
                          <ChevronUpIcon className="w-4 h-4 ml-1" /> :
                          <ChevronDownIcon className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {product.imageUrl ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={product.imageUrl}
                              alt={product.title}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <PhotoIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.category}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAvailability(product)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          product.available
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {product.available ? (
                          <>
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Available
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="w-3 h-3 mr-1" />
                            Unavailable
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.stock || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate((product as any).updatedAt || product.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button 
                          className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded"
                          aria-label={`Actions for ${product.title}`}
                        >
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </Menu.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => onEditProduct?.(product)}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <PencilIcon className="w-4 h-4 mr-3" />
                                    Edit
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleToggleAvailability(product)}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    {product.available ? (
                                      <>
                                        <XCircleIcon className="w-4 h-4 mr-3" />
                                        Disable
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircleIcon className="w-4 h-4 mr-3" />
                                        Enable
                                      </>
                                    )}
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => setDeleteModal({ isOpen: true, product })}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } flex items-center w-full px-4 py-2 text-sm text-red-700`}
                                  >
                                    <TrashIcon className="w-4 h-4 mr-3" />
                                    Delete
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-w-16 aspect-h-9">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {product.title}
                    </h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                  <Menu as="div" className="relative">
                    <Menu.Button 
                      className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded p-1"
                      aria-label={`Actions for ${product.title}`}
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => onEditProduct?.(product)}
                                className={`${
                                  active ? 'bg-gray-100' : ''
                                } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                              >
                                <PencilIcon className="w-4 h-4 mr-3" />
                                Edit
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => handleToggleAvailability(product)}
                                className={`${
                                  active ? 'bg-gray-100' : ''
                                } flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                              >
                                {product.available ? (
                                  <>
                                    <XCircleIcon className="w-4 h-4 mr-3" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <CheckCircleIcon className="w-4 h-4 mr-3" />
                                    Enable
                                  </>
                                )}
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, product })}
                                className={`${
                                  active ? 'bg-gray-100' : ''
                                } flex items-center w-full px-4 py-2 text-sm text-red-700`}
                              >
                                <TrashIcon className="w-4 h-4 mr-3" />
                                Delete
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleAvailability(product)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      product.available
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {product.available ? (
                      <>
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Available
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="w-3 h-3 mr-1" />
                        Unavailable
                      </>
                    )}
                  </button>
                  <span className="text-sm text-gray-500">
                    Stock: {product.stock || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(
                    pagination.currentPage * pagination.itemsPerPage,
                    pagination.totalItems
                  )}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalItems}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    const current = pagination.currentPage;
                    return page === 1 || page === totalPages || 
                           (page >= current - 1 && page <= current + 1);
                  })
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Transition appear show={deleteModal.isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setDeleteModal({ isOpen: false, product: null })}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Delete Product
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete "{deleteModal.product?.title}"? 
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                      style={{ 
                        backgroundColor: '#E1251B',
                        borderColor: '#E1251B'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C41E17'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E1251B'}
                      onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px rgba(225, 37, 27, 0.5)'}
                      onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                      onClick={() => deleteModal.product && handleDeleteProduct(deleteModal.product)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={() => setDeleteModal({ isOpen: false, product: null })}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Empty State */}
      {!loading && paginatedProducts.length === 0 && (
        <div className="text-center py-12">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.searchTerm || filters.category || filters.availability !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by adding your first product.'}
          </p>
          {(!filters.searchTerm && !filters.category && filters.availability === 'all') && (
            <div className="mt-6">
              <button
                onClick={onAddProduct}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Product
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      <Transition appear show={bulkDeleteModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setBulkDeleteModal(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Delete Products
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete {selectedProducts.size} selected product{selectedProducts.size > 1 ? 's' : ''}? This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleBulkDelete}
                      disabled={bulkActionLoading}
                    >
                      {bulkActionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={() => setBulkDeleteModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Bulk Category Assignment Modal */}
      <Transition appear show={bulkCategoryModal.isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setBulkCategoryModal({ isOpen: false, selectedCategory: '' })}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Assign Category
                    </Dialog.Title>
                    <button
                      onClick={() => setBulkCategoryModal({ isOpen: false, selectedCategory: '' })}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-gray-500 mb-4">
                      Select a category to assign to {selectedProducts.size} selected product{selectedProducts.size > 1 ? 's' : ''}:
                    </p>
                    
                    <select
                      value={bulkCategoryModal.selectedCategory}
                      onChange={(e) => setBulkCategoryModal(prev => ({ 
                        ...prev, 
                        selectedCategory: e.target.value 
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a category...</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-6 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setBulkCategoryModal({ isOpen: false, selectedCategory: '' })}
                      className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkAssignCategory}
                      disabled={bulkActionLoading || !bulkCategoryModal.selectedCategory}
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bulkActionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Assigning...
                        </>
                      ) : (
                        'Assign Category'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Import from URL Modal */}
      <ImportFromUrl
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default VendorProducts;