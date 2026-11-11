// 🚀 GO7 VENDORS EXPLORE PAGE — V2 Product System (Nov 2025)
// Display all vendors with product-based filtering and live updates

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, RefreshCw } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import VendorCard from '../components/VendorCard';
import {
  isVendorPubliclyVisible,
  toVendorListingInfo,
  vendorMatchesCategory,
} from '../utils/vendorVisibility';
import './VendorsExplore.css';

// V2 Product-based categories
const categories = [
  { id: 'all', label: '⚡ All', value: null },
  { id: 'restaurant', label: '🍔 Restaurants', value: 'restaurant' },
  { id: 'groceries', label: '🥬 Groceries', value: 'groceries' },
  { id: 'errands', label: '🚴 Errands', value: 'errands' },
  { id: 'pharmacy', label: '💊 Pharmacy', value: 'pharmacy' },
  { id: 'shops', label: '🛍️ Shops', value: 'shops' },
];

// Cache management for V2 vendor-product data
const CACHE_KEY = 'go7_explore_vendors_v10';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export default function VendorsExplore() {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [vendorsWithProducts, setVendorsWithProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 0,
    maxDistance: 100,
    priceRange: 'all',
    onlineOnly: false,
  });

  // V2 Product System: Fetch vendors with their products
  const fetchVendorsWithProducts = async (useCache = true) => {
    try {
      setError(null);

      // Check cache first
      if (useCache) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setVendorsWithProducts(data);
            setLastUpdated(new Date(timestamp));
            setLoading(false);
            return;
          }
        }
      }

      setLoading(true);

      // Fetch vendors visible on marketplace (active + has menu)
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      
      const vendorsWithProductData = await Promise.all(
        vendorsSnapshot.docs.map(async (vendorDoc) => {
          const vendor = toVendorListingInfo(vendorDoc);
          const productsSnapshot = await getDocs(
            collection(db, 'vendors', vendor.id, 'products')
          );

          const products = productsSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (p) =>
                p.isActive !== false &&
                p.isAvailable !== false &&
                p.available !== false
            );

          const visible = isVendorPubliclyVisible(vendor, vendor.id);

          if (!visible) {
            return null;
          }

          return {
            ...vendor,
            products,
            productCount: products.length,
            hasProducts: products.length > 0,
          };
        })
      );

      const activeVendors = vendorsWithProductData
        .filter(Boolean)
        .filter((vendor) => vendor.hasProducts && vendor.productCount > 0);

      setVendorsWithProducts(activeVendors);
      
      // Cache the results
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: activeVendors,
        timestamp: Date.now()
      }));
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching vendors with products:', err);
      setError('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load and live updates
  useEffect(() => {
    fetchVendorsWithProducts();

    // Set up live updates for vendors collection
    const unsubscribe = onSnapshot(collection(db, 'vendors'), () => {
      fetchVendorsWithProducts(false);
    }, (error) => {
      console.error('Live update error:', error);
    });

    return () => unsubscribe();
  }, []);

  // Manual refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchVendorsWithProducts(false);
  };

  // Apply client-side filters and search
  const filteredVendors = useMemo(() => {
    let filtered = [...vendorsWithProducts];

    // Category filter
    if (activeCategory !== 'all') {
      const categoryValue = categories.find((c) => c.id === activeCategory)?.value;
      if (categoryValue) {
        filtered = filtered.filter((v) => vendorMatchesCategory(v, categoryValue));
      }
    }

    // Search filter
    if (searchTerm.trim().length >= 2) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((v) => 
        v.name.toLowerCase().includes(searchLower) ||
        v.description?.toLowerCase().includes(searchLower) ||
        v.vendorType?.toLowerCase().includes(searchLower) ||
        v.products?.some(product => 
          product.name?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply pre-defined filter from URL
    if (filterParam === 'popular') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (filterParam === 'new') {
      filtered.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
    } else if (filterParam === 'top-rated') {
      filtered = filtered.filter((v) => (v.rating || 0) >= 4.5);
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter((v) => (v.rating || 0) >= filters.minRating);
    }

    // Online only filter
    if (filters.onlineOnly) {
      filtered = filtered.filter((v) => v.isOnline === true);
    }

    // Price range filter based on product prices
    if (filters.priceRange !== 'all') {
      // Implementation for price range filtering based on products
      if (filters.priceRange === 'budget') {
        filtered = filtered.filter(v => 
          v.products?.some(p => (p.price || 0) <= 1000)
        );
      } else if (filters.priceRange === 'premium') {
        filtered = filtered.filter(v => 
          v.products?.some(p => (p.price || 0) >= 5000)
        );
      }
    }

    return filtered;
  }, [vendorsWithProducts, activeCategory, searchTerm, filters, filterParam]);

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    setSearchTerm(''); // Clear search when changing category
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="vendors-explore">
      {/* Header */}
      <div className="explore-header">
        <div className="header-content">
          <h1>Explore Vendors</h1>
          <p>Discover the best food, groceries, and more</p>
          {lastUpdated && (
            <span className="last-updated">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button 
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing || loading}
          title="Refresh vendors"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search vendors, categories..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={clearSearch}>
              <X size={18} />
            </button>
          )}
        </div>
        <button
          className="filters-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Minimum Rating</label>
            <select
              value={filters.minRating}
              onChange={(e) =>
                setFilters({ ...filters, minRating: parseFloat(e.target.value) })
              }
            >
              <option value="0">Any</option>
              <option value="3">3+ ⭐</option>
              <option value="4">4+ ⭐</option>
              <option value="4.5">4.5+ ⭐</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Price Range</label>
            <select
              value={filters.priceRange}
              onChange={(e) =>
                setFilters({ ...filters, priceRange: e.target.value })
              }
            >
              <option value="all">All Prices</option>
              <option value="budget">Budget (₦1,000 and below)</option>
              <option value="premium">Premium (₦5,000+)</option>
            </select>
          </div>

          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={filters.onlineOnly}
                onChange={(e) =>
                  setFilters({ ...filters, onlineOnly: e.target.checked })
                }
              />
              <span>Open Now Only</span>
            </label>
          </div>

          <button
            className="clear-filters-btn"
            onClick={() =>
              setFilters({
                minRating: 0,
                maxDistance: 100,
                priceRange: 'all',
                onlineOnly: false,
              })
            }
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="results-info">
          <p>
            {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} found
            {searchTerm && ` for "${searchTerm}"`}
          </p>
          {filteredVendors.length > 0 && (
            <p className="products-info">
              {filteredVendors.reduce((total, vendor) => total + vendor.productCount, 0)} products available
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => fetchVendorsWithProducts(false)} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      {/* Vendors Grid */}
      {loading ? (
        <div className="vendors-loading">
          <div className="spinner"></div>
          <p>Loading vendors and products...</p>
          <p className="loading-subtext">Fetching from V2 product system</p>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="no-vendors">
          <h3>No vendors found</h3>
          <p>
            {searchTerm
              ? `No results for "${searchTerm}". Try a different search term.`
              : 'No vendors with active products available in this category.'}
          </p>
          {!error && (
            <button onClick={() => fetchVendorsWithProducts(false)} className="refresh-btn">
              Refresh Data
            </button>
          )}
        </div>
      ) : (
        <div className="vendors-grid">
          {filteredVendors.map((vendor) => (
            <VendorCard 
              key={vendor.id} 
              vendor={vendor} 
              showProductCount={true}
              productCount={vendor.productCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
