// One-time Cloud Function to create test vendors with categories and addons
// 🔒 SECURITY UPDATE: Requires admin authentication
// Deploy: firebase deploy --only functions:createTestVendors
// Call: Use Firebase SDK with auth token (no longer public)

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

exports.createTestVendors = functions.runWith({
  timeoutSeconds: 540,
  memory: '1GB'
}).https.onCall(async (data, context) => {
  // 🔒 SECURITY: Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '🔒 Authentication required. Please sign in.'
    );
  }

  // 🔒 SECURITY: Check admin role
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      '🔒 Admin access required. This function is restricted.'
    );
  }

  console.log('✅ Admin authenticated:', context.auth.uid);
  
  try {
    const db = admin.firestore();
    console.log('🚀 Starting vendor creation...');
  
    const testVendors = [
    {
      businessName: "🍕 Pizza Paradise Abeokuta",
      name: "Pizza Paradise Abeokuta",
      category: "restaurant",
      cuisine: "Italian",
      rating: 4.8,
      isOpen: true,
      deliveryTime: "25-35 min",
      minimumOrder: 1500,
      deliveryFee: 500,
      address: "MKO Abiola Way, Abeokuta",
      phone: "+234 806 123 4567",
      description: "Authentic Italian pizza, pasta & wings. Fresh ingredients daily!",
      coordinates: new admin.firestore.GeoPoint(7.1575, 3.3470),
      categories: ["food"],
      acceptsOrders: true,
      products: [
        { name: "Margherita Pizza", description: "Classic tomato, mozzarella, fresh basil", basePrice: 3500, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002", prepTime: 20 },
        { name: "Pepperoni Pizza", description: "Spicy pepperoni with extra cheese", basePrice: 4200, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e", prepTime: 20 },
        { name: "BBQ Chicken Pizza", description: "Grilled chicken, BBQ sauce, onions", basePrice: 4500, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38", prepTime: 25 },
        { name: "Vegetarian Supreme", description: "Mushrooms, peppers, olives, onions", basePrice: 3800, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1511689660979-10d2b1aada49", prepTime: 22 },
        { name: "Chicken Wings (6pcs)", description: "Crispy wings with choice of sauce", basePrice: 2500, category: "Appetizers", imageUrl: "https://images.unsplash.com/photo-1608039755401-742074f0548d", prepTime: 15 },
        { name: "Garlic Bread", description: "Toasted bread with garlic butter", basePrice: 800, category: "Sides", imageUrl: "https://images.unsplash.com/photo-1573140401552-388e8f7f5c8f", prepTime: 10 },
        { name: "Coca Cola 50cl", description: "Chilled soft drink", basePrice: 300, category: "Drinks", imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7", prepTime: 1 },
        { name: "Chapman", description: "Popular Nigerian soft drink mix", basePrice: 800, category: "Drinks", imageUrl: "https://images.unsplash.com/photo-1546173159-315724a31696", prepTime: 5 }
      ]
    },
    {
      businessName: "🍛 Mama's Kitchen Abeokuta",
      name: "Mama's Kitchen Abeokuta",
      category: "restaurant",
      cuisine: "Nigerian",
      rating: 4.9,
      isOpen: true,
      deliveryTime: "30-40 min",
      minimumOrder: 1000,
      deliveryFee: 400,
      address: "Panseke, Abeokuta",
      phone: "+234 807 234 5678",
      description: "Traditional Nigerian delicacies. Home-cooked taste!",
      coordinates: new admin.firestore.GeoPoint(7.1600, 3.3500),
      categories: ["food"],
      acceptsOrders: true,
      products: [
        { name: "Jollof Rice Special", description: "Nigerian jollof rice with chicken", basePrice: 2800, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c", prepTime: 25 },
        { name: "Fried Rice Combo", description: "Fried rice with chicken & plantain", basePrice: 3000, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b", prepTime: 30 },
        { name: "Pounded Yam & Egusi", description: "Fresh pounded yam with rich egusi soup", basePrice: 3500, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26", prepTime: 35 },
        { name: "Amala & Ewedu", description: "Amala with ewedu and gbegiri", basePrice: 2000, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246", prepTime: 30 },
        { name: "Suya Platter", description: "Spicy grilled beef with onions", basePrice: 2500, category: "Appetizers", imageUrl: "https://images.unsplash.com/photo-1529042410759-befb1204b468", prepTime: 20 },
        { name: "Pepper Soup", description: "Spicy Nigerian pepper soup", basePrice: 1800, category: "Appetizers", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd", prepTime: 25 },
        { name: "Moi Moi", description: "Steamed bean pudding", basePrice: 600, category: "Sides", imageUrl: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e", prepTime: 15 },
        { name: "Fried Plantain", description: "Sweet ripe plantain", basePrice: 500, category: "Sides", imageUrl: "https://images.unsplash.com/photo-1587496679742-bad5b7e1c8e4", prepTime: 10 }
      ]
    },
    {
      businessName: "💊 HealthPlus Pharmacy",
      name: "HealthPlus Pharmacy",
      category: "pharmacy",
      rating: 4.7,
      isOpen: true,
      deliveryTime: "20-30 min",
      minimumOrder: 500,
      deliveryFee: 300,
      address: "Kuto, Abeokuta",
      phone: "+234 808 345 6789",
      description: "Your trusted 24/7 pharmacy. Fast delivery!",
      coordinates: new admin.firestore.GeoPoint(7.1550, 3.3440),
      categories: ["pharmacy"],
      acceptsOrders: true,
      is24Hours: true,
      products: [
        { name: "Paracetamol 500mg (10 tabs)", description: "Pain relief and fever reducer", basePrice: 500, category: "Pain Relief", imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae" },
        { name: "Ibuprofen 400mg", description: "Anti-inflammatory pain reliever", basePrice: 800, category: "Pain Relief", imageUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88" },
        { name: "Vitamin C 1000mg (30 tabs)", description: "Immune system support", basePrice: 2500, category: "Vitamins", imageUrl: "https://images.unsplash.com/photo-1550572017-4c6d5f039a0c" },
        { name: "Multivitamin Complex", description: "Complete daily nutrition", basePrice: 3500, category: "Vitamins", imageUrl: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2" },
        { name: "Cough Syrup 100ml", description: "Relieves cough and cold symptoms", basePrice: 1200, category: "Cold & Flu", imageUrl: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926" },
        { name: "Hand Sanitizer 500ml", description: "Alcohol-based hand sanitizer", basePrice: 1500, category: "Hygiene", imageUrl: "https://images.unsplash.com/photo-1584744982491-665216d95f8b" },
        { name: "Face Masks (Pack of 50)", description: "Disposable protective masks", basePrice: 2000, category: "Hygiene", imageUrl: "https://images.unsplash.com/photo-1585435465945-62faa0a44eb9" },
        { name: "First Aid Kit", description: "Complete first aid essentials", basePrice: 5000, category: "Medical Supplies", imageUrl: "https://images.unsplash.com/photo-1603398938378-e54eab446dde" }
      ]
    },
    {
      businessName: "🛒 Fresh Market Hub",
      name: "Fresh Market Hub",
      category: "market",
      rating: 4.6,
      isOpen: true,
      deliveryTime: "30-45 min",
      minimumOrder: 1500,
      deliveryFee: 400,
      address: "Kuto Market, Abeokuta",
      phone: "+234 809 456 7890",
      description: "Fresh groceries and produce delivered to your door",
      coordinates: new admin.firestore.GeoPoint(7.1540, 3.3425),
      categories: ["market", "groceries"],
      acceptsOrders: true,
      products: [
        { name: "Fresh Tomatoes (1kg)", description: "Farm-fresh red tomatoes", basePrice: 1200, category: "Vegetables", imageUrl: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337" },
        { name: "Onions (1kg)", description: "Fresh red onions", basePrice: 800, category: "Vegetables", imageUrl: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb" },
        { name: "Fresh Peppers (500g)", description: "Hot scotch bonnet peppers", basePrice: 600, category: "Vegetables", imageUrl: "https://images.unsplash.com/photo-1583497792325-01afd2a1e67b" },
        { name: "White Rice (5kg)", description: "Premium quality long grain rice", basePrice: 5500, category: "Grains", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c" },
        { name: "Beans (2kg)", description: "Brown honey beans", basePrice: 2800, category: "Grains", imageUrl: "https://images.unsplash.com/photo-1596797038530-2c107229654b" },
        { name: "Palm Oil (1L)", description: "Fresh red palm oil", basePrice: 1800, category: "Cooking Oil", imageUrl: "https://images.unsplash.com/photo-1627662168781-27465c0ab220" },
        { name: "Groundnut Oil (1L)", description: "Pure groundnut cooking oil", basePrice: 2200, category: "Cooking Oil", imageUrl: "https://images.unsplash.com/photo-1615485500834-bc10199bc768" },
        { name: "Eggs (Crate of 30)", description: "Fresh farm eggs", basePrice: 2500, category: "Proteins", imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f" }
      ]
    },
    {
      businessName: "🍔 Burger Bros Abeokuta",
      name: "Burger Bros Abeokuta",
      category: "restaurant",
      cuisine: "Fast Food",
      rating: 4.5,
      isOpen: true,
      deliveryTime: "20-30 min",
      minimumOrder: 1200,
      deliveryFee: 500,
      address: "Oke-Ilewo, Abeokuta",
      phone: "+234 810 567 8901",
      description: "Juicy burgers, crispy fries & milkshakes!",
      coordinates: new admin.firestore.GeoPoint(7.1620, 3.3480),
      categories: ["food"],
      acceptsOrders: true,
      products: [
        { name: "Classic Beef Burger", description: "Juicy beef patty with cheese & veggies", basePrice: 2500, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd", prepTime: 15 },
        { name: "Chicken Burger", description: "Crispy chicken fillet burger", basePrice: 2800, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086", prepTime: 15 },
        { name: "Double Beef Burger", description: "Two beef patties, double cheese", basePrice: 3500, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349", prepTime: 18 },
        { name: "French Fries (Large)", description: "Crispy golden fries", basePrice: 1200, category: "Sides", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877", prepTime: 10 },
        { name: "Chicken Nuggets (8pcs)", description: "Crispy breaded chicken nuggets", basePrice: 2000, category: "Sides", imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710", prepTime: 12 },
        { name: "Chocolate Milkshake", description: "Thick chocolate milkshake", basePrice: 1500, category: "Drinks", imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699", prepTime: 5 },
        { name: "Vanilla Milkshake", description: "Creamy vanilla milkshake", basePrice: 1500, category: "Drinks", imageUrl: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4", prepTime: 5 }
      ]
    }
  ];
  
  let vendorsCreated = 0;
  let productsCreated = 0;
  let categoriesCreated = 0;
  let addonsCreated = 0;
  
  for (const vendor of testVendors) {
      const products = vendor.products;
      delete vendor.products;
      
      vendor.createdAt = admin.firestore.FieldValue.serverTimestamp();
      vendor.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
      const vendorRef = await db.collection('vendors').add(vendor);
      vendorsCreated++;
      console.log(`✓ Vendor created: ${vendor.businessName}`);
      
      // Create categories for this vendor
      const categoryMap = {};
      const categories = [...new Set(products.map(p => p.category))];
      
      for (let i = 0; i < categories.length; i++) {
        const categoryName = categories[i];
        const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-');
        
        const categoryData = {
          name: categoryName,
          slug: categorySlug,
          priority: i + 1,
          vendorId: vendorRef.id,
          active: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const categoryRef = await vendorRef.collection('categories').add(categoryData);
        categoryMap[categoryName] = categoryRef.id;
        categoriesCreated++;
      }
      
      // Create products with their categories
      for (const product of products) {
        const productData = {
          ...product,
          price: product.basePrice,
          vendorId: vendorRef.id,
          categoryId: categoryMap[product.category] || null,
          active: true,
          isActive: true,
          available: true,
          isAvailable: true,
          measurementType: "portion",
          preparationTime: product.prepTime || 20,
          tags: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const productRef = await vendorRef.collection('products').add(productData);
        productsCreated++;
        
        // Add sample addons for food items
        if (vendor.category === 'restaurant' && product.basePrice > 1000) {
          const addons = [
            { name: 'Extra Cheese', price: 500 },
            { name: 'Extra Sauce', price: 300 },
            { name: 'Double Portion', price: product.basePrice * 0.5 }
          ];
          
          for (const addon of addons) {
            await productRef.collection('addons').add({
              ...addon,
              active: true,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            addonsCreated++;
          }
        }
      }
      
      console.log(`  → Created ${products.length} products, ${categories.length} categories`);
    }
    
    // Return data for onCall function (not HTTP response)
    return {
      success: true,
      vendorsCreated,
      productsCreated,
      categoriesCreated,
      addonsCreated,
      message: 'Test vendors with categories and addons created successfully!'
    };
    
  } catch (error) {
    console.error('❌ Error creating vendors:', error);
    console.error('Error stack:', error.stack);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to create vendors: ${error.message}`
    );
  }
});
