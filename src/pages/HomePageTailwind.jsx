import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, limit, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import toast from 'react-hot-toast';
import addOnService from '../services/addOnServiceV2.js';
import { isVendorPubliclyVisible, toVendorListingInfo } from '../utils/vendorVisibility.js';
import { resolveVendorImage } from '../utils/vendorImage.js';
import { getVendorPlaceholder } from '../utils/placeholderImages.js';
import { 
  TruckIcon, 
  MapPinIcon, 
  BriefcaseIcon, 
  HeartIcon
} from '@heroicons/react/24/solid';

// ICONS - Inline SVG data URLs
const ICONS = {
  LOCATION_PIN: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12 21s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12z' stroke='%23E0001B' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/><circle cx='12' cy='9' r='2.5' fill='none' stroke='%23E0001B' stroke-width='2'/></svg>",
  BELL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M15 17H9a3 3 0 01-3-3V9a6 6 0 1112 0v5a3 3 0 01-3 3z' stroke='%23E0001B' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/><path d='M13.73 21a2 2 0 01-3.46 0' stroke='%23E0001B' stroke-width='2' fill='none' stroke-linecap='round'/></svg>",
  SEARCH: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><circle cx='11' cy='11' r='6' stroke='%23A0A0A0' stroke-width='2' fill='none'/><path d='M21 21l-4.35-4.35' stroke='%23A0A0A0' stroke-width='2' stroke-linecap='round'/></svg>",
  MIC: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><path d='M12 1v10a3 3 0 01-3 3 3 3 0 01-3-3V1' stroke='%23A0A0A0' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/><path d='M19 11a7 7 0 01-14 0' stroke='%23A0A0A0' stroke-width='2' fill='none'/><path d='M12 21v2' stroke='%23A0A0A0' stroke-width='2' stroke-linecap='round'/></svg>",
  // PROFESSIONAL CATEGORY ICONS - Ultra Modern
  DELIVERY_TRUCK: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><defs><linearGradient id='truck-grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23FF6B6B'/><stop offset='100%25' stop-color='%23FF5252'/></linearGradient></defs><rect x='2' y='12' width='16' height='10' rx='2' fill='url(%23truck-grad)' stroke='%23E53935' stroke-width='0.8'/><path d='M18 12h4l4 5v5h-8v-10z' fill='url(%23truck-grad)' stroke='%23E53935' stroke-width='0.8'/><circle cx='8' cy='24' r='2.5' fill='%23424242' stroke='%23212121' stroke-width='0.6'/><circle cx='22' cy='24' r='2.5' fill='%23424242' stroke='%23212121' stroke-width='0.6'/><rect x='3' y='9' width='14' height='1.5' fill='%23FFFFFF' rx='0.75' opacity='0.9'/><circle cx='8' cy='24' r='1' fill='%23FFFFFF'/><circle cx='22' cy='24' r='1' fill='%23FFFFFF'/></svg>",
  TRACK_PIN: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><defs><linearGradient id='pin-grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%234CAF50'/><stop offset='100%25' stop-color='%23388E3C'/></linearGradient></defs><path d='M16 4c-5.5 0-10 4.5-10 10 0 7.5 10 14 10 14s10-6.5 10-14c0-5.5-4.5-10-10-10z' fill='url(%23pin-grad)' stroke='%232E7D32' stroke-width='0.8'/><circle cx='16' cy='14' r='4' fill='%23FFFFFF' stroke='%234CAF50' stroke-width='1'/><circle cx='16' cy='14' r='2' fill='%234CAF50'/><path d='M16 8l2 2-2 2-2-2z' fill='%23FFFFFF' opacity='0.8'/></svg>",
  ERRAND_BOX: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><defs><linearGradient id='box-grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23FF9800'/><stop offset='100%25' stop-color='%23F57C00'/></linearGradient></defs><rect x='6' y='11' width='20' height='16' rx='3' fill='url(%23box-grad)' stroke='%23E65100' stroke-width='0.8'/><path d='M10 11V8c0-3.3 2.7-6 6-6s6 2.7 6 6v3' stroke='%23E65100' stroke-width='2.5' fill='none' stroke-linecap='round'/><rect x='13' y='17' width='6' height='2' fill='%23FFFFFF' rx='1'/><circle cx='16' cy='20' r='1.5' fill='%23FFFFFF'/><path d='M6 15h20' stroke='%23E65100' stroke-width='0.8'/></svg>",
  PHARMACY_CROSS: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><defs><linearGradient id='cross-grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23FFC107'/><stop offset='100%25' stop-color='%23FF8F00'/></linearGradient></defs><circle cx='16' cy='16' r='14' fill='url(%23cross-grad)' stroke='%23FF6F00' stroke-width='0.8'/><rect x='12' y='6' width='8' height='20' fill='%23FFFFFF' rx='2'/><rect x='6' y='12' width='20' height='8' fill='%23FFFFFF' rx='2'/><rect x='13' y='7' width='6' height='18' fill='url(%23cross-grad)' rx='1'/><rect x='7' y='13' width='18' height='6' fill='url(%23cross-grad)' rx='1'/></svg>",
  CLOCK: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'><circle cx='12' cy='12' r='9' stroke='%23888888' stroke-width='2' fill='none'/><path d='M12 7v6l4 2' stroke='%23888888' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>",
  NAIRA: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'><path d='M7 7h10M7 17h10M10 7v10M14 7v10' stroke='%23000000' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>",
  STAR: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'><path d='M12 .587l3.668 7.568L24 9.423l-6 5.883L19.335 24 12 19.771 4.665 24 6 15.306 0 9.423l8.332-1.268z' fill='%23FFD166'/></svg>",
  NAV_EXPLORE: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path d='M3 11h8V3h2v8h8v2h-8v8h-2v-8H3z' fill='%23E0001B'/></svg>",
  NAV_ORDERS: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><rect x='3' y='4' width='18' height='14' rx='2' stroke='%23A0A0A0' stroke-width='1.6' fill='none'/></svg>",
  NAV_TRACK: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path d='M12 21s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12z' stroke='%23A0A0A0' stroke-width='1.6' fill='none'/></svg>",
  NAV_CHAT: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path d='M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' stroke='%23A0A0A0' stroke-width='1.6' fill='none' stroke-linecap='round'/></svg>",
  NAV_PROFILE: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><circle cx='12' cy='8' r='4' stroke='%23A0A0A0' stroke-width='1.6' fill='none'/><path d='M4 20a8 8 0 0116 0' stroke='%23A0A0A0' stroke-width='1.6' fill='none' stroke-linecap='round'/></svg>"
};

