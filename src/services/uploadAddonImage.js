// uploadAddonImage.js - Client-side addon image upload (Hostinger bypass)
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";
import { uploadImageToHostinger } from "./hostingerImageUpload";

/**
 * Upload addon image via Hostinger and create/update Firestore document.
 * Firebase Storage is blocked on go7-app-209e4 — no thumbnail Cloud Function wait.
 */
export async function uploadAddonImage({
  vendorId,
  addonId,
  file,
  addonData = {},
  onProgress
}) {
  const firestore = getFirestore();

  if (!vendorId || !addonId || !file) {
    throw new Error('vendorId, addonId, and file are required');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image file must be less than 5MB');
  }

  console.log('📤 Starting addon image upload (Hostinger):', {
    vendorId,
    addonId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  const addonDocRef = doc(firestore, `vendors/${vendorId}/addons/${addonId}`);
  const docData = {
    title: addonData.title || 'Untitled Addon',
    price: addonData.price || 0,
    unitType: addonData.unitType || 'each',
    unitLabel: addonData.unitLabel || 'piece',
    inStock: addonData.inStock !== undefined ? addonData.inStock : true,
    category: addonData.category || 'general',
    description: addonData.description || '',
    vendorId,
    createdAt: addonData.createdAt || new Date(),
    updatedAt: new Date(),
    imageProcessing: true,
    imageUrl: null,
    thumbUrl: null
  };

  await setDoc(addonDocRef, docData, { merge: true });

  if (onProgress) {
    onProgress({ progress: 10, bytesTransferred: 0, totalBytes: file.size, state: 'running' });
  }

  const fileExtension = file.name.split('.').pop() || 'jpg';
  const imageUrl = await uploadImageToHostinger(
    file,
    `vendors/${vendorId}/addons/${addonId}/original.${fileExtension}`
  );

  if (onProgress) {
    onProgress({ progress: 100, bytesTransferred: file.size, totalBytes: file.size, state: 'success' });
  }

  const finalData = {
    ...docData,
    imageUrl,
    thumbUrl: imageUrl,
    imageProcessing: false,
    updatedAt: new Date()
  };

  await setDoc(addonDocRef, finalData, { merge: true });

  console.log('🎉 Addon image upload complete!', { addonId, imageUrl });

  return {
    success: true,
    addonId,
    imageUrl,
    thumbUrl: imageUrl,
    addonData: finalData
  };
}

/**
 * Update addon image - replaces existing image
 */
export async function updateAddonImage({
  vendorId,
  addonId,
  file,
  onProgress
}) {
  const firestore = getFirestore();
  const addonDocRef = doc(firestore, `vendors/${vendorId}/addons/${addonId}`);
  await setDoc(addonDocRef, {
    imageProcessing: true,
    updatedAt: new Date()
  }, { merge: true });

  return uploadAddonImage({
    vendorId,
    addonId,
    file,
    onProgress
  });
}

/**
 * Delete addon document (Hostinger images are retained — no delete API)
 */
export async function deleteAddonWithImages(vendorId, addonId) {
  const firestore = getFirestore();
  console.log('🗑️ Deleting addon:', { vendorId, addonId });
  const addonDocRef = doc(firestore, `vendors/${vendorId}/addons/${addonId}`);
  await deleteDoc(addonDocRef);
  console.log('✅ Addon deleted successfully');
}

export function generateAddonId() {
  return `addon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function validateImageFile(file) {
  const errors = [];

  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }

  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('Image must be less than 5MB');
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
