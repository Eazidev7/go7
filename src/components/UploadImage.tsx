import React, { useState, useCallback, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Upload, X, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadImageProps {
  vendorId: string;
  productId?: string;
  addonId?: string;
  onUploadComplete: (publicUrl: string) => void;
  onUploadError?: (error: string) => void;
  existingImageUrl?: string;
  className?: string;
}

interface UploadResponse {
  uploadUrl: string;
  objectName: string;
  publicUrl: string;
}

export function UploadImage({
  vendorId,
  productId,
  addonId,
  onUploadComplete,
  onUploadError,
  existingImageUrl,
  className = ''
}: UploadImageProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload image file using Firebase Functions
  const uploadImageFile = async (file: File): Promise<string> => {
    try {
      // Get signed upload URL from Cloud Function
      const functions = getFunctions();
      const getUploadUrl = httpsCallable<any, UploadResponse>(functions, 'getUploadUrl');
      
      const response = await getUploadUrl({
        vendorId,
        productId: productId || null,
        addonId: addonId || null,
        fileName: file.name,
        contentType: file.type
      });
      
      const { uploadUrl, publicUrl } = response.data;
      
      // Upload file directly to Cloud Storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }
      
      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Handle file selection and upload
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP)');
      onUploadError?.('Invalid file type');
      return;
    }
    
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      onUploadError?.('File too large');
      return;
    }
    
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    
    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    
    try {
      // Simulate upload progress (since we can't track real progress with signed URLs)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 20, 90));
      }, 200);
      
      const publicUrl = await uploadImageFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Clean up preview URL
      URL.revokeObjectURL(preview);
      
      // Set final image URL
      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);
      
      // Reset after success
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      setError(error.message || 'Upload failed. Please try again.');
      onUploadError?.(error.message || 'Upload failed');
      
      // Clean up preview
      URL.revokeObjectURL(preview);
      setPreviewUrl(existingImageUrl || null);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [vendorId, productId, addonId, onUploadComplete, onUploadError, existingImageUrl]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Remove image
  const handleRemoveImage = useCallback(() => {
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl transition-all duration-200
          ${isUploading ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-orange-400'}
          ${error ? 'border-red-400 bg-red-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {previewUrl ? (
          // Image Preview
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Upload preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            
            {/* Upload Progress Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm font-medium">{uploadProgress}% Complete</p>
                </div>
              </div>
            )}
            
            {/* Success Indicator */}
            {uploadProgress === 100 && !isUploading && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 bg-green-500 text-white p-2 rounded-full"
              >
                <Check size={16} />
              </motion.div>
            )}
            
            {/* Remove Button */}
            {!isUploading && (
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 left-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          // Upload Prompt
          <div 
            className="p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors rounded-xl"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
              {isUploading ? (
                <div className="w-12 h-12 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
              ) : (
                <ImageIcon size={48} />
              )}
            </div>
            
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </p>
            
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop an image here, or click to browse
            </p>
            
            <div className="text-xs text-gray-400">
              Supports: JPEG, PNG, WebP • Max 10MB
            </div>
            
            {isUploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">{uploadProgress}% uploaded</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-sm text-red-600"
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </motion.div>
      )}
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}

// Utility function for external use
export async function uploadImageFile(
  vendorId: string, 
  productId: string | null, 
  addonId: string | null,
  file: File
): Promise<{ publicUrl: string; objectName: string }> {
  const functions = getFunctions();
  const getUploadUrl = httpsCallable<any, UploadResponse>(functions, 'getUploadUrl');
  
  const response = await getUploadUrl({
    vendorId,
    productId,
    addonId,
    fileName: file.name,
    contentType: file.type
  });
  
  const { uploadUrl, objectName, publicUrl } = response.data;
  
  // Upload file
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
  
  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.statusText}`);
  }
  
  return { publicUrl, objectName };
}