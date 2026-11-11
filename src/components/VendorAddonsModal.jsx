import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  PhotoIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { FirestoreVendorHelpers } from '../utils/firestoreVendorHelpers';

const VendorAddonsModal = ({ vendorId, editingAddon = null, onClose, onAddonAdded }) => {
  const [formData, setFormData] = useState({
    name: editingAddon?.name || '',
    price: editingAddon?.price || '',
    category: editingAddon?.category || 'protein',
    measurementType: editingAddon?.measurementType || 'unit',
    minQty: editingAddon?.minQty || 1,
    maxQty: editingAddon?.maxQty || 10,
    step: editingAddon?.step || 1,
    customLabel: editingAddon?.customLabel || '',
    description: editingAddon?.description || '',
    active: editingAddon?.active !== undefined ? editingAddon.active : true
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(editingAddon?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const categories = [
    { value: 'protein', label: 'Protein (Meat, Fish, Eggs)' },
    { value: 'carbs', label: 'Carbohydrates (Rice, Pasta)' },
    { value: 'vegetables', label: 'Vegetables & Sides' },
    { value: 'spicy', label: 'Spicy & Seasonings' },
    { value: 'drinks', label: 'Drinks & Beverages' },
    { value: 'dessert', label: 'Desserts & Sweets' },
    { value: 'other', label: 'Other' }
  ];

  const measurementTypes = [
    { value: 'unit', label: 'Unit (1, 2, 3...)' },
    { value: 'tuber', label: 'Per Tuber (yam, potato)' },
    { value: 'pack', label: 'Per Pack (500g, 1kg)' },
    { value: 'spoon', label: 'Per Spoon (seasoning)' },
    { value: 'piece', label: 'Per Piece (discrete items)' },
    { value: 'kg', label: 'Per Kg (weight-based)' },
    { value: 'custom', label: 'Custom Unit' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Add-on name is required';
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    
    if (formData.measurementType === 'custom' && !formData.customLabel.trim()) {
      newErrors.customLabel = 'Custom unit label is required';
    }
    
    if (formData.minQty < 1) {
      newErrors.minQty = 'Minimum quantity must be at least 1';
    }
    
    if (formData.maxQty < formData.minQty) {
      newErrors.maxQty = 'Maximum quantity must be greater than minimum';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setUploading(true);
      
      const addonData = {
        ...formData,
        price: parseFloat(formData.price),
        minQty: parseInt(formData.minQty),
        maxQty: parseInt(formData.maxQty),
        step: parseInt(formData.step)
      };
      
      if (editingAddon) {
        await FirestoreVendorHelpers.updateAddon(
          vendorId,
          editingAddon.id,
          addonData,
          imageFile
        );
        console.log('✅ Addon updated successfully');
      } else {
        await FirestoreVendorHelpers.createAddon(
          vendorId,
          addonData,
          imageFile
        );
        console.log('✅ Addon created successfully');
      }
      
      onAddonAdded?.();
      onClose();
    } catch (error) {
      console.error('❌ Error saving addon:', error);
      alert('Failed to save add-on. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingAddon ? 'Edit Add-on' : 'Add New Add-on'}
              </h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add-on Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Extra Chicken, Avocado Slice"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₦) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="100"
                  />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Measurement Type
                  </label>
                  <select
                    name="measurementType"
                    value={formData.measurementType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {measurementTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.measurementType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Unit Label *
                    </label>
                    <input
                      type="text"
                      name="customLabel"
                      value={formData.customLabel}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.customLabel ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Cup, Bottle, Sachet"
                    />
                    {errors.customLabel && (
                      <p className="mt-1 text-sm text-red-600">{errors.customLabel}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    name="minQty"
                    value={formData.minQty}
                    onChange={handleInputChange}
                    min="1"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.minQty ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.minQty && (
                    <p className="mt-1 text-sm text-red-600">{errors.minQty}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Quantity
                  </label>
                  <input
                    type="number"
                    name="maxQty"
                    value={formData.maxQty}
                    onChange={handleInputChange}
                    min={formData.minQty}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.maxQty ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.maxQty && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxQty}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Step Size
                  </label>
                  <input
                    type="number"
                    name="step"
                    value={formData.step}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the add-on..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add-on Image
                  </label>
                  <div className="flex items-center space-x-4">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <PhotoIcon className="w-5 h-5 mr-2" />
                        {imagePreview ? 'Change Image' : 'Upload Image'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Make this add-on active immediately
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <CloudArrowUpIcon className="w-4 h-4 mr-2 animate-spin" />
                      {editingAddon ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {editingAddon ? 'Update Add-on' : 'Create Add-on'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default VendorAddonsModal;