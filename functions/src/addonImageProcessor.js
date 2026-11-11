const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const sharp = require('sharp');
const {Storage} = require('@google-cloud/storage');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const storage = new Storage();

// File upload validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Validates file upload security
 */
function validateFileUpload(object) {
  const filePath = object.name;
  const contentType = object.contentType;
  const fileSize = object.size;

  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    console.error('❌ File too large:', fileSize, 'bytes (max:', MAX_FILE_SIZE, 'bytes)');
    throw new Error('File size exceeds maximum allowed size of 5MB');
  }

  // Check MIME type
  if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType.toLowerCase())) {
    console.error('❌ Invalid MIME type:', contentType);
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
  }

  // Check file extension
  const extension = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    console.error('❌ Invalid file extension:', extension);
    throw new Error('Invalid file extension. Only .jpg, .jpeg, .png, and .webp are allowed');
  }

  // Check for MIME type spoofing
  if (extension === '.jpg' && contentType !== 'image/jpeg' && contentType !== 'image/jpg') {
    console.error('❌ MIME type spoofing detected:', extension, contentType);
    throw new Error('File type mismatch detected');
  }

  if (extension === '.png' && contentType !== 'image/png') {
    console.error('❌ MIME type spoofing detected:', extension, contentType);
    throw new Error('File type mismatch detected');
  }

  if (extension === '.webp' && contentType !== 'image/webp') {
    console.error('❌ MIME type spoofing detected:', extension, contentType);
    throw new Error('File type mismatch detected');
  }

  return true;
}

/**
 * Cloud Function to create thumbnail when addon image is uploaded
 * Triggers on: vendors/{vendorId}/addons/{addonId}/original.jpg
 * Creates: vendors/{vendorId}/addons/{addonId}/thumb.jpg (400x400)
 * Updates: Firestore doc with imageUrl and thumbUrl
 */
exports.generateAddonThumbnail = functions.runWith({
  timeoutSeconds: 540,
  memory: '1GB'
}).storage.object().onFinalize(async (object) => {
  const filePath = object.name; // vendors/{vendorId}/addons/{addonId}/original.jpg
  const contentType = object.contentType;
  
  console.log('🔥 Cloud Function triggered for file:', filePath);
  
  // Exit if not an addon upload or not an image
  if (!filePath || !filePath.includes('/addons/') || !filePath.endsWith('/original.jpg')) {
    console.log('⚠️ Not an addon original image, skipping');
    return null;
  }
  
  if (!contentType || !contentType.startsWith('image/')) {
    console.log('⚠️ Not an image file, skipping');
    return null;
  }

  // Validate file upload security
  try {
    validateFileUpload(object);
  } catch (error) {
    console.error('❌ File validation failed:', error.message);
    // Delete the invalid file
    const bucket = storage.bucket(object.bucket);
    await bucket.file(filePath).delete().catch(err => {
      console.error('Failed to delete invalid file:', err);
    });
    return null;
  }

  const bucketName = object.bucket;
  const bucket = storage.bucket(bucketName);

  // Parse path: vendors/{vendorId}/addons/{addonId}/original.jpg
  const pathParts = filePath.split('/');
  if (pathParts.length !== 5 || pathParts[0] !== 'vendors' || pathParts[2] !== 'addons') {
    console.log('⚠️ Invalid path structure, expected: vendors/{vendorId}/addons/{addonId}/original.jpg');
    return null;
  }

  const vendorId = pathParts[1];
  const addonId = pathParts[3];
  const fileName = pathParts[4];

  console.log('📋 Processing addon image:', {vendorId, addonId, fileName});

  // Generate paths
  const fileExtension = path.extname(fileName);
  const baseName = path.basename(fileName, fileExtension);
  const thumbPath = `vendors/${vendorId}/addons/${addonId}/thumb.jpg`;
  
  // Local temp file paths
  const tempLocalFile = path.join(os.tmpdir(), `${vendorId}_${addonId}_${baseName}${fileExtension}`);
  const tempLocalThumb = path.join(os.tmpdir(), `${vendorId}_${addonId}_thumb.jpg`);

  try {
    console.log('⬇️ Downloading original image...');
    // Download the original image
    await bucket.file(filePath).download({destination: tempLocalFile});
    console.log('✅ Original image downloaded');

    console.log('🖼️ Creating thumbnail...');
    // Create thumbnail using Sharp
    await sharp(tempLocalFile)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(tempLocalThumb);
    console.log('✅ Thumbnail created');

    console.log('⬆️ Uploading thumbnail...');
    // Upload thumbnail to Storage
    await bucket.upload(tempLocalThumb, {
      destination: thumbPath,
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    });
    console.log('✅ Thumbnail uploaded');

    // Generate public URLs
    const originalUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filePath)}`;
    const thumbUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(thumbPath)}`;

    console.log('💾 Updating Firestore document...');
    // Update Firestore document with URLs
    const docRef = admin.firestore().doc(`vendors/${vendorId}/addons/${addonId}`);
    await docRef.set({
      imageUrl: originalUrl,
      thumbUrl: thumbUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, {merge: true});
    console.log('✅ Firestore document updated');

    console.log('🎉 Addon thumbnail generation complete!', {
      vendorId,
      addonId,
      originalUrl,
      thumbUrl
    });

  } catch (error) {
    console.error('❌ Error generating thumbnail:', error);
    
    // Update Firestore with error status
    try {
      const docRef = admin.firestore().doc(`vendors/${vendorId}/addons/${addonId}`);
      await docRef.set({
        imageProcessingError: true,
        imageProcessingErrorMessage: error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, {merge: true});
    } catch (firestoreError) {
      console.error('❌ Failed to update Firestore with error:', firestoreError);
    }
    
    throw error;
  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(tempLocalFile)) {
        fs.unlinkSync(tempLocalFile);
        console.log('🧹 Cleaned up temp original file');
      }
      if (fs.existsSync(tempLocalThumb)) {
        fs.unlinkSync(tempLocalThumb);
        console.log('🧹 Cleaned up temp thumbnail file');
      }
    } catch (cleanupError) {
      console.error('⚠️ Error cleaning up temp files:', cleanupError);
    }
  }

  return null;
});

/**
 * Helper function to delete addon images when addon is deleted
 */
exports.cleanupAddonImages = functions.firestore
  .document('vendors/{vendorId}/addons/{addonId}')
  .onDelete(async (snap, context) => {
    const vendorId = context.params.vendorId;
    const addonId = context.params.addonId;
    
    console.log('🗑️ Addon deleted, cleaning up images:', {vendorId, addonId});
    
    try {
      const bucket = storage.bucket();
      
      // Delete both original and thumbnail images
      const originalPath = `vendors/${vendorId}/addons/${addonId}/original.jpg`;
      const thumbPath = `vendors/${vendorId}/addons/${addonId}/thumb.jpg`;
      
      const deletePromises = [];
      
      // Check if files exist before attempting to delete
      const [originalExists] = await bucket.file(originalPath).exists();
      if (originalExists) {
        deletePromises.push(bucket.file(originalPath).delete());
        console.log('🗑️ Deleting original image:', originalPath);
      }
      
      const [thumbExists] = await bucket.file(thumbPath).exists();
      if (thumbExists) {
        deletePromises.push(bucket.file(thumbPath).delete());
        console.log('🗑️ Deleting thumbnail image:', thumbPath);
      }
      
      await Promise.all(deletePromises);
      console.log('✅ Addon images cleaned up successfully');
      
    } catch (error) {
      console.error('❌ Error cleaning up addon images:', error);
      // Don't throw error as this shouldn't prevent document deletion
    }
    
    return null;
  });