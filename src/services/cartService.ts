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
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UnitType, MeasurementVariant } from '../types/measurementTypes';

// Cart Item Interface with Measurement Support
export interface CartItem {
  id?: string;
  productId: string;
  vendorId: string;
  variantId?: string; // For market products
  qty: number;
  selectedAddons: { id: string; qty: number }[]; // For food products
  priceAtAdd: number; // Price when added to cart
  productName?: string;
  productImageUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  
  // Measurement system fields
  unitType?: UnitType;
  unitLabel?: string;
  selectedMeasurementVariant?: MeasurementVariant;
  addonMeasurements?: { [addonId: string]: { variant?: MeasurementVariant; qty: number; unitType?: UnitType; unitLabel?: string } };
}

// Cart Summary Interface
export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  vendorGroups: { [vendorId: string]: CartItem[] };
}

class CartService {
  private getCartCollection(userId: string) {
    return collection(db, 'carts', userId, 'items');
  }

  // Add item to cart
  async addToCart(userId: string, cartItem: Omit<CartItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const cartCollection = this.getCartCollection(userId);
      
      // Check if same product with same variant/addons already exists
      const existingItem = await this.findExistingCartItem(userId, cartItem);
      
      if (existingItem) {
        // Update quantity instead of adding new item
        await this.updateCartItemQuantity(userId, existingItem.id!, existingItem.qty + cartItem.qty);
        return existingItem.id!;
      } else {
        // Add new item
        const docRef = await addDoc(cartCollection, {
          ...cartItem,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('Item added to cart:', docRef.id);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  // Find existing cart item with same product and configuration
  private async findExistingCartItem(userId: string, newItem: Omit<CartItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<CartItem | null> {
    try {
      const cartCollection = this.getCartCollection(userId);
      const q = query(
        cartCollection,
        where('productId', '==', newItem.productId)
      );
      
      const querySnapshot = await getDocs(q);
      
      for (const docSnap of querySnapshot.docs) {
        const item = { id: docSnap.id, ...docSnap.data() } as CartItem;
        
        // Check if variant matches (for market products)
        if (newItem.variantId !== item.variantId) continue;
        
        // Check if addons match (for food products)
        const addonsMatch = this.compareAddons(newItem.selectedAddons, item.selectedAddons);
        if (!addonsMatch) continue;
        
        return item;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding existing cart item:', error);
      return null;
    }
  }

  // Compare addon arrays for equality
  private compareAddons(addons1: { id: string; qty: number }[], addons2: { id: string; qty: number }[]): boolean {
    if (addons1.length !== addons2.length) return false;
    
    const sorted1 = [...addons1].sort((a, b) => a.id.localeCompare(b.id));
    const sorted2 = [...addons2].sort((a, b) => a.id.localeCompare(b.id));
    
    return sorted1.every((addon1, index) => {
      const addon2 = sorted2[index];
      return addon1.id === addon2.id && addon1.qty === addon2.qty;
    });
  }

  // Get user's cart
  async getCart(userId: string): Promise<CartItem[]> {
    try {
      const cartCollection = this.getCartCollection(userId);
      const q = query(cartCollection, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CartItem[];
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    }
  }

  // Get cart summary with calculations
  async getCartSummary(userId: string): Promise<CartSummary> {
    try {
      const items = await this.getCart(userId);
      
      const subtotal = items.reduce((sum, item) => sum + (item.priceAtAdd * item.qty), 0);
      const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
      
      // Group by vendor
      const vendorGroups: { [vendorId: string]: CartItem[] } = {};
      items.forEach(item => {
        if (!vendorGroups[item.vendorId]) {
          vendorGroups[item.vendorId] = [];
        }
        vendorGroups[item.vendorId].push(item);
      });
      
      return {
        items,
        subtotal,
        itemCount,
        vendorGroups
      };
    } catch (error) {
      console.error('Error getting cart summary:', error);
      throw error;
    }
  }

  // Update cart item quantity
  async updateCartItemQuantity(userId: string, cartItemId: string, newQuantity: number): Promise<void> {
    try {
      const cartCollection = this.getCartCollection(userId);
      const itemRef = doc(cartCollection, cartItemId);
      
      if (newQuantity <= 0) {
        await deleteDoc(itemRef);
      } else {
        await updateDoc(itemRef, {
          qty: newQuantity,
          updatedAt: serverTimestamp()
        });
      }
      
      console.log('Cart item quantity updated');
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      throw error;
    }
  }

  // Remove item from cart
  async removeFromCart(userId: string, cartItemId: string): Promise<void> {
    try {
      const cartCollection = this.getCartCollection(userId);
      const itemRef = doc(cartCollection, cartItemId);
      
      await deleteDoc(itemRef);
      console.log('Item removed from cart');
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  // Clear entire cart
  async clearCart(userId: string): Promise<void> {
    try {
      const cartCollection = this.getCartCollection(userId);
      const querySnapshot = await getDocs(cartCollection);
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('Cart cleared successfully');
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  // Clear items from specific vendor
  async clearVendorItems(userId: string, vendorId: string): Promise<void> {
    try {
      const cartCollection = this.getCartCollection(userId);
      const q = query(cartCollection, where('vendorId', '==', vendorId));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('Vendor items cleared from cart');
    } catch (error) {
      console.error('Error clearing vendor items:', error);
      throw error;
    }
  }

  // Real-time cart subscription
  subscribeToCart(userId: string, callback: (items: CartItem[]) => void): () => void {
    const cartCollection = this.getCartCollection(userId);
    const q = query(cartCollection, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CartItem[];
      callback(items);
    }, (error) => {
      console.error('Error in cart subscription:', error);
      callback([]);
    });
  }

  // Get cart item count
  async getCartItemCount(userId: string): Promise<number> {
    try {
      const items = await this.getCart(userId);
      return items.reduce((sum, item) => sum + item.qty, 0);
    } catch (error) {
      console.error('Error getting cart item count:', error);
      return 0;
    }
  }

  // Validate cart items (check if products still exist and prices haven't changed significantly)
  async validateCartItems(userId: string): Promise<{
    valid: boolean;
    issues: string[];
    updatedItems: CartItem[];
  }> {
    try {
      const items = await this.getCart(userId);
      const issues: string[] = [];
      const updatedItems: CartItem[] = [];
      
      // This would typically call backend validation
      // For now, we'll return a simple validation
      return {
        valid: true,
        issues,
        updatedItems: items
      };
    } catch (error) {
      console.error('Error validating cart items:', error);
      throw error;
    }
  }

  // Merge cart items (useful for guest -> logged in user transition)
  async mergeCarts(userId: string, guestCartItems: CartItem[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      const cartCollection = this.getCartCollection(userId);
      
      for (const item of guestCartItems) {
        const docRef = doc(cartCollection);
        batch.set(docRef, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      console.log('Carts merged successfully');
    } catch (error) {
      console.error('Error merging carts:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();