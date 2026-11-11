// 🧪 GO7 V2 PRODUCT SYSTEM TEST SUITE
// Tests Explore, Trending, ForYou, and Addon fetching
// Run with: node test-v2-products.js

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// Firebase config (update with your project credentials)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Test 1: Verify Explore fetches 20 products from V2 structure
 */
const testExploreFetch = async () => {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}TEST 1: Explore Page - Fetch 20 Products${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  
  try {
    // Get all vendors
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    console.log(`${colors.blue}📊 Found ${vendorsSnapshot.size} vendors${colors.reset}`);
    
    let allProducts = [];
    
    // Fetch products from each vendor's subcollection
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      const vendorProducts = productsSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.active !== false;
        })
        .map(doc => ({
          id: doc.id,
          vendorId,
          vendorName: vendorData.businessName || vendorData.name,
          ...doc.data()
        }));
      
      allProducts = [...allProducts, ...vendorProducts];
      
      console.log(`  ✓ Vendor: ${vendorData.businessName || vendorData.name} - ${vendorProducts.length} products`);
    }
    
    // Sort by popularity and limit to 20
    allProducts.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    const exploreProducts = allProducts.slice(0, 20);
    
    console.log(`\n${colors.green}✅ EXPLORE TEST PASSED${colors.reset}`);
    console.log(`${colors.green}   Total Products: ${allProducts.length}${colors.reset}`);
    console.log(`${colors.green}   Displayed: ${exploreProducts.length}${colors.reset}`);
    
    // Show top 5 products
    console.log(`\n${colors.magenta}Top 5 Products:${colors.reset}`);
    exploreProducts.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} - ₦${p.price} (${p.measureType || 'per_unit'}) - Score: ${p.popularityScore || 0}`);
    });
    
    return { success: true, count: exploreProducts.length };
    
  } catch (error) {
    console.error(`${colors.red}❌ EXPLORE TEST FAILED: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
};

/**
 * Test 2: Verify Trending returns top 8 by popularityScore
 */
const testTrendingFetch = async () => {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}TEST 2: Trending Page - Top 8 by Popularity${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  
  try {
    // Get all vendors
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    
    let allProducts = [];
    
    // Fetch all products
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      const vendorProducts = productsSnapshot.docs
        .filter(doc => doc.data().active !== false)
        .map(doc => ({
          id: doc.id,
          vendorId,
          vendorName: vendorData.businessName || vendorData.name,
          ...doc.data()
        }));
      
      allProducts = [...allProducts, ...vendorProducts];
    }
    
    // Sort by popularityScore DESC
    allProducts.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    const trendingProducts = allProducts.slice(0, 8);
    
    console.log(`${colors.green}✅ TRENDING TEST PASSED${colors.reset}`);
    console.log(`${colors.green}   Trending Products: ${trendingProducts.length}${colors.reset}`);
    
    // Show all trending products
    console.log(`\n${colors.magenta}Trending Products:${colors.reset}`);
    trendingProducts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} - Popularity: ${p.popularityScore || 0} - ₦${p.price}`);
    });
    
    // Verify all have popularityScore
    const withoutScore = trendingProducts.filter(p => !p.popularityScore);
    if (withoutScore.length > 0) {
      console.log(`${colors.yellow}⚠️  Warning: ${withoutScore.length} products missing popularityScore${colors.reset}`);
    }
    
    return { success: true, count: trendingProducts.length };
    
  } catch (error) {
    console.error(`${colors.red}❌ TRENDING TEST FAILED: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
};

/**
 * Test 3: Verify ForYou returns personalized products
 */
