import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createProduct } from './createProduct';
import { placeOrder, updateOrderStatus, getOrderDetails } from './placeOrder';
import { 
  autoPayout, 
  triggerManualPayout, 
  getPayoutHistory, 
  getPayoutStats 
} from './autoPayout';

// Initialize Firebase Admin (safe to call multiple times)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ===== UPLOAD & IMAGE HANDLING FUNCTIONS =====

interface UploadUrlRequest {
  vendorId: string;
  productId?: string;
  addonId?: string;
  fileName: string;
  contentType?: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  objectName: string;
  publicUrl: string;
}

/**
 * Generate signed upload URL for direct client uploads
 */
export const getUploadUrl = functions.https.onCall(async (data: UploadUrlRequest, context): Promise<UploadUrlResponse> => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const { vendorId, productId, addonId, fileName, contentType = "image/jpeg" } = data;
  
  // Validation
  if (!vendorId || !fileName) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields: vendorId, fileName");
  }
  
  if (!productId && !addonId) {
    throw new functions.https.HttpsError("invalid-argument", "Either productId or addonId is required");
  }
  
  // Security: Verify user has permission to upload for this vendor
  const userId = context.auth.uid;
  const vendorDoc = await db.collection('vendors').doc(vendorId).get();
  
  if (!vendorDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Vendor not found");
  }
  
  const vendorData = vendorDoc.data();
  if (vendorData?.userId !== userId && vendorData?.ownerId !== userId) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized to upload for this vendor");
  }
  
  try {
    // Generate unique file path
    const id = addonId || productId || admin.firestore().collection("tmp").doc().id;
    const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
    
    // Validate file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowedExtensions.includes(ext)) {
      throw new functions.https.HttpsError("invalid-argument", `File type not allowed. Allowed: ${allowedExtensions.join(', ')}`);
    }
    
    const objectName = productId
      ? `vendors/${vendorId}/products/${productId}.${ext}`
      : `vendors/${vendorId}/addons/${id}.${ext}`;

    const file = bucket.file(objectName);
    
    // Generate signed URL for upload (15 minutes expiry)
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 1000 * 60 * 15, // 15 minutes
      contentType: contentType,
      extensionHeaders: {
        'x-goog-content-length-range': '0,10485760' // Max 10MB
      }
    });
    
    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${objectName}`;
    
    console.log(`✅ Generated upload URL for ${objectName}`);
    
    return {
      uploadUrl,
      objectName,
      publicUrl
    };
    
  } catch (error) {
    console.error("❌ Error generating upload URL:", error);
    throw new functions.https.HttpsError("internal", "Failed to generate upload URL");
  }
});

/**
 * Process uploaded images (resize, optimize, generate thumbnails)
 */
export const processUploadedImage = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;
  
  // Only process images
  if (!contentType || !contentType.startsWith('image/')) {
    console.log('Not an image, skipping processing');
    return null;
  }
  
  // Only process vendor uploaded images
  if (!filePath || !filePath.startsWith('vendors/')) {
    console.log('Not a vendor image, skipping processing');
    return null;
  }
  
  try {
    console.log(`🖼️ Processing image: ${filePath}`);
    
    // Extract vendor ID and type from path
    const pathParts = filePath.split('/');
    if (pathParts.length < 4) {
      console.log('Invalid file path structure');
      return null;
    }
    
    const vendorId = pathParts[1];
    const imageType = pathParts[2]; // 'products' or 'addons'
    const fileName = pathParts[3];
    const entityId = fileName.split('.')[0];
    
    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${object.bucket}/${filePath}`;
    
    // Update Firestore with the image URL
    if (imageType === 'products') {
      const productRef = db.doc(`vendors/${vendorId}/products/${entityId}`);
      await productRef.update({
        imageUrl: publicUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Updated product ${entityId} with image URL`);
      
    } else if (imageType === 'addons') {
      // Update addon image in products that contain this addon
      const productsQuery = db.collection(`vendors/${vendorId}/products`)
        .where('addons', 'array-contains-any', [{ id: entityId }]);
      
      const productsSnapshot = await productsQuery.get();
      
      const batch = db.batch();
      productsSnapshot.docs.forEach(doc => {
        const product = doc.data();
        if (product.addons && Array.isArray(product.addons)) {
          const updatedAddons = product.addons.map((addon: any) => {
            if (addon.id === entityId) {
              return { ...addon, imageUrl: publicUrl };
            }
            return addon;
          });
          
          batch.update(doc.ref, {
            addons: updatedAddons,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });
      
      await batch.commit();
      console.log(`✅ Updated ${productsSnapshot.size} products with addon image ${entityId}`);
    }
    
    return null;
    
  } catch (error) {
    console.error(`❌ Error processing image ${filePath}:`, error);
    return null;
  }
});

/**
 * Firestore trigger to maintain data consistency when products are written
 */
export const onProductWrite = functions.firestore
  .document("vendors/{vendorId}/products/{productId}")
  .onWrite(async (change, context) => {
    const { vendorId, productId } = context.params;
    
    try {
      // If document was deleted, clean up associated images
      if (!change.after.exists && change.before.exists) {
        console.log(`🗑️ Product ${productId} deleted, cleaning up images`);
        
        // Delete product image
        const productImagePath = `vendors/${vendorId}/products/${productId}.jpg`;
        try {
          await bucket.file(productImagePath).delete();
          console.log(`✅ Deleted product image: ${productImagePath}`);
        } catch (error) {
          console.log(`ℹ️ Product image not found: ${productImagePath}`);
        }
        
        // Delete addon images if they're not used elsewhere
        const oldProduct = change.before.data();
        if (oldProduct?.addons && Array.isArray(oldProduct.addons)) {
          for (const addon of oldProduct.addons) {
            if (addon.id && addon.imageUrl) {
              // Check if addon is used in other products
              const otherProductsQuery = db.collection(`vendors/${vendorId}/products`)
                .where('addons', 'array-contains-any', [{ id: addon.id }])
                .limit(1);
              
              const otherProductsSnapshot = await otherProductsQuery.get();
              
              if (otherProductsSnapshot.empty) {
                try {
                  const addonImagePath = `vendors/${vendorId}/addons/${addon.id}.jpg`;
                  await bucket.file(addonImagePath).delete();
                  console.log(`✅ Deleted unused addon image: ${addonImagePath}`);
                } catch (error) {
                  console.log(`ℹ️ Addon image not found: ${addon.id}`);
                }
              }
            }
          }
        }
        
        return null;
      }
      
      // If document was created or updated, ensure timestamps are present
      if (change.after.exists) {
        const product = change.after.data();
        const updates: any = {};
        
        // Ensure createdAt exists for new documents
        if (!change.before.exists && !product?.createdAt) {
          updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        // Always update updatedAt
        if (!product?.updatedAt || (change.before.exists && change.before.data()?.updatedAt === product?.updatedAt)) {
          updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        // Ensure vendorId is set
        if (!product?.vendorId) {
          updates.vendorId = vendorId;
        }
        
        // Ensure isAvailable is set
        if (product?.isAvailable === undefined) {
          updates.isAvailable = true;
        }
        
        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await change.after.ref.update(updates);
          console.log(`✅ Updated product ${productId} with metadata`);
        }
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Error in product write trigger for ${productId}:`, error);
      return null;
    }
  });

