// 🚀 GO7 VENDOR PRODUCTS PAGE — V2 Product System (Nov 2025)
// Display vendor products with addons using vendors/{vendorId}/products structure

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy, addDoc } from 'firebase/firestore';
import { useCart } from '../contexts/CartContext';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Plus, Minus, Star, Clock, MapPin } from 'lucide-react';
import ProductModalV2 from '../components/ProductModalV2';
import { ProductSeeder } from '../utils/ProductSeeder';
import toast from 'react-hot-toast';

// TypeScript interfaces for V2 Product System - ALIGNED WITH BACKEND
interface Product {
  // Core identifiers
  id: string;
  productId?: string; // Figma API uses this
  vendorId: string;
  
  // Basic info - supporting multiple backend field names
  name: string;
  description?: string; // vendorProductService, Figma API
  desc?: string; // productServiceNew
  
  // Pricing - supporting multiple backend field names
  price: number; // vendorProductService, Figma API
  basePrice?: number; // productServiceNew
  originalPrice?: number; // Figma API
  
  // Images - supporting multiple backend field names
  image?: string; // Figma API
  imageUrl?: string; // productServiceNew, vendorProductService
  images?: string[]; // Figma API
  
  // Category and type
  category?: string;
  productType?: 'food' | 'market'; // productServiceNew
  
  // Availability - supporting multiple backend field names
  active?: boolean; // productServiceNew
  available?: boolean; // vendorProductService
  isActive?: boolean; // some services
  isAvailable?: boolean; // some services
  availability?: ProductAvailability; // Figma API
  
  // Additional fields
  deliveryTimeMinutes?: number;
  preparationTime?: number; // Figma API
  measurementType?: 'portion' | 'tuber' | 'unit' | 'pack' | 'kg' | 'g' | 'L' | 'ml'; // vendorProductService
  
  // Analytics and display
  rating?: number;
  reviewCount?: number;
  reviews?: number;
  orderCount?: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  
  // Nested objects
  addons?: Addon[];
  
  // Timestamps
  createdAt?: any;
  updatedAt?: any;
}

// Supporting types
interface ProductAvailability {
  inStock: boolean;
  quantity?: number;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  
  // Description - supporting multiple backend field names
  description?: string;
  desc?: string;
  
  // Images - supporting multiple backend field names
  image?: string;
  imageUrl?: string;
  
  // Relations
  productId: string;
  
  // Availability - supporting multiple backend field names
  active?: boolean;
  isActive?: boolean;
  available?: boolean;
  isAvailable?: boolean;
  
  // Additional fields
  qtyLimit?: number;
  category?: string;
}

interface Vendor {
  id: string;
  name: string;
  businessName: string;
  image: string;
  description: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  address: string;
  vendorType: string;
  isOnline: boolean;
  isActive: boolean;
}

interface CartItem extends Product {
  quantity: number;
  selectedAddons: Addon[];
}

const VendorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // ✨ COMPONENT LOADING CHECK
  console.log('🔵 COMPONENT: VendorPage component loaded');
  console.log('🔵 COMPONENT: URL params:', { id });
  console.log('🔵 COMPONENT: Current pathname:', window.location.pathname);
  console.log('🔵 COMPONENT: Full URL:', window.location.href);
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Debug toggle - set to true to show ALL products regardless of status
  const SHOW_ALL_PRODUCTS_DEBUG = true;

  // 🌱 SEEDING: Create sample products for testing
  const handleSeedProducts = async () => {
    if (!id) return;
    
    setSeeding(true);
    try {
      console.log('🌱 SEEDING: Creating sample products for vendor:', id);
      const result = await ProductSeeder.seedSampleProducts(id);

      console.log('🌱 SEEDING: Success!', result);
      
      // Refresh the page to load new products
      window.location.reload();
    } catch (error) {
      console.error('🌱 SEEDING: Error creating sample products:', error);
      setError('Failed to create sample products: ' + error.message);
    } finally {
      setSeeding(false);
    }
  };

  // ✨ BACKEND ALIGNMENT: Data mapping functions
  const normalizeProduct = (rawProduct: any, vendorId: string): Product => {
    // Map multiple possible field names to consistent interface
    const normalized: Product = {
      id: rawProduct.id || rawProduct.productId,
      vendorId: vendorId,
      name: rawProduct.name || 'Unnamed Product',
      
      // Description mapping
      description: rawProduct.description || rawProduct.desc,
      desc: rawProduct.desc || rawProduct.description,
      
      // Price mapping - prioritize number fields
      price: rawProduct.price || rawProduct.basePrice || 0,
      basePrice: rawProduct.basePrice || rawProduct.price,
      
      // Image mapping
      imageUrl: rawProduct.imageUrl || rawProduct.image || rawProduct.images?.[0],
      image: rawProduct.image || rawProduct.imageUrl,
      
      // Category and type
      category: rawProduct.category,
      productType: rawProduct.productType,
      
      // Availability mapping - if ANY status field is true, consider available
      active: rawProduct.active,
      available: rawProduct.available,
      isActive: rawProduct.isActive,
      isAvailable: rawProduct.isAvailable,
      
      // Additional fields
      deliveryTimeMinutes: rawProduct.deliveryTimeMinutes,
      preparationTime: rawProduct.preparationTime,
      measurementType: rawProduct.measurementType,
      rating: rawProduct.rating,
      reviewCount: rawProduct.reviewCount || rawProduct.reviews,
      orderCount: rawProduct.orderCount,
      
      // Timestamps
      createdAt: rawProduct.createdAt,
      updatedAt: rawProduct.updatedAt,
      
      // Initialize addons array
      addons: rawProduct.addons || []
    };

    console.log('🔄 NORMALIZED PRODUCT:', {
      original: rawProduct,
      normalized: normalized
    });

    return normalized;
  };

  const normalizeAddon = (rawAddon: any, productId: string): Addon => {
    return {
      id: rawAddon.id,
      name: rawAddon.name || 'Unnamed Addon',
      price: rawAddon.price || 0,
      description: rawAddon.description || rawAddon.desc,
      imageUrl: rawAddon.imageUrl || rawAddon.image,
      productId: productId,
      active: rawAddon.active,
      isActive: rawAddon.isActive,
      available: rawAddon.available,
      qtyLimit: rawAddon.qtyLimit,
      category: rawAddon.category
    };
  };

  // Debug state changes
  React.useEffect(() => {
    console.log('🔍 DEBUG: Products state changed:', {
      length: products.length,
      products: products.map(p => ({ id: p.id, name: p.name, active: p.active }))
    });
  }, [products]);

  React.useEffect(() => {
    console.log('🔍 DEBUG: Loading state changed:', loading);
  }, [loading]);

  React.useEffect(() => {
    console.log('🔍 DEBUG: Error state changed:', error);
  }, [error]);
  // V2 Product System: Fetch vendor and products
  const fetchVendorData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      // ✨ API RESPONSE LOGGING - VENDOR ID
      console.log('🚀 API CALL: Starting vendor data fetch');
      console.log('📍 API CALL: Vendor ID being sent:', id);
      console.log('📍 API CALL: Vendor ID type:', typeof id);

      // Fetch vendor details
      console.log('🔍 DEBUG: Starting vendor data fetch for ID:', id);
      const vendorDoc = await getDoc(doc(db, 'vendors', id));
      if (!vendorDoc.exists()) {
        console.error('❌ DEBUG: Vendor not found for ID:', id);
        setError('Vendor not found');
        return;
      }

      const vendorData = { id: vendorDoc.id, ...vendorDoc.data() } as Vendor;
      console.log('✅ DEBUG: Vendor data loaded:', vendorData);
      
      // ✨ API RESPONSE LOGGING - VENDOR RESPONSE
      console.log('📦 API RESPONSE: Vendor details received');
      console.log('📦 API RESPONSE: Vendor ID from response:', vendorData.id);
      console.log('📦 API RESPONSE: Vendor name:', vendorData.name || vendorData.businessName);
      console.log('📦 API RESPONSE: Full vendor object:', JSON.stringify(vendorData, null, 2));
      
      setVendor(vendorData);

      // Fetch products from vendors/{vendorId}/products (V2 ONLY)
      console.log('🔍 DEBUG: Querying products at path:', `vendors/${id}/products`);
      console.log('🔍 DEBUG: Fetching ALL products without any filters...');
      
      // ✨ API RESPONSE LOGGING - PRODUCTS API CALL
      console.log('🚀 API CALL: Starting products fetch');
      console.log('📍 API CALL: Products endpoint path:', `vendors/${id}/products`);
      
      // Get ALL products - no filters at all
      const allProductsQuery = collection(db, 'vendors', id, 'products');
      const productsSnapshot = await getDocs(allProductsQuery);
      
      console.log('📦 API RESPONSE: Products query completed');
      console.log('📦 API RESPONSE: Total products found:', productsSnapshot.size);
      console.log('📦 API RESPONSE: Empty?:', productsSnapshot.empty);
      
      if (productsSnapshot.empty) {
        console.warn('⚠️ DEBUG: NO PRODUCTS FOUND AT ALL in vendors/' + id + '/products');
        console.warn('⚠️ Creating sample products now...');
        
        // Auto-create sample products
        const sampleProducts = [
          {
            name: "Jollof Rice Special",
            description: "Delicious jollof rice with chicken",
            basePrice: 2500,
            category: "food",
            measurementType: "portion",
            imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c",
            isAvailable: true,
            active: true,
            isActive: true,
            available: true,
            vendorId: id,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            name: "Fried Rice",
            description: "Tasty fried rice with vegetables",
            basePrice: 2000,
            category: "food",
            measurementType: "portion",
            imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b",
            isAvailable: true,
            active: true,
            isActive: true,
            available: true,
            vendorId: id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        
        for (const product of sampleProducts) {
          try {
            const docRef = await addDoc(collection(db, 'vendors', id, 'products'), product);
            console.log('✅ Created product:', product.name, 'ID:', docRef.id);
          } catch (err) {
            console.error('❌ Failed to create product:', err);
          }
        }
        
        toast.success('Created sample products! Refresh the page to see them.');
        setProducts([]);
        setLoading(false);
        return;
      }

      // Log each product found
      console.log('📦 PRODUCTS FOUND:', productsSnapshot.size);
      productsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   Product ${index + 1}:`, {
          id: doc.id,
          name: data.name,
          basePrice: data.basePrice,
          price: data.price,
          category: data.category,
          active: data.active,
          isActive: data.isActive,
          available: data.available,
          isAvailable: data.isAvailable
        });
      });
      
      // Convert ALL products to normalized format - NO FILTERING
      const allProducts: Product[] = productsSnapshot.docs.map(doc => {
        const data = doc.data();
        return normalizeProduct({
          id: doc.id,
          ...data
        }, id);
      });

      console.log(`✅ LOADED ${allProducts.length} PRODUCTS (NO FILTERING)`);
      console.log('Products:', allProducts.map(p => ({ id: p.id, name: p.name })));

      // Fetch addons for each visible product from vendors/{vendorId}/products/{productId}/addons
      console.log('🔍 DEBUG: Starting addon fetch for each visible product...');
      const productsWithAddons: Product[] = await Promise.all(
        allProducts.map(async (product, index) => {
          
          console.log(`🔍 DEBUG: Processing visible product ${index + 1}/${allProducts.length}: ${product.name}`);
          
          try {
            // Fetch addons for THIS specific product - try different status field names
            console.log(`   🔍 Checking addons with flexible status filtering for product ${product.id}`);
            
            // First try to get all addons without status filter
            const allAddonsQuery = collection(db, 'vendors', id, 'products', product.id, 'addons');
            const allAddonsSnapshot = await getDocs(allAddonsQuery);
            
            console.log(`   📦 Found ${allAddonsSnapshot.size} total addons for ${product.name}`);
            
            // ✨ BACKEND ALIGNMENT: Process and normalize addons
            const productAddons: Addon[] = allAddonsSnapshot.docs
              .map(addonDoc => {
                const rawAddonData = addonDoc.data();
                
                // ✨ BACKEND ALIGNMENT: Normalize addon data
                const normalizedAddon = normalizeAddon({
                  id: addonDoc.id,
                  ...rawAddonData
                }, product.id);
                
                console.log('🔄 ADDON NORMALIZED:', {
                  raw: rawAddonData,
                  normalized: normalizedAddon
                });
                
                return normalizedAddon;
              })
              .filter(addon => {
                const isVisible = SHOW_ALL_PRODUCTS_DEBUG ||
                  addon.active === true || 
                  addon.isActive === true || 
                  addon.available === true || 
                  addon.isAvailable === true ||
                  // If no status fields are set, consider it visible by default
                  (addon.active === undefined && addon.isActive === undefined && addon.available === undefined && addon.isAvailable === undefined);
                
                if (!isVisible && !SHOW_ALL_PRODUCTS_DEBUG) {
                  console.log(`   ⚠️ Addon ${addon.name} filtered out - active: ${addon.active}, isActive: ${addon.isActive}, available: ${addon.available}`);
                }
                
                return isVisible;
              });
            
            console.log(`   ✅ ${productAddons.length} visible addons after filtering`);
            
            const finalProduct = {
              ...product,
              addons: productAddons
            } as Product;
            
            console.log(`   ✅ Final product structure:`, finalProduct);
            return finalProduct;
            
          } catch (addonError) {
            console.warn(`❌ Failed to load addons for product ${product.id}:`, addonError);
            return {
              ...product,
              addons: []
            } as Product;
          }
        })
      );

      // Sort products by name
      productsWithAddons.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      console.log('🔍 DEBUG: Final products array before setState:', productsWithAddons);
      console.log('🔍 DEBUG: Products array length:', productsWithAddons.length);
      console.log('🔍 DEBUG: Setting products state with:', productsWithAddons.map(p => ({ id: p.id, name: p.name, vendorId: p.vendorId })));

      // ✨ API RESPONSE LOGGING - FINAL RESULT
      console.log('📦 API RESPONSE: FINAL PROCESSED RESULT');
      console.log('📦 API RESPONSE: Vendor ID processed:', id);
      console.log('📦 API RESPONSE: Products successfully processed:', productsWithAddons.length);
      
      // ✨ BACKEND ALIGNMENT: Final field mapping summary
      console.log('📦 BACKEND ALIGNMENT: FINAL NORMALIZED STRUCTURE');
      const finalStructureSummary = productsWithAddons.map(p => ({
        id: p.id,
        name: p.name,
        vendorId: p.vendorId,
        
        // Show which price field was used
        priceUsed: p.price ? 'price' : (p.basePrice ? 'basePrice' : 'none'),
        priceValue: p.price || p.basePrice,
        
        // Show which description field was used  
        descriptionUsed: p.description ? 'description' : (p.desc ? 'desc' : 'none'),
        descriptionValue: p.description || p.desc,
        
        // Show which image field was used
        imageUsed: p.imageUrl ? 'imageUrl' : (p.image ? 'image' : 'none'),
        imageValue: p.imageUrl || p.image,
        
        // Show availability status
        availabilityStatus: {
          active: p.active,
          available: p.available,
          isActive: p.isActive,
          isAvailable: p.isAvailable
        },
        
        addonsCount: p.addons?.length || 0
      }));
      
      console.log('📦 BACKEND ALIGNMENT: Field mapping results:', finalStructureSummary);
      console.log('📦 API RESPONSE: Complete final array:', JSON.stringify(productsWithAddons, null, 2));

      setProducts(productsWithAddons);
      console.log(`✅ DEBUG: State updated - Loaded ${productsWithAddons.length} products with addons from V2 structure`);
      
      // ✨ API RESPONSE LOGGING - STATE UPDATE
      console.log('📦 API RESPONSE: STATE SUCCESSFULLY UPDATED');
      console.log('📦 API RESPONSE: React state setProducts() called with', productsWithAddons.length, 'products');
    } catch (err) {
      console.error('Error fetching vendor data:', err);
      
      // ✨ API RESPONSE LOGGING - ERROR CASE
      console.log('📦 API RESPONSE: ERROR OCCURRED');
      console.log('📦 API RESPONSE: Vendor ID that failed:', id);
      console.log('📦 API RESPONSE: Error type:', err instanceof Error ? err.name : typeof err);
      console.log('📦 API RESPONSE: Error message:', err instanceof Error ? err.message : String(err));
      console.log('📦 API RESPONSE: Full error object:', err);
      console.log('📦 API RESPONSE: Stack trace:', err instanceof Error ? err.stack : 'No stack trace');
      
      // 🔥 CRITICAL: Check for "client is offline" error
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('client is offline') || errorMessage.includes('Failed to get document')) {
        console.error('🚨🚨🚨 FIRESTORE OFFLINE ERROR DETECTED!');
        console.error('💡 Solutions:');
        console.error('1. Check your internet connection');
        console.error('2. Clear browser cache (Ctrl+Shift+Delete)');
        console.error('3. Disable browser extensions that might block Firebase');
        console.error('4. Check if Firebase is blocked by firewall/antivirus');
        console.error('5. Try incognito/private browsing mode');
        
        setError(`⚠️ Cannot connect to database. ${errorMessage}. Please check your internet connection and try again.`);
        
        // Show user-friendly toast
        toast.error('Database connection failed. Please check your internet connection.', {
          duration: 5000,
        });
      } else {
        setError('Failed to load vendor data. Please try again.');
      }
    } finally {
      setLoading(false);
      
      // ✨ API RESPONSE LOGGING - FINAL STATE
      console.log('📦 API RESPONSE: FETCH PROCESS COMPLETED');
      console.log('📦 API RESPONSE: Loading state set to false');
    }
  };

  useEffect(() => {
    // ✨ USEEFFECT CHECK
    console.log('🔵 COMPONENT: useEffect triggered for vendor data fetch');
    console.log('🔵 COMPONENT: ID from useEffect:', id);
    
    if (id) {
      console.log('🔵 COMPONENT: ID exists, calling fetchVendorData');
      fetchVendorData();
    } else {
      console.log('❌ COMPONENT: No ID found, skipping fetch');
    }
  }, [id]);

  // Product selection handler
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Quick add to cart (without customization)
  const handleQuickAddToCart = (product: Product) => {
    try {
      console.log('🛒 Adding product to cart:', product);
      console.log('🛒 Product price:', product.price, 'basePrice:', product.basePrice);
      console.log('🛒 Product image:', product.imageUrl, 'image:', product.image);
      
      const cartItem: CartItem = {
        vendorId: product.vendorId || id || '',
        productId: product.id,
        title: product.name,
        price: product.price || product.basePrice || 0,
        imageUrl: product.imageUrl || product.image,
        quantity: 1,
        options: {
          description: product.description || product.desc || '',
          measurementType: product.measurementType || 'portion'
        }
      };
      
      console.log('🛒 Mapped cart item:', cartItem);
      console.log('🛒 Cart item price:', cartItem.price);
      console.log('🛒 Cart item quantity:', cartItem.quantity);
      
      addToCart(cartItem);
      
      console.log('✅ Item added to cart successfully');
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      console.error('❌ Error details:', { product, id });
      toast.error('Failed to add item to cart');
    }
  };

  const getMeasurementLabel = (type: string) => {
    const labels: Record<string, string> = {
      portion: 'per portion',
      kg: 'per kg',
      bunch: 'per bunch',
      tuber: 'per tuber'
    };
    return labels[type] || 'each';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendor products...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching from V2 product system</p>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Vendor not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to load vendor data. Please try again.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => fetchVendorData()}
              className="block w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-red-600 font-medium mb-4 hover:text-red-700"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>
          
          <div className="flex items-start gap-4">
            <img 
              src={vendor.image || '/placeholder-vendor.png'}
              alt={vendor.name}
              className="w-24 h-24 rounded-xl object-cover shadow-md"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {vendor.businessName || vendor.name}
              </h1>
              <p className="text-gray-600 mb-2">{vendor.vendorType}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                {vendor.rating && (
                  <div className="flex items-center gap-1">
                    <Star size={16} fill="#FFD700" color="#FFD700" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                )}
                {vendor.deliveryTime && (
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{vendor.deliveryTime}</span>
                  </div>
                )}
                {vendor.deliveryFee && (
                  <span>{vendor.deliveryFee}</span>
                )}
              </div>
              
              {vendor.address && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin size={14} />
                  <span>{vendor.address}</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                vendor.isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  vendor.isOnline ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {vendor.isOnline ? 'Open' : 'Closed'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <div className="flex items-center space-x-3">
            {SHOW_ALL_PRODUCTS_DEBUG && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                🔍 DEBUG: Showing All
              </span>
            )}
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              {products.length} available
            </span>
          </div>
        </div>
        
        {(() => {
          console.log('🔍 DEBUG: Rendering products section. Products length:', products.length);
          console.log('🔍 DEBUG: Products array in render:', products);
          return products.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products available</h3>
              <p className="text-gray-600 mb-6">
                This vendor hasn't added any products yet.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                🔍 DEBUG: Products array length is {products.length}
              </p>
              <div className="space-y-4">
                <button 
                  onClick={handleSeedProducts}
                  disabled={seeding}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mr-4"
                >
                  {seeding ? '🌱 Creating Sample Products...' : '🌱 Create Sample Products'}
                </button>
                <button 
                  onClick={() => navigate(-1)}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
                >
                  Browse Other Vendors
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                console.log('🔍 DEBUG: Mapping products for render. Count:', products.length);
                return products.map((product, index) => {
                  console.log(`🔍 DEBUG: Rendering product ${index + 1}: ${product.name} (ID: ${product.id})`);
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                    >
                <div className="relative">
                  <img 
                    src={product.imageUrl || product.image || '/placeholder-product.png'}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  {product.addons && product.addons.length > 0 && (
                    <div className="absolute top-3 right-3 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                      +{product.addons.length} addon{product.addons.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description || product.desc}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-bold text-red-600">
                      {formatPrice(product.price || product.basePrice || 0)}
                      <span className="text-sm text-gray-500 font-normal ml-1">
                        {getMeasurementLabel(product.measurementType)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickAddToCart(product)}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={16} />
                      Add to Cart
                    </button>
                    
                    {product.addons && product.addons.length > 0 && (
                      <button
                        onClick={() => handleProductClick(product)}
                        className="px-4 py-2 border border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                      >
                        Add extras
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
                  );
                });
              })()}
            </div>
          );
        })()}
      </div>

      {/* Product Customization Modal - V2 System */}
      {selectedProduct && (
        <ProductModalV2
          product={selectedProduct as any}
          vendorId={id!}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default VendorPage;