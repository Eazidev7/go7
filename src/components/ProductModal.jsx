// 🚀 GO7 PRODUCT MODAL — V4 with Full 3-Level Add-ons
// Supports: vendor/category/product level add-ons with deduplication

import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCartStore } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import './ProductModal.css';

export default function ProductModal({ product, vendorId, isOpen = true, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [mergedAddons, setMergedAddons] = useState({ all: [], vendor: [], category: [], product: [] });
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addToCart } = useCartStore();
  const navigate = useNavigate();

  const resolvedVendorId = vendorId || product.vendorId || product.vendor?.id;

  // Fetch addons from product subcollection with real-time updates
  useEffect(() => {
    console.log('🎯 ProductModal useEffect triggered', { isOpen, productId: product?.id, resolvedVendorId });
    
    if (!isOpen || !product.id || !resolvedVendorId) {
      console.log('❌ ProductModal early return:', { isOpen, productId: product?.id, resolvedVendorId });
      setMergedAddons({ all: [], vendor: [], category: [], product: [] });
      return;
    }
    
    console.log('🔍 ProductModal opened for product:', product.name);
    console.log('📍 VendorId:', resolvedVendorId);
    console.log('📍 ProductId:', product.id);
    console.log('🗂️ Product addon path:', `vendors/${resolvedVendorId}/products/${product.id}/addons`);
    console.log('🗂️ Vendor addon path:', `vendors/${resolvedVendorId}/addons`);
    
    setLoading(true);
    setSelectedAddons([]); // Reset selected addons when product changes
    
    // Use onSnapshot for real-time addon updates
    // Check both product-specific and vendor-level addons
    const productAddonsRef = collection(db, 'vendors', resolvedVendorId, 'products', product.id, 'addons');
    const vendorAddonsRef = collection(db, 'vendors', resolvedVendorId, 'addons');
    
    const loadAllAddons = async () => {
      console.log('🚀 LoadAllAddons function called');
      console.log('🧪 Testing basic Firebase connection...');
      const allAddons = [];
      
      try {
        // 1. Load product-specific addons
        console.log('🔍 Attempting to load product addons from:', `vendors/${resolvedVendorId}/products/${product.id}/addons`);
        const productSnapshot = await getDocs(productAddonsRef);
        console.log('📦 Product addons found:', productSnapshot.size);
        productSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('📄 Product addon RAW DATA:', doc.id, JSON.stringify(data, null, 2));
          allAddons.push({
            id: doc.id,
            source: 'product',
            name: data.name || data.title || data.addonName || 'Unnamed Addon',
            price: Number(data.price || data.addonPrice || 0),
            imageUrl: data.imageUrl || data.image || data.addonImageUrl || '/assets/no-image.svg',
            available: data.available !== false,
            description: data.description || '',
            ...data
          });
        });
        
        // 2. Load vendor-level addons (global addons for all products)
        console.log('🔍 Attempting to load vendor addons from:', `vendors/${resolvedVendorId}/addons`);
        const vendorSnapshot = await getDocs(vendorAddonsRef);
        console.log('📦 Vendor addons found:', vendorSnapshot.size);
        vendorSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('📄 Vendor addon RAW DATA:', doc.id, JSON.stringify(data, null, 2));
          allAddons.push({
            id: doc.id,
            source: 'vendor',
            name: data.name || data.title || data.addonName || 'Unnamed Addon',
            price: Number(data.price || data.addonPrice || 0),
            imageUrl: data.imageUrl || data.image || data.addonImageUrl || '/assets/no-image.svg',
            available: data.available !== false,
            description: data.description || '',
            ...data
          });
        });
      } catch (error) {
        console.error('❌ Error loading addons:', error);
        console.error('❌ Error details:', error.message, error.stack);
      }
      
      // Filter out unavailable addons
      const availableAddons = allAddons.filter(addon => addon.available);
      
      console.log(`🎯 TOTAL ADDONS: Loaded ${availableAddons.length} add-ons (${allAddons.filter(a => a.source === 'product').length} product-specific + ${allAddons.filter(a => a.source === 'vendor').length} vendor-level)`);
      console.log('📦 Addons data:', availableAddons);
      
      setMergedAddons({ 
        all: availableAddons, 
        vendor: availableAddons.filter(a => a.source === 'vendor'), 
        category: [], 
        product: availableAddons.filter(a => a.source === 'product')
      });
      setLoading(false);
    };
    
    // Load addons initially
    loadAllAddons();
    
    // Set up real-time listeners for both collections  
    const unsubscribeProduct = onSnapshot(productAddonsRef, () => loadAllAddons(), (error) => {
      console.error('❌ Error loading product addons:', error);
      setLoading(false);
    });
    const unsubscribeVendor = onSnapshot(vendorAddonsRef, () => loadAllAddons(), (error) => {
      console.error('❌ Error loading vendor addons:', error);
      setLoading(false);
    });
    
    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeProduct();
      unsubscribeVendor();
    };
  }, [isOpen, product.id, resolvedVendorId]);

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      }
      // Start with qtyLimitMin or 1
      const initialQty = addon.qtyLimitMin > 0 ? addon.qtyLimitMin : 1;
      return [...prev, { ...addon, quantity: initialQty }];
    });
  };

  const updateAddonQuantity = (addonId, delta) => {
    setSelectedAddons(prev => prev.map(addon => {
      if (addon.id === addonId) {
        const min = addon.qtyLimitMin || 0;
        const max = addon.qtyLimitMax || 99;
        const newQty = Math.max(min, Math.min(max, addon.quantity + delta));
        return { ...addon, quantity: newQty };
      }
      return addon;
    }));
  };

  const calculateTotal = () => {
    const productPrice = Number(product.price) || Number(product.basePrice) || 0;
    const baseTotal = productPrice * quantity;
    const addonsTotal = selectedAddons.reduce((sum, addon) => 
      sum + ((Number(addon.price) || 0) * addon.quantity * quantity), 0  // Multiply by product quantity
    );
    return baseTotal + addonsTotal;
  };

  const handleAddToCart = () => {
    // Format addons for new cart store structure
    const formattedAddons = selectedAddons.map(addon => ({
      addonId: String(addon.id || addon.addonId || ''),
      name: String(addon.name || addon.addonName || 'Add-on'),
      price: Number(addon.price || addon.addonPrice || 0),
      qty: Number(addon.quantity || 1)
    }));

    const productData = {
      productId: String(product.id || ''),
      name: String(product.name || 'Product'),
      price: Number(product.price || product.basePrice || 0),
      image: String(product.imageUrl || product.image || ''),
      vendorId: String(resolvedVendorId || ''),
      vendorName: String(product.vendorName || product.vendor?.name || 'Vendor'),
      addons: formattedAddons
    };
    
    console.log('🛒 Adding to cart with new store:', productData);
    
    const success = addToCart(productData, resolvedVendorId, formattedAddons, quantity);
    
    if (success) {
      onClose();
    }
    // If failed (vendor conflict), modal will be shown by cart store
  };

  if (!isOpen || !product) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Product Image */}
        <div className="modal-image-container">
          <img 
            src={imageError ? '/placeholder-product.svg' : (product.imageUrl || '/placeholder-product.svg')}
            alt={product.name}
            onError={() => setImageError(true)}
            className="modal-product-image"
          />
        </div>

        {/* Product Info */}
        <div className="modal-content">
          <h2 className="modal-product-name">{product.name}</h2>
          <p className="modal-product-description">{product.description}</p>
          
          {/* Vendor Section with Enhanced Info */}
          <div 
            className="modal-vendor-section" 
            onClick={(e) => {
              e.stopPropagation();
              console.log('🏪 Vendor section clicked, navigating to:', resolvedVendorId);
              if (resolvedVendorId) {
                navigate(`/vendor/${resolvedVendorId}`);
              } else {
                console.warn('⚠️ No vendorId found');
              }
            }}
          >
            {product.vendor?.profileImage && (
              <img 
                src={product.vendor.profileImage} 
                alt={product.vendor.name}
                className="vendor-profile-img"
              />
            )}
            <div className="vendor-info-details">
              <span className="vendor-name">{product.vendorName || product.vendor?.name || 'Restaurant'}</span>
              <div className="vendor-meta">
                {product.vendor?.rating && (
                  <span className="vendor-rating">⭐ {product.vendor.rating}</span>
                )}
                {product.vendor?.deliveryTime && (
                  <span className="vendor-delivery-time">🕒 {product.vendor.deliveryTime} min</span>
                )}
                {product.vendor?.deliveryFee !== undefined && (
                  <span className="vendor-delivery-fee">
                    {Number(product.vendor.deliveryFee) === 0 ? 'Free Delivery' : `₦${Number(product.vendor.deliveryFee).toLocaleString()} delivery`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-price">₦{(Number(product.price) || 0).toLocaleString()}</div>

          {/* Quantity Selector */}
          <div className="quantity-section">
            <span className="quantity-label">Quantity</span>
            <div className="quantity-controls">
              <button 
                className="qty-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus size={16} />
              </button>
              <span className="qty-value">{quantity}</span>
              <button 
                className="qty-btn"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Addons Section - NEW PREMIUM UI */}
          {loading ? (
            <div className="addons-loading">
              <div className="spinner-sm"></div>
              <p>Loading add-ons...</p>
            </div>
          ) : mergedAddons.all && mergedAddons.all.length > 0 ? (
            <div className="addons-section">
              <h3 className="addons-title">⭐ Add Extra Options ({mergedAddons.all.length})</h3>
              <div className="addons-list">
                {mergedAddons.all.map(addon => {
                  const selected = selectedAddons.find(a => a.id === addon.id);
                  const hasImage = addon.imageUrl && !addon.imageUrl.includes('no-image') && addon.imageUrl.trim() !== '';
                  
                  return (
                    <div 
                      key={addon.id} 
                      className={`addon-item ${selected ? 'addon-item-selected' : ''}`}
                      onClick={() => !selected && toggleAddon(addon)}
                    >
                      {/* Square Image */}
                      <div className="addon-item-image">
                        {hasImage ? (
                          <img 
                            src={addon.imageUrl}
                            alt={addon.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 8px; font-size: 24px;">🍽️</div>';
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f5f5f5',
                            borderRadius: '8px',
                            fontSize: '24px'
                          }}>
                            🍽️
                          </div>
                        )}
                      </div>
                      
                      {/* Addon Info */}
                      <div className="addon-item-info">
                        <h4 className="addon-item-name">{addon.name}</h4>
                        <p className="addon-item-price">₦{(addon.price || 0).toLocaleString()}</p>
                      </div>
                      
                      {/* Add/Remove Button */}
                      {selected ? (
                        <div className="addon-item-controls" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="addon-control-btn"
                            onClick={() => updateAddonQuantity(addon.id, -1)}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="addon-control-qty">{selected.quantity}</span>
                          <button 
                            className="addon-control-btn"
                            onClick={() => updateAddonQuantity(addon.id, 1)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="addon-item-add-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAddon(addon);
                          }}
                        >
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="no-addons-message">
              <p>No add-ons available for this product</p>
              <small style={{color: '#999', fontSize: '12px'}}>
                VendorId: {resolvedVendorId} | Loaded: {mergedAddons.all?.length || 0} add-ons
              </small>
            </div>
          )}

          {/* Total Price */}
          <div className="modal-total">
            <span className="total-label">Total</span>
            <span className="total-value">₦{calculateTotal().toLocaleString()}</span>
          </div>

          {/* Add to Cart Button */}
          <button 
            className="modal-add-to-cart"
            onClick={handleAddToCart}
          >
            <ShoppingBag size={20} />
            Add to Cart - ₦{calculateTotal().toLocaleString()}
          </button>
        </div>

      </div>
    </div>
  );
}
