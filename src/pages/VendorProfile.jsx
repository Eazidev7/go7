import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { fetchVendorDetails, fetchVendorProducts, subscribeToVendorProducts } from "../services/firestoreV2";
import { fetchVendorCategories } from "../services/vendorCategoryService";
import ProductModal from "../components/ProductModal";
import "./VendorProfile.css";

export default function VendorProfile() {
  const params = useParams();
  const vendorId = params.vendorId || params.id; // Support both :vendorId and :id
  const navigate = useNavigate();
  
  console.log('🚀 VendorProfile.jsx LOADED - vendorId:', vendorId);
  
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [vendorCategories, setVendorCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  // Load vendor categories
  useEffect(() => {
    if (vendorId) {
      loadVendorCategories();
    }
  }, [vendorId]);

  // Load vendor categories
  useEffect(() => {
    if (vendorId) {
      loadVendorCategories();
    }
  }, [vendorId]);

  const loadVendorCategories = async () => {
    try {
      const categoriesRef = collection(db, `vendors/${vendorId}/categories`);
      const snapshot = await getDocs(categoriesRef);
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unnamed',
        order: doc.data().order || 0
      })).sort((a, b) => a.order - b.order);
      
      setVendorCategories(cats);
      
      // Set "All" as default (empty string)
      if (!selectedCategoryId) {
        setSelectedCategoryId("");
      }
      
      console.log('📁 Loaded vendor categories:', cats);
    } catch (error) {
      console.error('Error loading vendor categories:', error);
    }
  };

  useEffect(() => {
    loadVendorData();
    
    // Set up real-time listener for products using V2
    let unsubscribe;
    
    const setupListener = async () => {
      unsubscribe = await subscribeToVendorProducts(vendorId, (productsList) => {
        console.log('🔥 VENDOR PROFILE: Received products:', productsList);
        if (productsList.length > 0) {
          console.log('🔥 First product details:', productsList[0]);
          console.log('🔥 First product price:', productsList[0].price, 'basePrice:', productsList[0].basePrice);
        }
        setProducts(productsList);
        
        console.log(`✅ Loaded ${productsList.length} products`);
      });
    };
    
    setupListener();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [vendorId]);

  const loadVendorData = async () => {
    try {
      setLoading(true);
      
      // Fetch vendor details using V2
      const vendorData = await fetchVendorDetails(vendorId);
      console.log('🔥 VENDOR PROFILE: Vendor data loaded:', vendorData);
      setVendor(vendorData);
      
      const displayName = vendorData.businessName || vendorData.name || vendorData.email?.split('@')[0] || 'Vendor';
      console.log(`✅ Loaded vendor: ${displayName}`);
      
    } catch (error) {
      console.error("❌ Error loading vendor data:", error);
      navigate("/explore");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleImageError = (type, id) => {
    setImageErrors(prev => ({ ...prev, [`${type}-${id}`]: true }));
  };

  if (loading) {
    return (
      <div className="vendor-page-loading">
        <div className="spinner"></div>
        <p>Loading vendor...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="vendor-page-error">
        <h2>Vendor not found</h2>
        <button onClick={() => navigate("/explore")}>Back to Explore</button>
      </div>
    );
  }

  return (
    <div className="vendor-page">
      
      {/* Header with Back Button and Favorite */}
      <div className="vendor-header-top">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="vendor-name">{vendor.businessName || vendor.name}</h1>
        <button className="favorite-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Banner */}
      <div className="vendor-banner">
        <img 
          src={imageErrors['banner'] ? "/assets/vendors/default-banner.svg" : (vendor.bannerImage || vendor.coverImage || "/assets/vendors/default-banner.svg")}
          alt={vendor.businessName || vendor.name}
          onError={() => handleImageError('banner', 'main')}
          loading="lazy"
        />
        {/* Vendor Logo Overlay */}
        <div className="vendor-logo-overlay">
          <img 
            src={vendor.profileImage || vendor.businessLogo || "/assets/vendors/default-logo.png"}
            alt={`${vendor.businessName || vendor.name} logo`}
            onError={(e) => { e.target.src = "/assets/vendors/default-logo.png"; }}
          />
        </div>
      </div>

      {/* Store Info */}
      <div className="store-info">
        {vendor.category && (
          <div className="vendor-category-badge">
            {vendor.category}
          </div>
        )}
        <div className="info-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#2ECC71" strokeWidth="2"/>
            <path d="M12 6v6l4 2" stroke="#2ECC71" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div>
            <div className="info-value">{vendor.deliveryTime || "20-30 min"}</div>
            <div className="info-label">Delivery time</div>
          </div>
        </div>
        <div className="info-divider"></div>
        <div className="info-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#E0001B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <div className="info-value">₦{typeof vendor.deliveryFee === 'number' ? vendor.deliveryFee : (parseInt(vendor.deliveryFee) || 450)}</div>
            <div className="info-label">Delivery fee</div>
          </div>
        </div>
        <div className="info-divider"></div>
        <div className="info-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFB800" stroke="#FFB800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <div className="info-value">{Number(vendor.rating || 4.5).toFixed(1)} • {vendor.reviewCount || vendor.reviews || "200+"} reviews</div>
            <div className="info-label">Rating</div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="vendor-tabs">
        {/* Always show "All" tab */}
        <button 
          className={selectedCategoryId === "" ? "tab active" : "tab"}
          onClick={() => setSelectedCategoryId("")}
        >
          All
        </button>
        
        {/* Show vendor-specific categories */}
        {vendorCategories.map(cat => (
          <button 
            key={cat.id} 
            className={selectedCategoryId === cat.id ? "tab active" : "tab"}
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className="product-list">
        {products.length === 0 ? (
          <div className="no-products">
            <p>No items in this category yet.</p>
          </div>
        ) : (() => {
          const filteredProducts = products.filter(p => {
            // If "All" tab is selected (empty string), show all products
            if (selectedCategoryId === "") return true;
            
            // Otherwise, filter by selected category ID
            return p.categoryId === selectedCategoryId;
          });
          
          if (filteredProducts.length === 0) {
            return (
              <div className="no-products">
                <p>No items in this category yet.</p>
              </div>
            );
          }
          
          return filteredProducts.map(p => (
            <div className="product-item" key={p.id} onClick={() => handleAddProduct(p)}>
              
              <div className="product-details">
                <h3 className="product-name">{p.name}</h3>
                <p className="product-desc">{p.description}</p>
                {p.categoryName && (
                  <span className="product-category-badge">{p.categoryName}</span>
                )}
                <span className="product-price">From ₦{(p.price || p.basePrice || 0).toLocaleString()}</span>
              </div>

              <div className="product-media">
                <img 
                  src={imageErrors[`product-${p.id}`] ? "/placeholder-product.svg" : (p.imageUrl || "/placeholder-product.svg")}
                  alt={p.name}
                  onError={() => handleImageError('product', p.id)}
                  className="product-thumb"
                  loading="lazy"
                />
                <button 
                  className="add-product-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddProduct(p);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

            </div>
          ));
        })()}
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={{
            ...selectedProduct,
            vendorId: vendorId,
            vendorName: vendor.businessName || vendor.name,
            vendor: {
              id: vendorId,
              name: vendor.businessName || vendor.name,
              rating: vendor.rating || 4.8,
              deliveryTime: vendor.deliveryTime || "25-35 mins",
              profileImage: vendor.businessLogo || vendor.profileImage
            }
          }}
          vendorId={vendorId}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

    </div>
  );
}
