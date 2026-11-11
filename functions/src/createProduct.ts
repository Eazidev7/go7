import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// TypeScript Interfaces
interface AddOnInput {
  name: string;
  price: number;
  category?: 'protein' | 'carbs' | 'spicy' | 'drinks' | 'dessert';
  description?: string;
  imageUrl?: string;
}

interface VariantInput {
  name: string;
  price: number;
  stock: number;
  sku?: string;
  description?: string;
  imageUrl?: string;
}

interface CreateProductRequest {
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  category: string;
  productType: 'food' | 'market';
  vendorId: string;
  deliveryTimeMinutes?: number;
  preparationTime?: number;
  servingSize?: string;
  ingredients?: string[];
  allergens?: string[];
  tags?: string[];
  addons?: AddOnInput[];
  variants?: VariantInput[];
}

interface CreateProductResponse {
  success: boolean;
  productId?: string;
  message: string;
  errors?: string[];
}

// Validation helpers
function validateRequiredFields(data: CreateProductRequest): string[] {
  const errors: string[] = [];
  
  if (!data.name?.trim()) errors.push('Product name is required');
  if (!data.description?.trim()) errors.push('Product description is required');
  if (!data.imageUrl?.trim()) errors.push('Product image URL is required');
  if (!data.basePrice || data.basePrice <= 0) errors.push('Base price must be greater than 0');
  if (!data.category?.trim()) errors.push('Product category is required');
  if (!data.productType || !['food', 'market'].includes(data.productType)) {
    errors.push('Product type must be either "food" or "market"');
  }
  if (!data.vendorId?.trim()) errors.push('Vendor ID is required');
  
  return errors;
}

function validateAddons(addons: AddOnInput[]): string[] {
  const errors: string[] = [];
  
  addons.forEach((addon, index) => {
    if (!addon.name?.trim()) {
      errors.push(`Add-on ${index + 1}: Name is required`);
    }
    if (!addon.price || addon.price <= 0) {
      errors.push(`Add-on ${index + 1}: Price must be greater than 0`);
    }
    if (addon.category && !['protein', 'carbs', 'spicy', 'drinks', 'dessert'].includes(addon.category)) {
      errors.push(`Add-on ${index + 1}: Invalid category`);
    }
    if (addon.imageUrl && !isValidUrl(addon.imageUrl)) {
      errors.push(`Add-on ${index + 1}: Invalid image URL`);
    }
  });
  
  return errors;
}