/**
 * Clean up orphaned images (callable function for manual cleanup)
 */
export const cleanupOrphanedImages = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }
  
  const { vendorId } = data;
  if (!vendorId) {
    throw new functions.https.HttpsError("invalid-argument", "vendorId is required");
  }
  
  try {
    console.log(`🧹 Starting cleanup for vendor: ${vendorId}`);
    
    // Get all products and their addon IDs
    const productsSnapshot = await db.collection(`vendors/${vendorId}/products`).get();
    const validProductIds = new Set<string>();
    const validAddonIds = new Set<string>();
    
    productsSnapshot.docs.forEach(doc => {
      validProductIds.add(doc.id);
      
      const product = doc.data();
      if (product.addons && Array.isArray(product.addons)) {
        product.addons.forEach((addon: any) => {
          if (addon.id) {
            validAddonIds.add(addon.id);
          }
        });
      }
    });
    
    let deletedCount = 0;
    
    // Clean up product images
    const [productFiles] = await bucket.getFiles({
      prefix: `vendors/${vendorId}/products/`
    });
    
    for (const file of productFiles) {
      const fileName = file.name.split('/').pop()?.replace(/\.[^/.]+$/, "");
      if (fileName && !validProductIds.has(fileName)) {
        await file.delete();
        deletedCount++;
        console.log(`🗑️ Deleted orphaned product image: ${fileName}`);
      }
    }
    
    // Clean up addon images
    const [addonFiles] = await bucket.getFiles({
      prefix: `vendors/${vendorId}/addons/`
    });
    
    for (const file of addonFiles) {
      const fileName = file.name.split('/').pop()?.replace(/\.[^/.]+$/, "");
      if (fileName && !validAddonIds.has(fileName)) {
        await file.delete();
        deletedCount++;
        console.log(`🗑️ Deleted orphaned addon image: ${fileName}`);
      }
    }
    
    console.log(`✅ Cleanup complete: ${deletedCount} files deleted`);
    
    return {
      success: true,
      deletedCount,
      validProducts: validProductIds.size,
      validAddons: validAddonIds.size
    };
    
  } catch (error) {
    console.error(`❌ Error during cleanup:`, error);
    throw new functions.https.HttpsError("internal", "Cleanup failed");
  }
});

// Export all functions
export {
  // Product management
  createProduct,
  
  // Order management
  placeOrder,
  updateOrderStatus,
  getOrderDetails,
  
  // Payout management
  autoPayout,
  triggerManualPayout,
  getPayoutHistory,
  getPayoutStats
};