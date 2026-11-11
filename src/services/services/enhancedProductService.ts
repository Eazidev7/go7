/**
 * Enhanced Product Management Service with New Type System
 * Demonstrates usage of the extended Product, ProductVariant, and ProductOption types
 */
import { 
  Product, 
  ProductVariant, 
  ProductOption, 
  VendorCategory,
  calculateVariantPrice,
  generateVariantSku,
  isVariantAvailable,
  createDefaultVariant
} from '../types/models';
import {
  getProductsCollection,
  getProductDocument,
  getCategoriesCollection,
  getCategoryDocument
} from '../utils/firestoreCollections';
import { 
  getDoc,
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  DocumentReference, 
  DocumentData 
} from 'firebase/firestore';

/**
 * Enhanced Product Management Service using the new type system
 */
export class EnhancedProductService {
  constructor(private vendorId: string) {}

  /**
   * Create a new product with comprehensive variant and option support
   */
  async createProductWithVariants(productData: {
    title: string;
    price: number;
    description?: string;
    categoryId: string;
    images: string[];
    variants?: Omit<ProductVariant, 'id'>[];
    options?: Omit<ProductOption, 'id'>[];
    stock: number;
    sku?: string;
    weight?: number;
    tags?: string[];
  }): Promise<string> {
    const now = new Date();
    
    // Generate IDs for variants and options
    const variants: ProductVariant[] = (productData.variants || []).map((variant, index) => ({
      ...variant,
      id: `variant_${index + 1}`,
      sku: variant.sku || generateVariantSku(productData.title, variant.name)
    }));

    const options: ProductOption[] = (productData.options || []).map((option, index) => ({
      ...option,
      id: `option_${index + 1}`,
      values: option.values.map((value, valueIndex) => ({
        ...value,
        id: `value_${valueIndex + 1}`
      }))
    }));

    const product: Omit<Product, 'id'> = {
      title: productData.title,
      price: productData.price,
      description: productData.description,
      categoryId: productData.categoryId,
      available: true,
      stock: productData.stock,
      images: productData.images,
      variants: variants,
      options: options,
      sku: productData.sku,
      weight: productData.weight,
      tags: productData.tags || [],
      seoSlug: this.generateSlug(productData.title),
      createdAt: now,
      updatedAt: now
    };

    const productsRef = getProductsCollection(this.vendorId);
    const docRef = await addDoc(productsRef, product);
    
    return docRef.id;
  }

  /**
   * Get products with enhanced filtering and category information
   */
  async getEnhancedProducts(filters?: {
    categoryId?: string;
    available?: boolean;
    inStock?: boolean;
    tags?: string[];
    limit?: number;
  }): Promise<(Product & { category?: VendorCategory })[]> {
    const productsRef = getProductsCollection(this.vendorId);
    let q = query(productsRef, orderBy('updatedAt', 'desc'));
    
    // Apply filters
    if (filters?.categoryId) {
      q = query(q, where('categoryId', '==', filters.categoryId));
    }
    
    if (filters?.available !== undefined) {
      q = query(q, where('available', '==', filters.available));
    }
    
    if (filters?.inStock) {
      q = query(q, where('stock', '>', 0));
    }
    
    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    let products = snapshot.docs.map(doc => doc.data());

    // Filter by tags if specified
    if (filters?.tags && filters.tags.length > 0) {
      products = products.filter(product => 
        filters.tags!.some(tag => product.tags?.includes(tag))
      );
    }

    // Fetch category information
    const categoriesRef = getCategoriesCollection(this.vendorId);
    const categoriesSnapshot = await getDocs(categoriesRef);
    const categories = new Map(
      categoriesSnapshot.docs.map(doc => [doc.id, doc.data()])
    );

    return products.map(product => ({
      ...product,
      category: categories.get(product.categoryId)
    }));
  }

  /**
   * Update product with variant-specific operations
   */
  async updateProductVariants(
    productId: string, 
    updates: {
      variants?: ProductVariant[];
      options?: ProductOption[];
      newVariant?: Omit<ProductVariant, 'id'>;
      updateVariant?: { variantId: string; updates: Partial<ProductVariant> };
      removeVariant?: string;
    }
  ): Promise<void> {
    const productRef = getProductDocument(this.vendorId, productId);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      throw new Error('Product not found');
    }

