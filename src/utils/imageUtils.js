/**
 * GO7 Image Utilities
 * Helper functions for handling product and vendor images
 */

/**
 * Get the correct image path for a product
 * @param {Object} product - Product object with image or imageUrl property
 * @returns {string} - Resolved image path
 */
export const getProductImagePath = (product) => {
  const img = product?.image || product?.imageUrl;
  
  if (!img) return '/assets/products/placeholder.jpg';
  
  // If already a full path (starts with / or http), use as-is
  if (img.startsWith('/') || img.startsWith('http')) return img;
  
  // Otherwise, assume it's a filename and prepend the assets path
  return `/assets/products/${img}`;
};

/**
 * Get the correct image path for a vendor
 * @param {Object} vendor - Vendor object with img or image property
 * @returns {string} - Resolved image path
 */
export const getVendorImagePath = (vendor) => {
  const img = vendor?.img || vendor?.image;
  
  if (!img) return '/assets/vendors/placeholder.jpg';
  
  // If already a full path (starts with / or http), use as-is
  if (img.startsWith('/') || img.startsWith('http')) return img;
  
  // Otherwise, assume it's a filename and prepend the assets path
  return `/assets/vendors/${img}`;
};

/**
 * Handle image load error with fallback
 * @param {Event} e - Error event from img onError
 * @param {string} type - 'product' or 'vendor'
 */
export const handleImageError = (e, type = 'product') => {
  const fallbackPath = type === 'vendor' 
    ? '/assets/vendors/placeholder.jpg'
    : '/assets/products/placeholder.jpg';
  
  e.target.src = fallbackPath;
};

/**
 * Image component props with optimal settings
 * @param {string} src - Image source
 * @param {string} alt - Alt text
 * @param {string} type - 'product' or 'vendor'
 * @returns {Object} - Props to spread on img element
 */
export const getOptimalImageProps = (src, alt, type = 'product') => {
  return {
    src,
    alt,
    loading: 'lazy',
    onError: (e) => handleImageError(e, type),
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    }
  };
};

/**
 * Create a placeholder image URL for a specific type
 * @param {string} type - 'product', 'vendor', 'restaurant', 'market', 'pharmacy', 'shop'
 * @returns {string} - Placeholder image path
 */
export const getPlaceholder = (type = 'product') => {
  const placeholders = {
    product: '/assets/products/placeholder.jpg',
    vendor: '/assets/vendors/placeholder.jpg',
    restaurant: '/assets/vendors/restaurant-placeholder.jpg',
    market: '/assets/vendors/market-placeholder.jpg',
    pharmacy: '/assets/vendors/pharmacy-placeholder.jpg',
    shop: '/assets/vendors/shop-placeholder.jpg',
  };
  
  return placeholders[type] || placeholders.product;
};

// Export all functions
export default {
  getProductImagePath,
  getVendorImagePath,
  handleImageError,
  getOptimalImageProps,
  getPlaceholder
};
