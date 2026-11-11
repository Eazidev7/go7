import React, { useState } from 'react';
import { db } from '../firebase/config';
import { createProduct } from '../services/productService';
import { uploadImageToHostinger } from '../services/hostingerImageUpload';
import { FaTimes, FaUpload, FaImage, FaSpinner } from 'react-icons/fa';
import Swal from 'sweetalert2';

const AddProductModal = ({ vendorId, onClose, onProductAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    available: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const categories = [
    'Food & Beverages',
    'Electronics',
    'Clothing',
    'Health & Beauty',
    'Home & Garden',
    'Sports & Outdoors',
    'Books & Media',
    'Automotive',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'File Too Large',
          text: 'Please select an image smaller than 5MB',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          title: 'Invalid File Type',
          text: 'Please select an image file',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const safeName = String(imageFile.name || 'product.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      return await uploadImageToHostinger(
        imageFile,
        `vendors/${vendorId}/products/${timestamp}_${safeName}`
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim() || !formData.price || !formData.category) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please fill in all required fields',
        icon: 'warning',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    if (isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      Swal.fire({
        title: 'Invalid Price',
        text: 'Please enter a valid price greater than 0',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;
      
      // Upload image if provided
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // Create product data
      const productData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        description: formData.description.trim(),
        imageUrl: imageUrl,
        addons: [] // Empty addons array, will be populated by vendor
      };

      // Use productService to create product with V2 schema
      const productId = await createProduct(vendorId, productData);

      Swal.fire({
        title: 'Product Added!',
        text: `${formData.name} has been successfully added to your inventory`,
        icon: 'success',
        confirmButtonColor: '#1BC47D'
      });

      // Reset form
      setFormData({
        name: '',
        price: '',
        category: '',
        description: '',
        available: true
      });
      setImageFile(null);
      setImagePreview(null);

      // Notify parent component
      if (onProductAdded) {
        onProductAdded(productId, productData);
      }

    } catch (error) {
      console.error('Error adding product:', error);
      
      Swal.fire({
        title: 'Error',
        text: 'Failed to add product. Please try again.',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Image */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Product Image
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <FaImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Click to upload product image
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading || uploading}
              />
            </div>
            {uploading && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <FaSpinner className="w-4 h-4 animate-spin" />
                <span>Uploading image...</span>
              </div>
            )}
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter product name"
            />
          </div>

          {/* Price and Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price (₦) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="Enter product description (optional)"
            />
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="available"
              name="available"
              checked={formData.available}
              onChange={handleInputChange}
              disabled={loading}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="available" className="text-sm font-medium text-gray-700">
              Product is available for order
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  <span>Adding Product...</span>
                </>
              ) : (
                <>
                  <FaUpload className="w-4 h-4" />
                  <span>Add Product</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;