function validateVariants(variants: VariantInput[]): string[] {
  const errors: string[] = [];
  
  if (variants.length === 0) {
    errors.push('Market products must have at least one variant');
  }
  
  const skus = new Set<string>();
  
  variants.forEach((variant, index) => {
    if (!variant.name?.trim()) {
      errors.push(`Variant ${index + 1}: Name is required`);
    }
    if (!variant.price || variant.price <= 0) {
      errors.push(`Variant ${index + 1}: Price must be greater than 0`);
    }
    if (variant.stock < 0) {
      errors.push(`Variant ${index + 1}: Stock cannot be negative`);
    }
    if (variant.sku) {
      if (skus.has(variant.sku)) {
        errors.push(`Variant ${index + 1}: SKU "${variant.sku}" already exists`);
      }
      skus.add(variant.sku);
    }
    if (variant.imageUrl && !isValidUrl(variant.imageUrl)) {
      errors.push(`Variant ${index + 1}: Invalid image URL`);
    }
  });
  
  return errors;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

function generateSKU(productName: string, variantName: string): string {
  const productCode = productName.substring(0, 3).toUpperCase();
  const variantCode = variantName.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${productCode}-${variantCode}-${timestamp}`;
}

// Main Cloud Function
export const createProduct = functions.https.onCall(async (
  data: CreateProductRequest, 
  context: functions.https.CallableContext
): Promise<CreateProductResponse> => {
  try {
    // 1. Verify authentication
    if (!context.auth) {
      return {
        success: false,
        message: 'Authentication required to create products'
      };
    }

    const userId = context.auth.uid;
    
    // 2. Validate request data
    const validationErrors = validateRequiredFields(data);
    if (validationErrors.length > 0) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      };
    }

    // 3. Verify vendor ownership
    const vendorRef = db.collection('vendors').doc(data.vendorId);
    const vendorDoc = await vendorRef.get();
    
    if (!vendorDoc.exists) {
      return {
        success: false,
        message: 'Vendor not found'
      };
    }
    
    const vendorData = vendorDoc.data()!;
    if (vendorData.userId !== userId) {
      return {
        success: false,
        message: 'Not authorized to create products for this vendor'
      };
    }

    if (!vendorData.isActive) {
      return {
        success: false,
        message: 'Vendor account is not active'
      };
    }

    // 4. Validate product-specific data
    let productValidationErrors: string[] = [];
    
    if (data.productType === 'food' && data.addons) {
      productValidationErrors = validateAddons(data.addons);
    }
    
    if (data.productType === 'market' && data.variants) {
      productValidationErrors = validateVariants(data.variants);
    }
    
    if (productValidationErrors.length > 0) {
      return {
        success: false,
        message: 'Product validation failed',
        errors: productValidationErrors
      };
    }

    // 5. Sanitize and structure product data
    const productData: any = {
      vendorId: data.vendorId,
      vendorName: vendorData.businessName,
      name: sanitizeString(data.name),
      description: sanitizeString(data.description),
      imageUrl: data.imageUrl.trim(),
      basePrice: data.basePrice,
      category: data.category.toLowerCase().trim(),
      productType: data.productType,
      deliveryTimeMinutes: data.deliveryTimeMinutes || (data.productType === 'food' ? 30 : 60),
      preparationTime: data.preparationTime || (data.productType === 'food' ? 15 : 5),
      servingSize: data.servingSize || (data.productType === 'food' ? '1 person' : null),
      ingredients: data.ingredients || [],
      allergens: data.allergens || [],
      tags: data.tags || [],
      rating: 0,
      reviewCount: 0,
      totalOrders: 0,
      totalViews: 0,
      isAvailable: true,
      isFeatured: false,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 6. Process add-ons for food products
    if (data.productType === 'food' && data.addons && data.addons.length > 0) {
      productData.addons = data.addons.map((addon, index) => ({
        id: `addon_${Date.now()}_${index}`,
        name: sanitizeString(addon.name),
        price: addon.price,
        category: addon.category || 'protein',
        description: addon.description ? sanitizeString(addon.description) : '',
        imageUrl: addon.imageUrl?.trim() || '',
        isAvailable: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }));
    }

    // 7. Process variants for market products
    if (data.productType === 'market' && data.variants && data.variants.length > 0) {
      productData.variants = data.variants.map((variant, index) => ({
        id: `variant_${Date.now()}_${index}`,
        name: sanitizeString(variant.name),
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku?.trim() || generateSKU(data.name, variant.name),
        description: variant.description ? sanitizeString(variant.description) : '',
        imageUrl: variant.imageUrl?.trim() || '',
        isAvailable: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }));
      
      // Set base price to lowest variant price for better UX
      const lowestPrice = Math.min(...data.variants.map(v => v.price));
      productData.basePrice = lowestPrice;
    }

    // 8. Create product document
    const productRef = await db.collection('products').add(productData);
    
    // 9. Update vendor stats
    await vendorRef.update({
      totalProducts: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 10. Log successful creation
    functions.logger.info(`Product created successfully`, {
      productId: productRef.id,
      vendorId: data.vendorId,
      productType: data.productType,
      userId: userId
    });

    return {
      success: true,
      productId: productRef.id,
      message: 'Product created successfully'
    };

  } catch (error) {
    functions.logger.error('Error creating product:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      data: data
    });
    
    return {
      success: false,
      message: 'Failed to create product. Please try again.'
    };
  }
});

// Helper function to get product analytics
export const getProductAnalytics = functions.https.onCall(async (
  data: { productId: string },
  context: functions.https.CallableContext
) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const productRef = db.collection('products').doc(data.productId);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Product not found');
    }

    const product = productDoc.data()!;
    
    // Verify vendor ownership
    const vendorRef = db.collection('vendors').doc(product.vendorId);
    const vendorDoc = await vendorRef.get();
    
    if (!vendorDoc.exists || vendorDoc.data()!.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    return {
      productId: data.productId,
      totalViews: product.totalViews || 0,
      totalOrders: product.totalOrders || 0,
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0,
      conversionRate: product.totalViews > 0 ? 
        ((product.totalOrders || 0) / product.totalViews * 100).toFixed(2) : '0.00'
    };

  } catch (error) {
    functions.logger.error('Error getting product analytics:', error);
    throw error;
  }
});