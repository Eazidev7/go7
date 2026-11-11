import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp, 
  orderBy,
  limit,
  onSnapshot,
  increment,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UnitType, MeasurementUnit, MeasurementVariant } from '../types/measurementTypes';

// Enhanced TypeScript Interfaces matching the recommended schema
export interface Product {
  id?: string;
  vendorId: string;
  name: string;
  desc: string; // Changed from 'description' to match schema
  productType: 'food' | 'market';
  basePrice: number; // Used for food (or suggested for market)
  imageUrl?: string;
  category: string;
  deliveryTimeMinutes?: number; // food only
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  
  // Food add-ons
  addons?: Addon[];
  
  // Market variants (for market productType)
  variants?: Variant[];
  
  // Analytics fields
  orderCount?: number;
  rating?: number;
  reviews?: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  category?: "protein" | "carbs" | "spicy" | "drinks" | "dessert";
  
  // Measurement system fields
  unitType?: UnitType;
  unitLabel?: string;
  variants?: MeasurementVariant[];
  pieceCountPerUnit?: number;
  maxQty?: number;
  minQty?: number;
  qtyStep?: number;
  customLabel?: string;
}

export interface Variant {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  description?: string;
  
  // Measurement system fields
  unitType?: UnitType;
  unitLabel?: string;
  variants?: MeasurementVariant[];
  pieceCountPerUnit?: number;
  maxQty?: number;
  minQty?: number;
  qtyStep?: number;
  customLabel?: string;
}

class ProductService {
  // Create a new product in vendors/{vendorId}/products (V2 ONLY)
  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    try {
      console.log('➕ Creating product:', productData.name);
      
      if (!productData.vendorId) {
        throw new Error('vendorId is required for V2 product creation');
      }
      
      const newProduct = {
        ...productData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        active: true,
        orderCount: 0,
        rating: 0,
        reviews: 0
      };
      
      // V2 PATH: vendors/{vendorId}/products
      const productsCollection = collection(db, 'vendors', productData.vendorId, 'products');
      const docRef = await addDoc(productsCollection, newProduct);
      console.log('✅ Product created with ID:', docRef.id, 'at vendors/', productData.vendorId, '/products/', docRef.id);
      
      return {
        id: docRef.id,
        ...productData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      } as Product;
    } catch (error) {
      console.error('❌ Error creating product:', error);
      throw error;
    }
  }

  // Get products for a specific vendor from vendors/{vendorId}/products (V2 ONLY)
  async getVendorProducts(vendorId: string): Promise<Product[]> {
    try {
      console.log('🍽️ Fetching products for vendor:', vendorId);
      
      // V2 PATH: vendors/{vendorId}/products
      const productsCollection = collection(db, 'vendors', vendorId, 'products');
      const q = query(
        productsCollection,
        where('active', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const products: Product[] = [];
      
      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        } as Product);
      });
      
      console.log('✅ Found', products.length, 'products for vendor', vendorId);
      return products;
    } catch (error) {
      console.error('❌ Error fetching vendor products:', error);
      throw error;
    }
  }

  // Get products by type (food/market) from vendors/{vendorId}/products (V2 ONLY)
  async getProductsByType(vendorId: string, productType: 'food' | 'market'): Promise<Product[]> {
    try {
      console.log('📦 Fetching products by type:', productType);
      
      // V2 PATH: vendors/{vendorId}/products
      const productsCollection = collection(db, 'vendors', vendorId, 'products');
      const q = query(
        productsCollection,
        where('productType', '==', productType),
        where('active', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const products: Product[] = [];
      
      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        } as Product);
      });
      
      console.log('✅ Found', products.length, productType, 'products for vendor', vendorId);
      return products;
    } catch (error) {
      console.error('❌ Error fetching products by type:', error);
      throw error;
    }
  }

  // Update a product in vendors/{vendorId}/products (V2 ONLY)
  async updateProduct(productId: string, updateData: Partial<Product>): Promise<void> {
    try {
      console.log('📝 Updating product:', productId);
      
      if (!updateData.vendorId) {
        throw new Error('vendorId is required to update product in V2 structure');
      }
      
      // V2 PATH: vendors/{vendorId}/products/{productId}
      const productRef = doc(db, 'vendors', updateData.vendorId, 'products', productId);
      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };
      
      await updateDoc(productRef, updatedData);
      console.log('✅ Product updated successfully');
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw error;
    }
  }

  // Toggle product active status in vendors/{vendorId}/products (V2 ONLY)
  async toggleProductStatus(vendorId: string, productId: string, active: boolean): Promise<void> {
    try {
      console.log(`🔄 ${active ? 'Activating' : 'Deactivating'} product:`, productId);
      
      // V2 PATH: vendors/{vendorId}/products/{productId}
      const productRef = doc(db, 'vendors', vendorId, 'products', productId);
      await updateDoc(productRef, {
        active,
        updatedAt: new Date()
      });
      
      console.log('✅ Product status updated successfully');
    } catch (error) {
      console.error('❌ Error updating product status:', error);
      throw error;
    }
  }

  // Increment order count when product is ordered in vendors/{vendorId}/products (V2 ONLY)
  async incrementOrderCount(vendorId: string, productId: string): Promise<void> {
    try {
      console.log('📈 Incrementing order count for product:', productId);
      
      // V2 PATH: vendors/{vendorId}/products/{productId}
      const productRef = doc(db, 'vendors', vendorId, 'products', productId);
      await updateDoc(productRef, {
        orderCount: increment(1),
        lastOrdered: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Order count incremented');
    } catch (error) {
      console.error('❌ Error incrementing order count:', error);
      throw error;
    }
  }

  // Listen to real-time product updates for a vendor
  subscribeToVendorProducts(vendorId: string, callback: (products: Product[]) => void) {
    try {
      console.log('🔄 Subscribing to product updates for vendor:', vendorId);
      
      const q = query(
        collection(db, 'vendors', vendorId, 'products'),
        orderBy('orderCount', 'desc'),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const products: Product[] = [];
        querySnapshot.forEach((doc) => {
          products.push({
            id: doc.id,
            ...doc.data()
          } as Product);
        });
        
        console.log('🔄 Products updated:', products.length);
        callback(products);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error subscribing to product updates:', error);
      throw error;
    }
  }
}

// Export singleton instance
const productService = new ProductService();
export default productService;