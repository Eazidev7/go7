/**
 * 📁 STORAGE SERVICE V2
 * 
 * Handles all Firebase Storage operations for V2 system:
 * - Product images: vendors/{vendorId}/products/{productId}.jpg
 * - Addon images: vendors/{vendorId}/addons/{addonId}.jpg
 * - Vendor profiles: vendors/{vendorId}/profile.jpg
 * - Image optimization and compression
 */

import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject,
  listAll,
  StorageReference
} from 'firebase/storage';
import { storage } from '../config/firebase';
import { uploadVendorImagePreferHostinger } from './hostingerImageUpload';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  state: 'running' | 'paused' | 'success' | 'error';
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  maxSizeBytes?: number;
  allowedTypes?: string[];
  quality?: number; // For image compression (0.1 - 1.0)
}

/**
 * Compress image before upload
 */
const compressImage = (file: File, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 1200px width/height)
      const maxSize = 1200;
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Validate file before upload
 */
const validateFile = (file: File, options: UploadOptions = {}): void => {
  const { maxSizeBytes = 10 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;
  
  // Check file size
  if (file.size > maxSizeBytes) {
    throw new Error(`File size must be less than ${maxSizeBytes / (1024 * 1024)}MB`);
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type must be one of: ${allowedTypes.join(', ')}`);
  }
};

/**
 * Upload product image
 */
export const uploadProductImage = async (
  vendorId: string,
  productId: string,
  file: File,
  options: UploadOptions = {}
): Promise<string> => {
  try {
    validateFile(file, options);
    
    // Compress image if quality is specified
    const processedFile = options.quality ? await compressImage(file, options.quality) : file;
    
    const imagePath = `vendors/${vendorId}/products/${productId}.jpg`;
    options.onProgress?.({
      bytesTransferred: 0,
      totalBytes: processedFile.size,
      percentage: 15,
      state: 'running',
    });
    const downloadURL = await uploadVendorImagePreferHostinger(
      processedFile,
      imagePath
    );
    options.onProgress?.({
      bytesTransferred: processedFile.size,
      totalBytes: processedFile.size,
      percentage: 100,
      state: 'success',
    });
    console.log('✅ Product image uploaded:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading product image:', error);
    throw error;
  }
};

/**
 * Upload addon image
 */
export const uploadAddonImage = async (
  vendorId: string,
  addonId: string,
  file: File,
  options: UploadOptions = {}
): Promise<string> => {
  try {
    validateFile(file, options);
    
    const processedFile = options.quality ? await compressImage(file, options.quality) : file;
    
    const imagePath = `vendors/${vendorId}/addons/${addonId}.jpg`;
    const downloadURL = await uploadVendorImagePreferHostinger(
      processedFile,
      imagePath
    );
    console.log('✅ Addon image uploaded:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading addon image:', error);
    throw error;
  }
};

/**
 * Upload vendor profile image
 */
export const uploadVendorProfileImage = async (
  vendorId: string,
  file: File,
  options: UploadOptions = {}
): Promise<string> => {
  try {
    validateFile(file, options);
    
    const processedFile = options.quality ? await compressImage(file, options.quality) : file;
    
    const imagePath = `vendors/${vendorId}/profile.jpg`;
    const downloadURL = await uploadVendorImagePreferHostinger(
      processedFile,
      imagePath
    );
    console.log('✅ Vendor profile image uploaded:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading vendor profile image:', error);
    throw error;
  }
};

/**
 * Delete product image
 */
export const deleteProductImage = async (vendorId: string, productId: string): Promise<void> => {
  try {
    const imagePath = `vendors/${vendorId}/products/${productId}.jpg`;
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    console.log('✅ Product image deleted');
  } catch (error) {
    console.log('ℹ️ Product image not found or already deleted');
  }
};

/**
 * Delete addon image
 */
export const deleteAddonImage = async (vendorId: string, addonId: string): Promise<void> => {
  try {
    const imagePath = `vendors/${vendorId}/addons/${addonId}.jpg`;
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    console.log('✅ Addon image deleted');
  } catch (error) {
    console.log('ℹ️ Addon image not found or already deleted');
  }
};

/**
 * Delete vendor profile image
 */
export const deleteVendorProfileImage = async (vendorId: string): Promise<void> => {
  try {
    const imagePath = `vendors/${vendorId}/profile.jpg`;
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    console.log('✅ Vendor profile image deleted');
  } catch (error) {
    console.log('ℹ️ Vendor profile image not found or already deleted');
  }
};

/**
 * Get all product images for a vendor
 */
export const getVendorProductImages = async (vendorId: string): Promise<string[]> => {
  try {
    const productsRef = ref(storage, `vendors/${vendorId}/products`);
    const result = await listAll(productsRef);
    
    const urls = await Promise.all(
      result.items.map(async (itemRef) => {
        try {
          return await getDownloadURL(itemRef);
        } catch (error) {
          console.error('Error getting download URL:', error);
          return null;
        }
      })
    );
    
    return urls.filter((url): url is string => url !== null);
  } catch (error) {
    console.error('Error listing product images:', error);
    return [];
  }
};

/**
 * Get all addon images for a vendor
 */
export const getVendorAddonImages = async (vendorId: string): Promise<string[]> => {
  try {
    const addonsRef = ref(storage, `vendors/${vendorId}/addons`);
    const result = await listAll(addonsRef);
    
    const urls = await Promise.all(
      result.items.map(async (itemRef) => {
        try {
          return await getDownloadURL(itemRef);
        } catch (error) {
          console.error('Error getting download URL:', error);
          return null;
        }
      })
    );
    
    return urls.filter((url): url is string => url !== null);
  } catch (error) {
    console.error('Error listing addon images:', error);
    return [];
  }
};

/**
 * Clean up orphaned images (images without corresponding products/addons)
 */
export const cleanupOrphanedImages = async (
  vendorId: string,
  existingProductIds: string[],
  existingAddonIds: string[]
): Promise<{ deletedProducts: number; deletedAddons: number }> => {
  let deletedProducts = 0;
  let deletedAddons = 0;
  
  try {
    // Clean up product images
    const productsRef = ref(storage, `vendors/${vendorId}/products`);
    const productsResult = await listAll(productsRef);
    
    for (const itemRef of productsResult.items) {
      const fileName = itemRef.name.replace('.jpg', '');
      if (!existingProductIds.includes(fileName)) {
        try {
          await deleteObject(itemRef);
          deletedProducts++;
          console.log(`🗑️ Deleted orphaned product image: ${fileName}`);
        } catch (error) {
          console.error(`Error deleting product image ${fileName}:`, error);
        }
      }
    }
    
    // Clean up addon images
    const addonsRef = ref(storage, `vendors/${vendorId}/addons`);
    const addonsResult = await listAll(addonsRef);
    
    for (const itemRef of addonsResult.items) {
      const fileName = itemRef.name.replace('.jpg', '');
      if (!existingAddonIds.includes(fileName)) {
        try {
          await deleteObject(itemRef);
          deletedAddons++;
          console.log(`🗑️ Deleted orphaned addon image: ${fileName}`);
        } catch (error) {
          console.error(`Error deleting addon image ${fileName}:`, error);
        }
      }
    }
    
    console.log(`🧹 Cleanup complete: ${deletedProducts} product images, ${deletedAddons} addon images deleted`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  return { deletedProducts, deletedAddons };
};

/**
 * Batch upload multiple images with progress tracking
 */
export const batchUploadImages = async (
  uploads: Array<{
    type: 'product' | 'addon';
    vendorId: string;
    id: string;
    file: File;
  }>,
  options: UploadOptions = {}
): Promise<Array<{ id: string; url: string; error?: string }>> => {
  const results = await Promise.allSettled(
    uploads.map(async (upload) => {
      try {
        let url: string;
        
        if (upload.type === 'product') {
          url = await uploadProductImage(upload.vendorId, upload.id, upload.file, options);
        } else {
          url = await uploadAddonImage(upload.vendorId, upload.id, upload.file, options);
        }
        
        return { id: upload.id, url };
      } catch (error) {
        return { 
          id: upload.id, 
          url: '', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        };
      }
    })
  );
  
  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return { 
        id: 'unknown', 
        url: '', 
        error: result.reason?.message || 'Upload failed' 
      };
    }
  });
};

export default {
  uploadProductImage,
  uploadAddonImage,
  uploadVendorProfileImage,
  deleteProductImage,
  deleteAddonImage,
  deleteVendorProfileImage,
  getVendorProductImages,
  getVendorAddonImages,
  cleanupOrphanedImages,
  batchUploadImages
};