// MOCK DATA
const MOCK = {
  location: "Abeokuta, NG",
  promos: [
    { id: 1, title: "₦200 Off your first delivery!", code: "FIRST200", colors: ["#FF4F4A", "#FF944D"] },
    { id: 2, title: "Free delivery on ₦1500+", code: "FREEDLV", colors: ["#7ED957", "#4DD0E1"] },
    { id: 3, title: "10% off on markets", code: "MARKET10", colors: ["#FFD77A", "#FFB8B8"] }
  ],
  categories: [
    { id: "delivery", label: "Book Delivery", bg: "linear-gradient(135deg, #FFE5E5, #FFD1D1)", icon: TruckIcon, color: "#FF4757" },
    { id: "track", label: "Track Order", bg: "linear-gradient(135deg, #E8F8F0, #D1F2DF)", icon: MapPinIcon, color: "#20BF6B" },
    { id: "errand", label: "Errands", bg: "linear-gradient(135deg, #FFF0E6, #FFE1CC)", icon: BriefcaseIcon, color: "#FF9F43" },
    { id: "pharm", label: "Pharmacy", bg: "linear-gradient(135deg, #FFF8E1, #FFECB3)", icon: HeartIcon, color: "#FFC048" }
  ],
  vendors: [] // No mock vendors - force Firebase only
};

