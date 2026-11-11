// addonImageUpload.js - Hostinger upload for vendor addons (Firebase Storage bypass)
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { uploadImageToHostinger } from "./hostingerImageUpload";

/**
 * Upload addon image to Hostinger and create Firestore document
 * @param {Object} params - Upload parameters
 * @param {string} params.vendorId - Vendor ID (must match authenticated user)
 * @param {string} params.addonId - Addon ID (can be auto-generated)
 * @param {File} params.imageFile - Image file to upload
 * @param {Object} params.addonData - Addon metadata (name, price, etc.)
 * @param {Function} params.onProgress - Progress callback (optional)
 * @returns {Promise<Object>} - Upload result with URLs
 */
export async function uploadAddonWithImage({
  vendorId,
  addonId,
  imageFile,
  addonData,
  onProgress
}) {
  const firestore = getFirestore();

  if (!vendorId || !addonId || !imageFile || !addonData) {
    throw new Error('vendorId, addonId, imageFile, and addonData are required');
  }

  if (!imageFile.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  const maxSize = 5 * 1024 * 1024;
  if (imageFile.size > maxSize) {
    throw new Error('Image file must be less than 5MB');
  }

  console.log('📤 Starting addon image upload (Hostinger):', {
    vendorId,
    addonId,
    fileName: imageFile.name,
    fileSize: imageFile.size,
  });

  if (onProgress) {
    onProgress({ progress: 10, state: 'running' });
  }

  const imageUrl = await uploadImageToHostinger(
    imageFile,
    `vendors/${vendorId}/addons/${addonId}/original.jpg`
  );

  if (onProgress) {
    onProgress({ progress: 90, state: 'running' });
  }

  const addonDocRef = doc(firestore, `vendors/${vendorId}/addons/${addonId}`);
  const docData = {
    ...addonData,
    vendorId,
    createdAt: new Date(),
    updatedAt: new Date(),
    imageProcessing: false,
    imageUrl,
    thumbUrl: imageUrl,
    imageProcessingError: false,
  };

  await setDoc(addonDocRef, docData);

  if (onProgress) {
    onProgress({ progress: 100, state: 'success' });
  }

  console.log('🎉 Addon image upload complete!', { addonId, imageUrl });

  return {
    success: true,
    addonId,
    imageUrl,
    thumbUrl: imageUrl,
    originalUrl: imageUrl,
    addonData: docData,
  };
}

/**
 * Create addon without image
 * @param {Object} params - Creation parameters
 * @param {string} params.vendorId - Vendor ID
 * @param {string} params.addonId - Addon ID
 * @param {Object} params.addonData - Addon metadata
 * @returns {Promise<Object>} - Creation result
 */
export async function createAddonWithoutImage({
  vendorId,
  addonId,
  addonData
}) {
  const firestore = getFirestore();
  
  // Validate inputs
  if (!vendorId || !addonId || !addonData) {
    throw new Error('vendorId, addonId, and addonData are required');
  }
  
  console.log('📝 Creating addon without image...');
  
  // Create Firestore document
  const addonDocRef = doc(firestore, `vendors/${vendorId}/addons/${addonId}`);
  const docData = {
    ...addonData,
    vendorId: vendorId,
    createdAt: new Date(),
    updatedAt: new Date(),
    imageUrl: null,
    thumbUrl: null,
    imageProcessing: false
  };
  
  await setDoc(addonDocRef, docData);
  
  console.log('✅ Addon created without image');
  return {
    success: true,
    addonId,
    addonData: docData
  };
}

/**
 * Generate a unique addon ID
 * @returns {string} - Unique addon ID
 */
export function generateAddonId() {
  return `addon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate image file before upload
 * @param {File} file - Image file to validate
 * @returns {Object} - Validation result
 */
export function validateImageFile(file) {
  const errors = [];
  
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }
  
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('Image must be less than 5MB');
  }
  
  // Check for valid image extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    errors.push('File must be a valid image format (JPG, PNG, GIF, WebP)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  };
}

/**
 * Validate addon data
 * @param {Object} addonData - Addon data to validate
 * @returns {Object} - Validation result
 */
export function validateAddonData(addonData) {
  const errors = [];
  
  if (!addonData.name || addonData.name.trim().length === 0) {
    errors.push('Addon name is required');
  }
  
  if (addonData.name && addonData.name.length > 100) {
    errors.push('Addon name must be less than 100 characters');
  }
  
  if (!addonData.price || addonData.price <= 0) {
    errors.push('Addon price must be greater than 0');
  }
  
  if (addonData.price > 1000000) {
    errors.push('Addon price must be less than ₦1,000,000');
  }
  
  if (addonData.description && addonData.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}