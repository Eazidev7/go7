// 🚀 GO7 VENDOR SECTIONS COMPONENT V2 — Nov 2025
// Auto-populated vendor sections with V2 product system

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import './VendorSections.css';

// V2 Interfaces (JSDoc)
/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} image
 * @property {number} price
 * @property {string} category
 * @property {number} rating
 * @property {boolean} isAvailable
 */

/**
 * @typedef {Object} VendorWithProducts
 * @property {string} id
 * @property {string} name
 * @property {string} businessName
 * @property {number} rating
 * @property {string} category
 * @property {boolean} isOpen
 * @property {string} imageUrl
 * @property {string} logoUrl
 * @property {Product[]} products
 * @property {Product} [firstProduct]
 * @property {any} [createdAt]
 * @property {any} [updatedAt]
 */

// Loading Skeleton
function VendorCardSkeleton() {
  return (
    <div className="vendor-card-skeleton">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-title"></div>
        <div className="skeleton-category"></div>
        <div className="skeleton-price"></div>
      </div>
    </div>
  );
}

// Vendor Card Component
/**
 * @param {Object} props
 * @param {VendorWithProducts} props.vendor
 */
function VendorCard({ vendor }) {
  const navigate = useNavigate();
  
  const handleVendorClick = () => {
    navigate(`/vendor/${vendor.id}`);
  };

  return (
    <div className="vendor-card" onClick={handleVendorClick}>
      <div className="vendor-image">
        <img 
          src={vendor.firstProduct?.image || vendor.imageUrl || vendor.logoUrl} 
          alt={vendor.name}
          loading="lazy"
          onError={(e) => {
            const target = e.target;
            target.src = '/placeholder-vendor.jpg';
          }}
        />
        
        {/* Rating Badge */}
        <div className="rating-badge">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path 
              d="M6 1L7.545 4.13L11 4.635L8.5 7.07L9.09 10.5L6 8.885L2.91 10.5L3.5 7.07L1 4.635L4.455 4.13L6 1Z" 
              fill="#FFD700"
            />
          </svg>
          <span>{vendor.rating.toFixed(1)}</span>
        </div>

        {/* Closed Overlay */}
        {!vendor.isOpen && (
          <div className="closed-overlay">
            <span>Closed</span>
          </div>
        )}
      </div>

      <div className="vendor-info">
        <h4 className="vendor-name">{vendor.businessName || vendor.name}</h4>
        
        {vendor.firstProduct && (
          <>
            <p className="product-category">{vendor.firstProduct.category}</p>
            <p className="product-price">₦{vendor.firstProduct.price.toLocaleString()}</p>
          </>
        )}
        
        <div className="vendor-meta">
          <span className="product-count">{vendor.products.length} items</span>
        </div>
      </div>
    </div>
  );
}

// Vendor Section Component
/**
 * @param {Object} props
 * @param {string} props.title
 * @param {VendorWithProducts[]} props.vendors
 * @param {boolean} props.loading
 * @param {string} [props.viewAllLink]
 */
