import { db } from '../config/firebase';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';

/**
 * 🔧 PRODUCT DATABASE SEEDER
 * Creates sample products for testing if none exist
 */

export class ProductSeeder {
  
  static async seedSampleProducts(vendorId: string = 'test-vendor-001') {
    console.log('🌱 SEEDING: Starting product seeding process...');
    
    try {
      // First, check if vendor exists, if not create one
      const vendorRef = doc(db, 'vendors', vendorId);
      await setDoc(vendorRef, {
        name: 'Test Restaurant',
        businessName: 'Test Restaurant Ltd',
        description: 'A test restaurant for debugging',
        image: 'https://via.placeholder.com/400x300',
        rating: 4.5,
        deliveryTime: '30-45 mins',
        deliveryFee: '500',
        address: 'Test Address, Lagos',
        vendorType: 'restaurant',
        isOnline: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
      
      console.log('🌱 SEEDING: Vendor created/updated:', vendorId);
      
      // Check if products already exist
      const productsRef = collection(db, 'vendors', vendorId, 'products');
      const existingProducts = await getDocs(productsRef);
      
      if (existingProducts.size > 0) {
        console.log('🌱 SEEDING: Products already exist:', existingProducts.size);
        return { vendorId, productsCount: existingProducts.size };
      }
      
      // Sample products with different field name variations
      const sampleProducts = [
        {
          name: 'Jollof Rice with Chicken',
          desc: 'Delicious Nigerian jollof rice served with grilled chicken',
          basePrice: 2500,
          imageUrl: 'https://via.placeholder.com/400x300/ff6b6b/ffffff?text=Jollof+Rice',
          category: 'Nigerian Food',
          productType: 'food',
          active: true,
          deliveryTimeMinutes: 30,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Fried Rice Special',
          description: 'Mixed vegetables fried rice with choice of protein',
          price: 2800,
          image: 'https://via.placeholder.com/400x300/4ecdc4/ffffff?text=Fried+Rice',
          category: 'Nigerian Food', 
          available: true,
          preparationTime: 25,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Peppered Chicken',
          desc: 'Spicy grilled chicken with pepper sauce',
          basePrice: 3000,
          imageUrl: 'https://via.placeholder.com/400x300/45b7d1/ffffff?text=Peppered+Chicken',
          category: 'Grills',
          productType: 'food',
          isActive: true,
          deliveryTimeMinutes: 20,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Meat Pie',
          description: 'Freshly baked meat pie with seasoned beef filling',
          price: 800,
          image: 'https://via.placeholder.com/400x300/f39c12/ffffff?text=Meat+Pie',
          category: 'Snacks',
          isAvailable: true,
          measurementType: 'portion',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Ofada Rice & Stew',
          desc: 'Local ofada rice with spicy ayamase stew',
          basePrice: 3500,
          imageUrl: 'https://via.placeholder.com/400x300/e74c3c/ffffff?text=Ofada+Rice',
          category: 'Traditional',
          productType: 'food',
          active: true,
          available: true,
          deliveryTimeMinutes: 35,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      console.log('🌱 SEEDING: Creating sample products...');
      
      // Add each product
      for (let i = 0; i < sampleProducts.length; i++) {
        const product = sampleProducts[i];
        const docRef = await addDoc(productsRef, product);
        console.log(`🌱 SEEDING: Product ${i + 1} created:`, docRef.id, '-', product.name);
        
        // Add a sample addon for some products
        if (i < 3) {
          const addonsRef = collection(db, 'vendors', vendorId, 'products', docRef.id, 'addons');
          await addDoc(addonsRef, {
            name: 'Extra Meat',
            price: 500,
            description: 'Additional portion of meat',
            active: true,
            available: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`🌱 SEEDING: Addon added for product:`, product.name);
        }
      }
      
      console.log('🌱 SEEDING: Sample products created successfully!');
      console.log('🌱 SEEDING: Total products:', sampleProducts.length);
      console.log('🌱 SEEDING: Vendor ID:', vendorId);
      console.log('🌱 SEEDING: You can now test with URL: /vendor-debug/' + vendorId);
      
      return { 
        vendorId, 
        productsCount: sampleProducts.length,
        testUrl: `/vendor-debug/${vendorId}`
      };
      
    } catch (error) {
      console.error('🌱 SEEDING ERROR:', error);
      throw error;
    }
  }
  
  static async checkExistingData() {
    console.log('🔍 CHECKING: Scanning existing vendors and products...');
    
    try {
      // Get all vendors
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      console.log('🔍 CHECKING: Found vendors:', vendorsSnapshot.size);
      
      const vendorData = [];
      
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorId = vendorDoc.id;
        const vendor = vendorDoc.data();
        
        // Get products for this vendor
        const productsSnapshot = await getDocs(collection(db, 'vendors', vendorId, 'products'));
        
        const vendorInfo = {
          id: vendorId,
          name: vendor.name || vendor.businessName || 'Unknown',
          productsCount: productsSnapshot.size,
          testUrl: `/vendor-debug/${vendorId}`
        };
        
        vendorData.push(vendorInfo);
        console.log('🔍 CHECKING:', vendorInfo);
      }
      
      return vendorData;
      
    } catch (error) {
      console.error('🔍 CHECKING ERROR:', error);
      throw error;
    }
  }
}

// Auto-export for browser console use
if (typeof window !== 'undefined') {
  window.ProductSeeder = ProductSeeder;
  console.log('🌱 ProductSeeder loaded! Use:');
  console.log('- ProductSeeder.checkExistingData() - See current vendors/products');
  console.log('- ProductSeeder.seedSampleProducts() - Create test data');
}