const HomePage = () => {
  const [currentPromo, setCurrentPromo] = useState(0);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendorsWithAddOns, setVendorsWithAddOns] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fallback images for business types
  const getBusinessFallbackImage = (businessType) => {
    const imageMap = {
      'restaurant': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      'food': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      'pharmacy': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop',
      'grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
      'fashion': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
    };
    return imageMap[businessType] || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop';
  };

  // Load products and vendors
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Step 1: Load featured products from all vendors
        console.log('🚀 Loading featured products...');
        const allProducts = [];
        
        // Step 2: Load vendors with actual products
        console.log('🚀 Loading vendors with products and add-ons...');
        const vendorsRef = collection(db, 'vendors');
        const vendorsSnapshot = await getDocs(vendorsRef);
        
        if (vendorsSnapshot.empty) {
          console.log('📪 No vendors found in database');
          setVendors([]);
          return;
        }
        
        const activeVendors = [];
        const vendorsWithAddOnsSet = new Set();
        
        // Check each vendor for products and add-ons
        for (const vendorDoc of vendorsSnapshot.docs) {
          const vendorData = vendorDoc.data();

          if (!isVendorPubliclyVisible(vendorData)) {
            console.log(`⏭️ Skipping hidden vendor: ${vendorData.businessName || vendorData.name}`);
            continue;
          }

          const listing = toVendorListingInfo(vendorDoc);

          try {
            const productsRef = collection(db, 'vendors', vendorDoc.id, 'products');
            const productsSnapshot = await getDocs(productsRef);
            
            // Count active products and check for add-ons
            let activeProductCount = 0;
            let hasAddOns = false;
            
            for (const productDoc of productsSnapshot.docs) {
              const productData = productDoc.data();
              
              // Count active products only
              if (productData.isActive !== false) {
                activeProductCount++;
                
                // Add to featured products list (first 3 products from each vendor)
                if (allProducts.length < 20 && activeProductCount <= 3) {
                  allProducts.push({
                    id: productDoc.id,
                    vendorId: vendorDoc.id,
                    vendorName: vendorData.businessName || vendorData.name || 'Unknown Vendor',
                    name: productData.name || productData.title || 'Product',
                    price: productData.price || productData.basePrice || 0,
                    image: productData.image || productData.imageUrl || productData.img,
                    description: productData.description || '',
                    category: productData.category || vendorData.businessType,
                    rating: productData.rating || vendorData.rating || 4.5,
                    available: productData.available !== false,
                    ...productData
                  });
                }
                
                // Check if this product has add-ons
                const addOnsRef = collection(db, 'vendors', vendorDoc.id, 'products', productDoc.id, 'addOns');
                const addOnsSnapshot = await getDocs(addOnsRef);
                
                if (!addOnsSnapshot.empty) {
                  hasAddOns = true;
                  console.log(`✨ Found add-ons for product: ${productData.title || productData.name}`);
                }
              }
            }
            
            if (activeProductCount === 0) {
              console.log(`ℹ️ Vendor listed without active products yet: ${listing.name}`);
            }

            const finalName = listing.name;

            const vendorInfo = {
              id: vendorDoc.id,
              name: finalName,
              subtitle: listing.businessType || vendorData.category || vendorData.type || vendorData.cuisine,
              time: listing.deliveryTime || vendorData.eta || '30-45 min',
              price: listing.deliveryFee ? `₦${listing.deliveryFee}` : 'Free Delivery',
              rating: listing.rating || vendorData.averageRating || 4.5,
              img: resolveVendorImage(listing),
              isOpen: vendorData.isOpen !== false,
              productCount: activeProductCount,
              ...vendorData,
              ...listing,
            };
            
            activeVendors.push(vendorInfo);
            
            if (hasAddOns) {
              vendorsWithAddOnsSet.add(vendorDoc.id);
            }
            
            console.log(`✅ Added vendor: ${finalName} (${activeProductCount} products, add-ons: ${hasAddOns})`);
            
          } catch (vendorError) {
            console.error(`❌ Error processing vendor ${vendorDoc.id}:`, vendorError);
          }
        }
        
        // Sort vendors: those with add-ons first, then by product count
        activeVendors.sort((a, b) => {
          const aHasAddOns = vendorsWithAddOnsSet.has(a.id);
          const bHasAddOns = vendorsWithAddOnsSet.has(b.id);
          
          if (aHasAddOns && !bHasAddOns) return -1;
          if (!aHasAddOns && bHasAddOns) return 1;
          
          return b.productCount - a.productCount; // More products first
        });
        
        // Shuffle and limit products for variety
        const shuffledProducts = allProducts.sort(() => 0.5 - Math.random()).slice(0, 12);
        
        setProducts(shuffledProducts);
        setVendors(activeVendors);
        setVendorsWithAddOns(vendorsWithAddOnsSet);
        
        console.log(`🎉 Successfully loaded ${activeVendors.length} vendors with products`);
        console.log(`🍕 Successfully loaded ${shuffledProducts.length} featured products`);
        console.log(`✨ ${vendorsWithAddOnsSet.size} vendors have premium add-ons`);
        
      } catch (error) {
        console.error('❌ Error during initialization:', error);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
    
    // Auto-refresh when window gains focus (user comes back to tab)
    const handleFocus = () => {
      console.log('👁️ Window focused - auto-refreshing vendors...');
      initializeVendors();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Auto-refresh every 60 seconds to catch new products automatically  
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh: Checking for new vendors and products...');
      initializeVendors();
    }, 60000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(autoRefreshInterval);
    };
  }, []);

  // Auto-rotate promos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % MOCK.promos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Navigation handlers
  const handleCategoryClick = (categoryId) => {
    switch (categoryId) {
      case 'delivery':
        navigate('/book-delivery');
        break;
      case 'track':
        navigate('/track');
        break;
      case 'errand':
        navigate('/book-delivery?type=errand');
        break;
      case 'pharm':
        navigate('/explore?category=pharmacy');
        break;
      default:
        navigate('/explore');
    }
  };

  const handleVendorClick = (vendor) => {
    console.log('🖱️ Vendor clicked:', vendor);
    console.log('🔗 Navigating to vendor page:', vendor.id, vendor.name);
    // Navigate to vendor public page, not dashboard
    navigate(`/vendor/${vendor.id}`);
  };

  // Clear all trending vendors function
  const clearAllVendors = async () => {
    console.log('🗑️ Clear All Vendors button clicked');
    console.log('📊 Current vendors in state:', vendors.length);
    
    if (!confirm('Are you sure you want to remove all vendors from trending? This will delete all vendor data from Firebase.')) {
      console.log('❌ User cancelled deletion');
      return;
    }
    
    setLoading(true);
    console.log('🔍 Starting vendor deletion process...');
    
    try {
      const vendorsRef = collection(db, 'vendors');
      const snapshot = await getDocs(vendorsRef);
      
      console.log('📋 Found', snapshot.docs.length, 'vendor documents in Firebase');
      
      const deletePromises = [];
      snapshot.docs.forEach(doc => {
        console.log('📄 Preparing to delete:', doc.id, doc.data().name || 'Unknown');
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      if (deletePromises.length > 0) {
        console.log('🚀 Executing', deletePromises.length, 'delete operations...');
        await Promise.all(deletePromises);
        console.log(`✅ Successfully removed ${deletePromises.length} vendors from Firebase`);
        toast.success(`Removed ${deletePromises.length} vendors from trending`);
        setVendors([]); // Clear local state
        console.log('🔄 Local state cleared');
      } else {
        console.log('ℹ️ No vendors found in Firebase to remove');
        toast.info('No vendors found to remove');
      }
    } catch (error) {
      console.error('❌ Error during vendor deletion:', error);
      console.error('🔍 Error details:', error.code, error.message);
      toast.error('Failed to remove vendors: ' + error.message);
    } finally {
      setLoading(false);
      console.log('✅ Clear vendors operation completed');
    }
  };

  // Quick local clear (doesn't touch Firebase)
  const clearLocalVendors = () => {
    const count = vendors.length;
    setVendors([]);
    console.log(`🧹 Cleared ${count} vendors from local view`);
    toast.success(`Cleared ${count} vendors from view`);
  };

  // Diagnostic function to check Firebase structure
  const checkFirebaseStructure = async () => {
    console.log('🔍 === FIREBASE STRUCTURE DIAGNOSTIC ===');
    toast.loading('Checking Firebase structure...');
    
    try {
      // Check vendors collection
      const vendorsRef = collection(db, 'vendors');
      const vendorsSnapshot = await getDocs(vendorsRef);
      
      console.log(`📊 VENDORS COLLECTION: Found ${vendorsSnapshot.docs.length} vendors`);
      
      if (vendorsSnapshot.empty) {
        console.log('❌ NO VENDORS FOUND - This is why nothing shows in trending!');
        toast.error('No vendors found in database');
        return;
      }
      
      let totalProducts = 0;
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        console.log(`\n🏪 VENDOR: ${vendorData.businessName || vendorData.name || 'Unknown'} (ID: ${vendorDoc.id})`);
        console.log(`   - isActive: ${vendorData.isActive !== false ? 'YES' : 'NO'}`);
        console.log(`   - businessType: ${vendorData.businessType || 'Not set'}`);
        console.log(`   - category: ${vendorData.category || 'Not set'}`);
        
        // Check this vendor's products
        const productsRef = collection(db, 'vendors', vendorDoc.id, 'products');
        const productsSnapshot = await getDocs(productsRef);
        
        console.log(`   📦 PRODUCTS: ${productsSnapshot.docs.length} products found`);
        totalProducts += productsSnapshot.docs.length;
        
        productsSnapshot.docs.forEach(productDoc => {
          const productData = productDoc.data();
          console.log(`      - ${productData.title || productData.name || 'Unnamed Product'}`);
          console.log(`        Category: ${productData.category || 'Not set'}`);
          console.log(`        Active: ${productData.isActive !== false ? 'YES' : 'NO'}`);
        });
      }
      
      console.log(`\n📈 SUMMARY:`);
      console.log(`   - Total Vendors: ${vendorsSnapshot.docs.length}`);
      console.log(`   - Total Products: ${totalProducts}`);
      
      toast.success(`Found ${vendorsSnapshot.docs.length} vendors, ${totalProducts} products - Check console for details`);
      
    } catch (error) {
      console.error('❌ Diagnostic error:', error);
      toast.error('Diagnostic failed: ' + error.message);
    }
  };

  const handleRemoveTestData = async () => {
    if (!window.confirm('Remove all test data (Sweet Sensations, Quick Bites, etc.) from Firebase? This cannot be undone.')) return;
    
    try {
      setLoading(true);
      const result = await removeTestData();
      if (result.success) {
        console.log('✅ Test data removed successfully');
        alert('Test data removed successfully!');
        // Refresh the vendors list
        const vendorsRef = collection(db, 'vendors');
        const vendorsSnapshot = await getDocs(vendorsRef);
        const fetchedVendors = vendorsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().businessName || doc.data().name,
          subtitle: doc.data().businessType || doc.data().category,
          time: doc.data().deliveryTime || '30-45 min',
          price: `₦${doc.data().deliveryFee || 200}`,
          rating: doc.data().rating || 4.5,
          img: resolveVendorImage(doc.data()),
          isActive: doc.data().isActive !== false,
          isFirebaseData: true
        })).filter(vendor => {
          // Only include vendors with proper names and active status
          return vendor.isActive && vendor.name && vendor.name.trim() !== '';
        });
        setVendors(fetchedVendors);
      } else {
        console.error('❌ Failed to remove test data:', result.error);
        alert('Failed to remove test data: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error removing test data:', error);
      alert('Error removing test data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };





  return (
    <div className="max-w-[430px] mx-auto bg-white min-h-screen pb-20">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
        <button className="flex items-center gap-2">
          <img src={ICONS.LOCATION_PIN} alt="location" className="w-5 h-5" />
          <div className="text-left">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Deliver to</div>
            <div className="text-sm font-semibold text-gray-900">{MOCK.location}</div>
          </div>
        </button>
        <button className="relative">
          <img src={ICONS.BELL} alt="notifications" className="w-6 h-6" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full border-2 border-white"></span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-5 py-3 bg-white">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 rounded-xl">
          <img src={ICONS.SEARCH} alt="search" className="w-[18px] h-[18px]" />
          <input 
            type="text" 
            placeholder="Search restaurants, shops..." 
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-500"
          />
          <img src={ICONS.MIC} alt="voice search" className="w-[18px] h-[18px]" />
        </div>
      </div>



      {/* Content */}
      <div className="px-5 bg-gray-50">
        
        {/* Promo Carousel */}
        <div className="relative mt-4 mb-6">
          <div className="overflow-hidden rounded-[20px]">
            <div 
              className="flex transition-transform duration-300"
              style={{ transform: `translateX(-${currentPromo * 100}%)` }}
            >
              {MOCK.promos.map((promo) => (
                <div
                  key={promo.id}
                  className="min-w-full px-6 py-6"
                  style={{
                    background: `linear-gradient(90deg, ${promo.colors[0]}, ${promo.colors[1]})`
                  }}
                >
                  <h2 className="text-2xl font-bold text-white mb-2">{promo.title}</h2>
                  <p className="text-white mb-4">
                    Use code <strong>{promo.code}</strong>
                  </p>
                  <button className="px-6 py-2 bg-white text-red-500 font-bold text-sm rounded-xl">
                    Order Now
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Promo Indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {MOCK.promos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPromo(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentPromo ? 'w-6 bg-red-500' : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Categories */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Categories</h3>
            <button className="text-sm font-semibold text-red-500">See All</button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {MOCK.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border border-white/20"
                  style={{ background: cat.bg }}
                >
                  <cat.icon className="w-8 h-8" style={{ color: cat.color }} />
                </div>
                <span className="text-xs font-medium text-gray-900 text-center">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Featured Products</h3>
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
            <button 
              onClick={() => navigate('/explore')}
              className="text-sm font-semibold text-red-500"
            >
              See All
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {products.length === 0 && !loading ? (
              <div className="w-full text-center py-8 text-gray-500">
                <p className="text-sm">No products found</p>
                <p className="text-xs mt-1">Products will appear here once vendors add them</p>
                <div className="mt-3 space-y-2">
                  <button 
                    onClick={() => navigate('/vendor/register')}
                    className="px-4 py-2 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Register New Vendor
                  </button>
                  <button 
                    onClick={checkFirebaseStructure}
                    className="px-4 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    🔍 Check Database
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="w-full text-center py-8 text-gray-500">
                <p className="text-sm">Loading products...</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-3 px-5">
                  <span className="text-sm text-gray-600">{products.length} featured product(s)</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={clearLocalVendors}
                      className="px-3 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors"
                      title="Clear from view only (keeps in database)"
                    >
                      Clear View
                    </button>
                    <button 
                      onClick={clearAllVendors}
                      className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                      title="Delete from database permanently"
                    >
                      Delete All
                    </button>
                  </div>
                </div>
                {products.map((product) => {
                console.log('🍕 Rendering product card:', product.name, '(ID:', product.id, ')');
                return (
                <button
                  key={`${product.vendorId}-${product.id}`}
                  onClick={() => {
                    console.log('🔗 Navigating to product:', product.name, 'from vendor:', product.vendorName);
                    navigate(`/vendor/${product.vendorId}?product=${product.id}`);
                  }}
                  className="flex-shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm transition-transform active:scale-95 hover:shadow-md"
                  title={`${product.name} - ₦${product.price}`}
                >
                <div className="relative h-32">
                  <img 
                    src={product.image || getBusinessFallbackImage(product.category?.toLowerCase())} 
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('🖼️ Product image failed to load:', product.name);
                      console.log('📷 Original image URL:', e.target.src);
                      console.log('🔄 Using fallback for category:', product.category);
                      e.target.src = getBusinessFallbackImage(product.category?.toLowerCase());
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-white/95 px-2 py-1 rounded-xl flex items-center gap-1">
                    <img src={ICONS.STAR} alt="rating" className="w-3 h-3" />
                    <span className="text-xs font-bold">{product.rating}</span>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-red-500 text-white px-2 py-1 rounded-xl">
                    <span className="text-xs font-bold">₦{product.price}</span>
                  </div>
                  {!product.available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Out of Stock</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-bold text-gray-900 mb-0.5 truncate">{product.name}</h4>
                  <p className="text-xs text-blue-600 font-medium mb-1 truncate">{product.vendorName}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {product.category && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <span>{product.category}</span>
                        </div>
                      )}
                      {product.rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">★</span>
                          <span className="text-gray-700 font-medium">{product.rating}</span>
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-red-600">₦{product.price}</span>
                  </div>
                </div>
                </button>
                );
              })}
              </>
            )}
          </div>
        </section>

        {/* Promo Cards Row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl p-5 relative min-h-[140px]">
            <h3 className="text-lg font-bold text-gray-900">₦400 off</h3>
            <p className="text-sm text-gray-700">orders over ₦2500</p>
            <div className="absolute bottom-4 right-4 text-5xl opacity-70">🍔</div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-5 relative min-h-[140px]">
            <h3 className="text-lg font-bold text-gray-900">Explore Markets</h3>
            <p className="text-sm text-gray-700 leading-tight">Groceries, vegetables, and uere delivered to you</p>
            <div className="absolute bottom-4 right-4 text-5xl opacity-70">🥗</div>
          </div>
        </div>

        {/* For You Section - Recently Active Vendors */}
        <section className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">For You</h3>
          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
                  <div className="bg-gray-200 h-32"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : vendors.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <div className="text-4xl mb-2">🏪</div>
                <p className="text-gray-500">No vendors available right now</p>
              </div>
            ) : (
              vendors.slice(0, 4).map((vendor, index) => (
                <button
                  key={vendor.id || index}
                  onClick={() => handleVendorClick(vendor)}
                  className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 text-left"
                  title={`View ${vendor.name}`}
                >
                <div className="relative h-32 bg-gray-100">
                  {vendor.img ? (
                  <img 
                    src={vendor.img} 
                    alt={vendor.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = getVendorPlaceholder();
                    }}
                  />
                  ) : (
                    <img
                      src={getVendorPlaceholder()}
                      alt={vendor.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Premium Add-ons Badge */}
                  {vendorsWithAddOns.has(vendor.id) && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="text-xs">✨</span>
                      <span className="text-[10px] font-bold">Premium</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-bold text-gray-900 mb-0.5 truncate">{vendor.businessName || vendor.name}</h4>
                  <p className="text-xs text-blue-600 font-medium mb-1 truncate">{vendor.subtitle}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-gray-600">
                        <img src={ICONS.CLOCK} alt="time" className="w-3 h-3" />
                        <span>{vendor.time}</span>
                      </div>
                      {vendor.rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">★</span>
                          <span className="text-gray-700 font-medium">{vendor.rating}</span>
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-green-600">{vendor.price}</span>
                  </div>
                </div>
                </button>
              ))
            )}
          </div>
        </section>

      </div>



      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