    const product = productDoc.data();
    let updatedVariants = [...product.variants];
    let updatedOptions = updates.options || product.options;

    // Add new variant
    if (updates.newVariant) {
      const newVariantId = `variant_${updatedVariants.length + 1}`;
      const newVariant: ProductVariant = {
        ...updates.newVariant,
        id: newVariantId,
        sku: updates.newVariant.sku || generateVariantSku(productId, updates.newVariant.name)
      };
      updatedVariants.push(newVariant);
    }

    // Update existing variant
    if (updates.updateVariant) {
      updatedVariants = updatedVariants.map(variant => {
        if (variant.id === updates.updateVariant!.variantId) {
          return { ...variant, ...updates.updateVariant!.updates };
        }
        return variant;
      });
    }

    // Remove variant
    if (updates.removeVariant) {
      updatedVariants = updatedVariants.filter(variant => variant.id !== updates.removeVariant);
    }

    // Override with complete variants array if provided
    if (updates.variants) {
      updatedVariants = updates.variants;
    }

    await updateDoc(productRef, {
      variants: updatedVariants,
      options: updatedOptions,
      updatedAt: new Date()
    });
  }

  /**
   * Bulk update variant stock levels
   */
  async bulkUpdateVariantStock(
    productId: string, 
    stockUpdates: Array<{ variantId: string; stock: number; available?: boolean }>
  ): Promise<void> {
    const productRef = getProductDocument(this.vendorId, productId);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      throw new Error('Product not found');
    }

    const product = productDoc.data();
    const updatedVariants = product.variants.map((variant: ProductVariant) => {
      const stockUpdate = stockUpdates.find(update => update.variantId === variant.id);
      if (stockUpdate) {
        return {
          ...variant,
          stock: stockUpdate.stock,
          available: stockUpdate.available !== undefined ? stockUpdate.available : variant.available
        };
      }
      return variant;
    });

    // Update overall product stock based on variant stocks
    const totalStock = updatedVariants.reduce((sum: number, variant: ProductVariant) => sum + variant.stock, 0);
    const hasAvailableVariants = updatedVariants.some((variant: ProductVariant) => variant.available && variant.stock > 0);

    await updateDoc(productRef, {
      variants: updatedVariants,
      stock: totalStock,
      available: hasAvailableVariants,
      updatedAt: new Date()
    });
  }

  /**
   * Get product recommendations based on category and tags
   */
  async getRecommendedProducts(
    currentProductId: string,
    limitCount: number = 6
  ): Promise<Product[]> {
    // Get current product to base recommendations on
    const currentProductRef = getProductDocument(this.vendorId, currentProductId);
    const currentProductDoc = await getDoc(currentProductRef);
    
    if (!currentProductDoc.exists()) {
      return [];
    }

    const currentProduct = currentProductDoc.data();
    const productsRef = getProductsCollection(this.vendorId);
    
    // First try to get products from the same category
    let q = query(
      productsRef,
      where('categoryId', '==', currentProduct.categoryId),
      where('available', '==', true),
      where('stock', '>', 0),
      limit(limitCount * 2) // Get more to filter out current product
    );

    const snapshot = await getDocs(q);
    let recommendations = snapshot.docs
      .map(doc => doc.data())
      .filter(product => product.id !== currentProductId);

    // If we don't have enough recommendations, supplement with products that share tags
    if (recommendations.length < limitCount && currentProduct.tags && currentProduct.tags.length > 0) {
      const tagBasedQuery = query(
        productsRef,
        where('available', '==', true),
        where('stock', '>', 0),
        limit(limitCount * 3)
      );
      
      const tagSnapshot = await getDocs(tagBasedQuery);
      const tagBasedProducts = tagSnapshot.docs
        .map(doc => doc.data())
        .filter(product => 
          product.id !== currentProductId &&
          product.categoryId !== currentProduct.categoryId &&
          product.tags?.some(tag => currentProduct.tags!.includes(tag))
        );

      recommendations = [...recommendations, ...tagBasedProducts];
    }

    return recommendations.slice(0, limitCount);
  }

  /**
   * Calculate comprehensive pricing for a product configuration
   */
  getProductPricing(
    product: Product,
    configuration: {
      variantId?: string;
      selectedOptions: Record<string, string[]>;
      quantity: number;
    }
  ): {
    basePrice: number;
    variantPrice: number;
    optionModifiers: number;
    finalUnitPrice: number;
    totalPrice: number;
    savings?: number;
  } {
    const { variantId, selectedOptions, quantity } = configuration;
    
    let basePrice = product.price;
    let variantPrice = basePrice;
    
    // Get variant price if specified
    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        variantPrice = variant.price;
      }
    }

    // Calculate option modifiers
    let optionModifiers = 0;
    Object.entries(selectedOptions).forEach(([optionId, values]) => {
      const option = product.options.find(opt => opt.id === optionId);
      if (option) {
        values.forEach(value => {
          const optionValue = option.values.find(val => val.value === value);
          if (optionValue) {
            optionModifiers += optionValue.priceModifier;
          }
        });
      }
    });

    const finalUnitPrice = variantPrice + optionModifiers;
    const totalPrice = finalUnitPrice * quantity;

    return {
      basePrice,
      variantPrice,
      optionModifiers,
      finalUnitPrice,
      totalPrice,
      savings: basePrice > finalUnitPrice ? (basePrice - finalUnitPrice) * quantity : undefined
    };
  }

  /**
   * Generate SEO-friendly slug from product title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Validate product configuration before adding to cart
   */
  validateProductConfiguration(
    product: Product,
    variantId?: string,
    selectedOptions: Record<string, string[]> = {}
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check product availability
    if (!product.available) {
      errors.push('Product is not available');
    }

    if (product.stock <= 0) {
      errors.push('Product is out of stock');
    }

    // Check variant availability if specified
    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (!variant) {
        errors.push('Selected variant not found');
      } else if (!variant.available) {
        errors.push('Selected variant is not available');
      } else if (variant.stock <= 0) {
        errors.push('Selected variant is out of stock');
      }
    }

    // Validate required options
    const requiredOptions = product.options.filter(option => option.required);
    requiredOptions.forEach(option => {
      if (!selectedOptions[option.id] || selectedOptions[option.id].length === 0) {
        errors.push(`${option.name} is required`);
      }
    });

    // Validate option value availability
    Object.entries(selectedOptions).forEach(([optionId, values]) => {
      const option = product.options.find(opt => opt.id === optionId);
      if (option) {
        values.forEach(value => {
          const optionValue = option.values.find(val => val.value === value);
          if (!optionValue) {
            errors.push(`Invalid option value: ${value} for ${option.name}`);
          } else if (!optionValue.available) {
            errors.push(`Option value ${value} is not available`);
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * const productService = new EnhancedProductService('vendor123');
 * 
 * // Create a complex product with variants and options
 * const productId = await productService.createProductWithVariants({
 *   title: 'Premium Coffee Blend',
 *   price: 1500000, // 15,000 NGN in kobo
 *   description: 'Premium arabica coffee blend',
 *   categoryId: 'beverages',
 *   images: ['/images/coffee1.jpg', '/images/coffee2.jpg'],
 *   stock: 100,
 *   variants: [
 *     {
 *       name: '250g Bag',
 *       price: 1200000,
 *       stock: 50,
 *       available: true,
 *       optionCombination: { size: '250g', packaging: 'bag' }
 *     },
 *     {
 *       name: '500g Bag', 
 *       price: 2000000,
 *       stock: 30,
 *       available: true,
 *       optionCombination: { size: '500g', packaging: 'bag' }
 *     }
 *   ],
 *   options: [
 *     {
 *       name: 'Grind Type',
 *       type: 'single',
 *       required: true,
 *       displayOrder: 1,
 *       values: [
 *         { value: 'Whole Bean', priceModifier: 0, available: true, displayOrder: 1 },
 *         { value: 'Coarse Grind', priceModifier: 2000, available: true, displayOrder: 2 },
 *         { value: 'Fine Grind', priceModifier: 2000, available: true, displayOrder: 3 }
 *       ]
 *     }
 *   ],
 *   tags: ['premium', 'arabica', 'coffee', 'organic']
 * });
 * 
 * // Get enhanced product pricing
 * const pricing = productService.getProductPricing(product, {
 *   variantId: 'variant_1',
 *   selectedOptions: { 'option_1': ['Fine Grind'] },
 *   quantity: 2
 * });
 * 
 * console.log(pricing.totalPrice); // Final price for 2 units
 * ```
 */