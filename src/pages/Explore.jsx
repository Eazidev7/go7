import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import VendorClickableWrapper from "../components/VendorClickableWrapper";
import { fetchAllProducts, fetchTrendingProducts, fetchRecommendedProducts } from "../services/firestoreV2";
import "./Explore.css";

const categories = [
  { name: "All", value: "all", icon: "🎯" },
  { name: "Food", value: "food", icon: "🍔" },
  { name: "Groceries", value: "grocery", icon: "🛒" },
  { name: "Fashion", value: "fashion", icon: "👗" },
  { name: "Electronics", value: "electronics", icon: "📱" },
];

export default function Explore() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [allProducts, setAllProducts] = useState([]); // Original full list
  const [filteredProducts, setFilteredProducts] = useState([]); // Filtered display list
  const [trendingVendors, setTrendingVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});

  // Fetch ALL products once on mount - PRESERVE FULL LIST
  useEffect(() => {
    setLoading(true);
    
    const loadAllProducts = async () => {
      try {
        const products = await fetchAllProducts({ available: true });
        
        console.log(`✅ Loaded ${products.length} products from Firestore`);
        
        // Store full list - NEVER overwrite this
        setAllProducts(products);
        setFilteredProducts(products);
        setLoading(false);
        
      } catch (error) {
        console.error('❌ Error fetching products:', error);
        setAllProducts([]);
        setFilteredProducts([]);
        setLoading(false);
      }
    };
    
    loadAllProducts();
  }, []); // Run ONCE on mount

  // Filter products when category changes - ALWAYS use allProducts as source
  useEffect(() => {
    if (allProducts.length === 0) return;
    
    if (activeCategory === 'all') {
      // Show ALL products when "All" is selected
      setFilteredProducts(allProducts);
    } else {
      // Filter by category
      const filtered = allProducts.filter(product => 
        product.category?.toLowerCase() === activeCategory.toLowerCase()
      );
      setFilteredProducts(filtered);
    }
    
    console.log(`📊 Category: ${activeCategory}, Showing: ${activeCategory === 'all' ? allProducts.length : filteredProducts.length} products`);
  }, [activeCategory, allProducts]);

  useEffect(() => {
    loadTrendingVendors();
  }, []);

  const loadTrendingVendors = async () => {
    try {
      // Use the proper trending vendors service instead of extracting from products
      const { getTrendingVendors } = await import('../services/customerProductServiceV2');
      const { vendors } = await getTrendingVendors(20);
      
      // Validate vendors before setting
      const validVendors = vendors.filter(vendor => {
        // Skip vendors missing required listing fields (logo optional — cards use placeholders)
        if (!vendor.name || vendor.deliveryFee == null || !vendor.deliveryTime || vendor.rating == null) {
          console.log(`⏭️ Skipping vendor ${vendor.id}: missing required fields`);
          return false;
        }
        return true;
      }).slice(0, 8);
      
      console.log(`🔥 Loaded ${validVendors.length} validated trending vendors`);
      setTrendingVendors(validVendors);
    } catch (error) {
      console.error('Error loading trending vendors:', error);
      setTrendingVendors([]);
    }
  };

  const handleImageError = (productId) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  const handleProductCardClick = (product) => {
    // Navigate to vendor profile instead of opening product modal
    if (product.vendorId) {
      navigate(`/vendor/${product.vendorId}`);
    }
  };

  return (
    <div className="explore-page">
      {/* Header */}
      <div className="explore-header">
        <h1 className="explore-title">Explore</h1>
      </div>

      {/* Category Tabs - Horizontal Scroll */}
      <div className="category-scroll">
        {categories.map(cat => (
          <button
            key={cat.value}
            className={`category-tab ${activeCategory === cat.value ? 'category-tab-active' : ''}`}
            onClick={() => setActiveCategory(cat.value)}
          >
            <div className="category-tab-icon">{cat.icon}</div>
            <span className="category-tab-label">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Trending Vendors */}
      {trendingVendors.length > 0 && (
        <section className="trending-vendors-section">
          <h2 className="trending-title">🔥 Trending Vendors</h2>
          <div className="trending-vendors-scroll">
            {trendingVendors.map(vendor => (
              <VendorClickableWrapper key={vendor.id} vendor={vendor}>
                <div className="trending-vendor-item">
                  <div className="trending-vendor-image">
                    <img 
                      src={vendor.profileImage} 
                      alt={vendor.businessName || vendor.name}
                      onError={(e) => e.target.src = '/placeholder-product.svg'}
                    />
                  </div>
                  <div className="trending-vendor-info">
                    <h3 className="trending-vendor-name">{vendor.businessName || vendor.name}</h3>
                    {vendor.categories && vendor.categories.length > 0 && (
                      <p className="trending-vendor-category">{vendor.categories[0]}</p>
                    )}
                    <div className="trending-vendor-meta">
                      <span className="trending-vendor-rating">⭐ {vendor.rating.toFixed(1)}</span>
                      <span className="trending-vendor-time">🕒 {vendor.deliveryTime}</span>
                    </div>
                    <div className="trending-vendor-pricing">
                      <div className="trending-vendor-price-info">
                        <span className="trending-vendor-fee-label">Delivery</span>
                        <div>
                          <span className="trending-vendor-fee">₦{vendor.deliveryFee}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </VendorClickableWrapper>
            ))}
          </div>
        </section>
      )}

      {/* Products Section */}
      <section className="products-section">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-container">
            <div className="empty-icon">📦</div>
            <h3 className="empty-title">No products found</h3>
            <p className="empty-message">Try selecting a different category</p>
          </div>
        ) : (
          <div className="products-list">
            {filteredProducts.map((product) => (
              <div 
                key={`${product.vendorId}-${product.id}`}
                className="product-item-modern"
                onClick={() => handleProductCardClick(product)}
              >
                <div className="product-item-image">
                  <img 
                    src={imageErrors[product.id] ? '/placeholder-product.svg' : (product.imageUrl || '/placeholder-product.svg')}
                    alt={product.name || 'Product'}
                    onError={() => handleImageError(product.id)}
                    loading="lazy"
                  />
                </div>
                <div className="product-item-content">
                  <h3 className="product-item-name">{product.name || 'Unnamed Product'}</h3>
                  <p className="product-item-vendor">{product.vendorName || 'Vendor'}</p>
                  <div className="product-item-meta">
                    <span className="product-item-rating">⭐ {product.vendorRating || 4.5}</span>
                    <span className="product-item-time">🕒 {product.vendorDeliveryTime || '25-30 mins'}</span>
                  </div>
                  <div className="product-item-footer">
                    <div className="product-item-pricing">
                      <span className="product-item-price-original">₦{(product.price || 0).toLocaleString()}</span>
                      <span className="product-item-price">₦{(product.price || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button 
                  className="product-item-add-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProductCardClick(product);
                  }}
                >
                  <span style={{fontSize: '22px', fontWeight: 'bold'}}>+</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}