function VendorSection({ title, vendors, loading, viewAllLink }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="vendor-section">
        <div className="section-header">
          <h2>{title}</h2>
        </div>
        <div className="vendor-grid loading">
          {[1, 2, 3, 4].map((i) => (
            <VendorCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!vendors || vendors.length === 0) {
    return null;
  }

  return (
    <div className="vendor-section">
      <div className="section-header">
        <h2>{title}</h2>
        {viewAllLink && (
          <button
            className="view-all-btn"
            onClick={() => navigate(viewAllLink)}
          >
            View All
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="vendor-grid">
        {vendors.map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </div>
  );
}

// Main Component with V2 Data Fetching
export default function VendorSections() {
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState({});

  useEffect(() => {
    const cacheKey = 'vendors_with_products';
    const cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Check cache first
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    
    if (cachedData && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp);
      if (age < cacheTimeout) {
        console.log('🚀 Using cached vendor data');
        setAllVendors(JSON.parse(cachedData));
        setLoading(false);
        return;
      }
    }

    fetchVendorsWithProducts();
  }, []);

  const fetchVendorsWithProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching vendors with V2 product structure...');

      // Fetch all vendors
      const vendorsRef = collection(db, 'vendors');
      const vendorsSnapshot = await getDocs(vendorsRef);
      
      if (vendorsSnapshot.empty) {
        console.log('⚠️ No vendors found');
        setAllVendors([]);
        return;
      }

      const vendorsWithProducts = [];

      // For each vendor, fetch their products
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        const vendorId = vendorDoc.id;
        
        try {
          // Fetch products for this vendor
          const productsRef = collection(db, 'vendors', vendorId, 'products');
          const productsSnapshot = await getDocs(productsRef);
          
          const products = [];
          
          if (!productsSnapshot.empty) {
            productsSnapshot.docs.forEach(productDoc => {
              const productData = productDoc.data();
              
              if (productData.name && productData.price) {
                products.push({
                  id: productDoc.id,
                  name: productData.name,
                  image: productData.image || productData.imageUrl || '',
                  price: productData.price,
                  category: productData.category || 'food',
                  rating: productData.rating || 0,
                  isAvailable: productData.isAvailable !== false
                });
              }
            });
          }

          // Only include vendors with at least 1 product and good rating
          if (products.length > 0 && (vendorData.rating || 0) > 4.0) {
            const vendor = {
              id: vendorId,
              name: vendorData.businessName || vendorData.name || 'Unknown Vendor',
              businessName: vendorData.businessName || vendorData.name || 'Unknown Business',
              rating: vendorData.rating || 0,
              category: vendorData.category || 'restaurant',
              isOpen: vendorData.isOpen !== false,
              imageUrl: vendorData.imageUrl || vendorData.logoUrl || '',
              logoUrl: vendorData.logoUrl || vendorData.imageUrl || '',
              products: products,
              firstProduct: products[0], // Use first product for display
              createdAt: vendorData.createdAt,
              updatedAt: vendorData.updatedAt
            };

            vendorsWithProducts.push(vendor);
          }
        } catch (productError) {
          console.error(`❌ Error fetching products for vendor ${vendorId}:`, productError);
        }
      }

      console.log(`✅ Loaded ${vendorsWithProducts.length} vendors with products`);
      
      // Cache the results
      const cacheKey = 'vendors_with_products';
      localStorage.setItem(cacheKey, JSON.stringify(vendorsWithProducts));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      
      setAllVendors(vendorsWithProducts);
      
    } catch (err) {
      console.error('❌ Error fetching vendors with products:', err);
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  // Filter vendors for different sections
  const getPopularVendors = () => {
    return allVendors
      .filter(v => v.products.length >= 3)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8);
  };

  const getNewVendors = () => {
    return allVendors
      .filter(v => v.createdAt)
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
        return bTime - aTime;
      })
      .slice(0, 8);
  };

  const getTopRatedVendors = () => {
    return allVendors
      .filter(v => v.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8);
  };

  const getRestaurants = () => {
    return allVendors
      .filter(v => v.category?.toLowerCase().includes('restaurant') || 
                  v.category?.toLowerCase().includes('food'))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8);
  };

  if (error) {
    return (
      <div className="vendor-sections-error">
        <p>❌ {error}</p>
        <button onClick={fetchVendorsWithProducts} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="vendor-sections-container">
      {/* Popular Near You */}
      <VendorSection
        title="🔥 Popular Near You"
        vendors={getPopularVendors()}
        loading={loading}
        viewAllLink="/vendors?filter=popular"
      />

      {/* New on Go7 */}
      <VendorSection
        title="✨ New on Go7"
        vendors={getNewVendors()}
        loading={loading}
        viewAllLink="/vendors?filter=new"
      />

      {/* Top Rated */}
      <VendorSection
        title="⭐ Top Rated"
        vendors={getTopRatedVendors()}
        loading={loading}
        viewAllLink="/vendors?filter=top-rated"
      />

      {/* Restaurants Near You */}
      <VendorSection
        title="🍕 Restaurants Near You"
        vendors={getRestaurants()}
        loading={loading}
        viewAllLink="/category/restaurant"
      />
    </div>
  );
}
