/**
 * 🌱 TEST DATA SEEDER
 * Creates sample vendors and products for testing the new structure
 */

import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export const seedTestData = async () => {
  console.log('🌱 Seeding test data...');
  
  try {
    const batch = writeBatch(db);
    
    // Create test vendors
    const testVendors = [
      {
        id: 'test-vendor-1',
        businessName: 'Test Restaurant',
        name: 'Test Restaurant',
        isActive: true,
        isOnline: true,
        rating: 4.8,
        deliveryTime: '25-35 mins',
        deliveryFee: 200,
        profileImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
        businessLogo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
        category: 'restaurant',
        categories: ['food']
      },
      {
        id: 'test-vendor-2', 
        businessName: 'Test Grocery Store',
        name: 'Test Grocery Store',
        isActive: true,
        isOnline: true,
        rating: 4.5,
        deliveryTime: '30-45 mins',
        deliveryFee: 300,
        profileImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
        businessLogo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
        category: 'grocery',
        categories: ['grocery']
      }
    ];
    
    // Create vendors
    for (const vendor of testVendors) {
      const vendorRef = doc(db, 'vendors', vendor.id);
      batch.set(vendorRef, vendor);
      console.log(`📝 Adding vendor: ${vendor.businessName}`);
    }
    
    // Create test products with add-ons for each vendor
    const testProducts = [
      // Restaurant products
      {
        vendorId: 'test-vendor-1',
        products: [
          {
            id: 'burger-1',
            title: 'Classic Burger',
            name: 'Classic Burger',
            details: 'Juicy beef patty with lettuce, tomato, and cheese',
            description: 'Juicy beef patty with lettuce, tomato, and cheese',
            basePrice: 2500,
            price: 2500,
            imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
            category: 'food',
            isActive: true,
            isFeatured: true,
            stock: 50,
            addons: [
              {
                id: 'extra-cheese',
                name: 'Extra Cheese',
                price: 200,
                description: 'Melted cheddar cheese',
                imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400',
                measurementType: 'portion',
                minQty: 1,
                maxQty: 3,
                isActive: true
              },
              {
                id: 'fries',
                name: 'French Fries',
                price: 500,
                description: 'Crispy golden fries',
                imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400',
                measurementType: 'portion',
                minQty: 1,
                maxQty: 2,
                isActive: true
              }
            ]
          },
          {
            id: 'pizza-1',
            title: 'Margherita Pizza',
            name: 'Margherita Pizza',
            details: 'Fresh mozzarella, tomato sauce, and basil',
            description: 'Fresh mozzarella, tomato sauce, and basil',
            basePrice: 3500,
            price: 3500,
            imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400',
            image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400',
            category: 'food',
            isActive: true,
            isFeatured: true,
            stock: 30,
            addons: [
              {
                id: 'pepperoni',
                name: 'Pepperoni',
                price: 400,
                description: 'Spicy pepperoni slices',
                imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
                measurementType: 'portion',
                minQty: 1,
                maxQty: 2,
                isActive: true
              },
              {
                id: 'mushrooms',
                name: 'Mushrooms',
                price: 300,
                description: 'Fresh button mushrooms',
                imageUrl: 'https://images.unsplash.com/photo-1506752073481-50e69bb26b76?w=400',
                measurementType: 'portion',
                minQty: 1,
                maxQty: 2,
                isActive: true
              }
            ]
          }
        ]
      },
      // Grocery products  
      {
        vendorId: 'test-vendor-2',
        products: [
          {
            id: 'apple-1',
            title: 'Fresh Apples',
            name: 'Fresh Apples',
            details: 'Crispy red apples - 1kg pack',
            description: 'Crispy red apples - 1kg pack',
            basePrice: 800,
            price: 800,
            imageUrl: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400',
            image: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400',
            category: 'grocery',
            isActive: true,
            isFeatured: true,
            stock: 100
          },
          {
            id: 'bread-1',
            title: 'Wheat Bread',
            name: 'Wheat Bread',
            details: 'Fresh baked whole wheat bread',
            description: 'Fresh baked whole wheat bread',
            basePrice: 600,
            price: 600,
            imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
            image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
            category: 'grocery',
            isActive: true,
            isFeatured: false,
            stock: 25
          }
        ]
      }
    ];
    
    // Add products and their add-ons to each vendor
    for (const vendorProducts of testProducts) {
      const { vendorId, products } = vendorProducts;
      
      for (const product of products) {
        // Add product (without addons in the product document)
        const { addons, ...productData } = product;
        const productRef = doc(db, 'vendors', vendorId, 'products', product.id);
        batch.set(productRef, productData);
        console.log(`📦 Adding product: ${product.name} to ${vendorId}`);
        
        // Add add-ons to vendors/{vendorId}/products/{productId}/addons
        if (addons && addons.length > 0) {
          for (const addon of addons) {
            const addonRef = doc(db, 'vendors', vendorId, 'products', product.id, 'addons', addon.id);
            batch.set(addonRef, addon);
            console.log(`🎯 Adding addon: ${addon.name} to product ${product.name}`);
          }
        }
      }
    }
    
    // Commit all changes
    await batch.commit();
    const totalProducts = testProducts.reduce((sum, v) => sum + v.products.length, 0);
    const totalAddons = testProducts.reduce((sum, v) => 
      sum + v.products.reduce((pSum, p) => pSum + (p.addons ? p.addons.length : 0), 0), 0
    );
    
    console.log('✅ Test data seeded successfully!');
    console.log('📊 Created:');
    console.log(`  - ${testVendors.length} vendors`);
    console.log(`  - ${totalProducts} products`);
    console.log(`  - ${totalAddons} add-ons`);
    
    return { success: true, message: 'Test data seeded successfully' };
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    return { success: false, error: error.message };
  }
};

// Function to clear test data
export const clearTestData = async () => {
  console.log('🧹 Clearing test data...');
  
  try {
    const batch = writeBatch(db);
    
    // Delete test vendors (this will also delete subcollections)
    const testVendorIds = ['test-vendor-1', 'test-vendor-2'];
    
    for (const vendorId of testVendorIds) {
      const vendorRef = doc(db, 'vendors', vendorId);
      batch.delete(vendorRef);
    }
    
    await batch.commit();
    console.log('✅ Test data cleared successfully!');
    
    return { success: true, message: 'Test data cleared successfully' };
    
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    return { success: false, error: error.message };
  }
};