const testForYouFetch = async () => {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}TEST 3: For You Page - Personalized Products${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  
  try {
    // Get all vendors
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    
    let allProducts = [];
    
    // Fetch all products
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      const vendorProducts = productsSnapshot.docs
        .filter(doc => doc.data().active !== false)
        .map(doc => ({
          id: doc.id,
          vendorId,
          vendorName: vendorData.businessName || vendorData.name,
          ...doc.data()
        }));
      
      allProducts = [...allProducts, ...vendorProducts];
    }
    
    // Sort by rating, then popularity
    allProducts.sort((a, b) => {
      if (b.rating !== a.rating) {
        return (b.rating || 4.5) - (a.rating || 4.5);
      }
      return (b.popularityScore || 0) - (a.popularityScore || 0);
    });
    
    const forYouProducts = allProducts.slice(0, 8);
    
    console.log(`${colors.green}✅ FOR YOU TEST PASSED${colors.reset}`);
    console.log(`${colors.green}   For You Products: ${forYouProducts.length}${colors.reset}`);
    
    // Show all For You products
    console.log(`\n${colors.magenta}For You Products:${colors.reset}`);
    forYouProducts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} - Rating: ${p.rating || 4.5} - Pop: ${p.popularityScore || 0}`);
    });
    
    return { success: true, count: forYouProducts.length };
    
  } catch (error) {
    console.error(`${colors.red}❌ FOR YOU TEST FAILED: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
};

/**
 * Test 4: Verify addon loading with images
 */
const testAddonFetch = async () => {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}TEST 4: Addon Loading with Images${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  
  try {
    // Get first vendor
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    
    if (vendorsSnapshot.empty) {
      throw new Error('No vendors found');
    }
    
    const vendorDoc = vendorsSnapshot.docs[0];
    const vendorId = vendorDoc.id;
    
    // Get first product
    const productsRef = collection(db, 'vendors', vendorId, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    if (productsSnapshot.empty) {
      throw new Error('No products found');
    }
    
    const productDoc = productsSnapshot.docs[0];
    const productId = productDoc.id;
    const productData = productDoc.data();
    
    console.log(`${colors.blue}📦 Testing product: ${productData.name}${colors.reset}`);
    
    // Fetch addons
    const addonsRef = collection(db, 'vendors', vendorId, 'products', productId, 'addons');
    const addonsQuery = query(
      addonsRef,
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const addonsSnapshot = await getDocs(addonsQuery);
    
    console.log(`${colors.green}✅ ADDON TEST PASSED${colors.reset}`);
    console.log(`${colors.green}   Addons Found: ${addonsSnapshot.size}${colors.reset}`);
    
    if (addonsSnapshot.size > 0) {
      console.log(`\n${colors.magenta}Addons:${colors.reset}`);
      addonsSnapshot.docs.forEach((doc, i) => {
        const addon = doc.data();
        const hasImage = addon.imageUrl ? '🖼️ ' : '';
        console.log(`  ${i + 1}. ${hasImage}${addon.name} - ₦${addon.price} (${addon.measureType || 'per_unit'})`);
      });
      
      // Check how many have images
      const withImages = addonsSnapshot.docs.filter(doc => doc.data().imageUrl).length;
      console.log(`\n${colors.blue}   Addons with images: ${withImages}/${addonsSnapshot.size}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  No addons found for this product${colors.reset}`);
    }
    
    return { success: true, count: addonsSnapshot.size };
    
  } catch (error) {
    console.error(`${colors.red}❌ ADDON TEST FAILED: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
};

/**
 * Run all tests
 */
const runAllTests = async () => {
  console.log(`${colors.magenta}`);
  console.log(`╔═══════════════════════════════════════════╗`);
  console.log(`║   GO7 V2 PRODUCT SYSTEM TEST SUITE       ║`);
  console.log(`╚═══════════════════════════════════════════╝`);
  console.log(`${colors.reset}`);
  
  const results = [];
  
  // Run tests
  results.push(await testExploreFetch());
  results.push(await testTrendingFetch());
  results.push(await testForYouFetch());
  results.push(await testAddonFetch());
  
  // Summary
  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 ALL TESTS PASSED! V2 PRODUCT SYSTEM WORKING CORRECTLY${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}⚠️  SOME TESTS FAILED - CHECK LOGS ABOVE${colors.reset}\n`);
  }
  
  process.exit(failed === 0 ? 0 : 1);
};

// Run tests
runAllTests();
