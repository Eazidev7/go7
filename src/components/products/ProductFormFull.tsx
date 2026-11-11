import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  TrashIcon, 
  PhotoIcon,
  CurrencyDollarIcon,
  TagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// TypeScript Interfaces
export interface AddOn {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  category?: 'protein' | 'carbs' | 'spicy' | 'drinks' | 'dessert';
}

export interface Variant {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  description?: string;
  sku?: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  category: string;
  productType: 'food' | 'market';
  deliveryTimeMinutes?: number;
  addons?: AddOn[];
  variants?: Variant[];
}

interface ProductFormProps {
  initialData?: ProductFormData;
  onSave: (product: ProductFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSave,
  onCancel,
  isLoading = false
}) => {
  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    imageUrl: '',
    basePrice: 0,
    category: '',
    productType: 'food',
    deliveryTimeMinutes: 30,
    addons: [],
    variants: [],
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'items'>('basic');

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
    }
  }, [initialData]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.imageUrl.trim()) newErrors.imageUrl = 'Image URL is required';
    if (formData.basePrice <= 0) newErrors.basePrice = 'Price must be greater than 0';
    if (!formData.category.trim()) newErrors.category = 'Category is required';

    // Validate add-ons for food products
    if (formData.productType === 'food' && formData.addons) {
      formData.addons.forEach((addon, index) => {
        if (!addon.name.trim()) {
          newErrors[`addon_${index}_name`] = 'Add-on name is required';
        }
        if (addon.price <= 0) {
          newErrors[`addon_${index}_price`] = 'Add-on price must be greater than 0';
        }
      });
    }

    // Validate variants for market products
    if (formData.productType === 'market' && formData.variants) {
      if (formData.variants.length === 0) {
        newErrors.variants = 'At least one variant is required for market products';
      }
      formData.variants.forEach((variant, index) => {
        if (!variant.name.trim()) {
          newErrors[`variant_${index}_name`] = 'Variant name is required';
        }
        if (variant.price <= 0) {
          newErrors[`variant_${index}_price`] = 'Variant price must be greater than 0';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  // Add-on management
  const addNewAddon = () => {
    const newAddon: AddOn = {
      id: `addon_${Date.now()}`,
      name: '',
      price: 0,
      imageUrl: '',
      category: 'protein'
    };
    setFormData({
      ...formData,
      addons: [...(formData.addons || []), newAddon]
    });
  };

  const updateAddon = (index: number, updates: Partial<AddOn>) => {
    const updatedAddons = [...(formData.addons || [])];
    updatedAddons[index] = { ...updatedAddons[index], ...updates };
    setFormData({ ...formData, addons: updatedAddons });
  };

  const removeAddon = (index: number) => {
    const updatedAddons = formData.addons?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, addons: updatedAddons });
  };

  // Variant management
  const addNewVariant = () => {
    const newVariant: Variant = {
      id: `variant_${Date.now()}`,
      name: '',
      price: 0,
      imageUrl: '',
      stock: 0
    };
    setFormData({
      ...formData,
      variants: [...(formData.variants || []), newVariant]
    });
  };

  const updateVariant = (index: number, updates: Partial<Variant>) => {
    const updatedVariants = [...(formData.variants || [])];
    updatedVariants[index] = { ...updatedVariants[index], ...updates };
    setFormData({ ...formData, variants: updatedVariants });
  };

  const removeVariant = (index: number) => {
    const updatedVariants = formData.variants?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, variants: updatedVariants });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6">
        <h1 className="text-3xl font-bold text-white">
          {initialData ? 'Edit Product' : 'Create New Product'}
        </h1>
        <p className="text-red-100 mt-2">
          Fill in the details below to {initialData ? 'update' : 'create'} your product
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              activeTab === 'basic'
                ? 'bg-white text-red-600 shadow-md'
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            Basic Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              activeTab === 'items'
                ? 'bg-white text-red-600 shadow-md'
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            {formData.productType === 'food' ? 'Add-ons' : 'Variants'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'basic' && (
            <motion.div
              key="basic"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Product Type Toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Product Type
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'food' })}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${
                      formData.productType === 'food'
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🍽️ Food
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'market' })}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${
                      formData.productType === 'market'
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🛒 Market
                  </button>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <div className="relative">
                    <TagIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter product name"
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="fast-food">Fast Food</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="groceries">Groceries</option>
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion</option>
                    <option value="home">Home & Garden</option>
                  </select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                </div>

                {/* Base Price */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {formData.productType === 'food' ? 'Base Price' : 'Starting Price'} (₦) *
                  </label>
                  <div className="relative">
                    <CurrencyDollarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="0"
                      min="0"
                      step="50"
                    />
                  </div>
                  {errors.basePrice && <p className="text-red-500 text-sm mt-1">{errors.basePrice}</p>}
                </div>

                {/* Delivery Time (Food only) */}
                {formData.productType === 'food' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Delivery Time (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.deliveryTimeMinutes || 30}
                      onChange={(e) => setFormData({ ...formData, deliveryTimeMinutes: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="30"
                      min="10"
                      max="120"
                    />
                  </div>
                )}
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Image URL *
                </label>
                <div className="relative">
                  <PhotoIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                {errors.imageUrl && <p className="text-red-500 text-sm mt-1">{errors.imageUrl}</p>}
                {formData.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-xl shadow-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description *
                </label>
                <div className="relative">
                  <DocumentTextIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Describe your product..."
                  />
                </div>
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>
            </motion.div>
          )}

          {activeTab === 'items' && (
            <motion.div
              key="items"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {formData.productType === 'food' ? (
                // Add-ons Section
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Add-ons</h3>
                    <button
                      type="button"
                      onClick={addNewAddon}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                    >
                      <PlusIcon className="h-5 w-5" />
                      <span>Add Add-on</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.addons?.map((addon, index) => (
                      <motion.div
                        key={addon.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-semibold text-gray-900">Add-on #{index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeAddon(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name *
                            </label>
                            <input
                              type="text"
                              value={addon.name}
                              onChange={(e) => updateAddon(index, { name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Add-on name"
                            />
                            {errors[`addon_${index}_name`] && (
                              <p className="text-red-500 text-sm mt-1">{errors[`addon_${index}_name`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Price (₦) *
                            </label>
                            <input
                              type="number"
                              value={addon.price}
                              onChange={(e) => updateAddon(index, { price: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="0"
                              min="0"
                            />
                            {errors[`addon_${index}_price`] && (
                              <p className="text-red-500 text-sm mt-1">{errors[`addon_${index}_price`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category
                            </label>
                            <select
                              value={addon.category || 'protein'}
                              onChange={(e) => updateAddon(index, { category: e.target.value as AddOn['category'] })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            >
                              <option value="protein">🍗 Protein</option>
                              <option value="carbs">🍚 Carbs</option>
                              <option value="spicy">🌶️ Spicy</option>
                              <option value="drinks">🥤 Drinks</option>
                              <option value="dessert">🍰 Dessert</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Image URL
                          </label>
                          <input
                            type="url"
                            value={addon.imageUrl || ''}
                            onChange={(e) => updateAddon(index, { imageUrl: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="https://example.com/addon-image.jpg"
                          />
                        </div>
                      </motion.div>
                    ))}

                    {(!formData.addons || formData.addons.length === 0) && (
                      <div className="text-center py-12 text-gray-500">
                        <p>No add-ons yet. Click "Add Add-on" to get started.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Variants Section
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Product Variants</h3>
                    <button
                      type="button"
                      onClick={addNewVariant}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                    >
                      <PlusIcon className="h-5 w-5" />
                      <span>Add Variant</span>
                    </button>
                  </div>

                  {errors.variants && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{errors.variants}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {formData.variants?.map((variant, index) => (
                      <motion.div
                        key={variant.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-semibold text-gray-900">Variant #{index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name *
                            </label>
                            <input
                              type="text"
                              value={variant.name}
                              onChange={(e) => updateVariant(index, { name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Variant name"
                            />
                            {errors[`variant_${index}_name`] && (
                              <p className="text-red-500 text-sm mt-1">{errors[`variant_${index}_name`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Price (₦) *
                            </label>
                            <input
                              type="number"
                              value={variant.price}
                              onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="0"
                              min="0"
                            />
                            {errors[`variant_${index}_price`] && (
                              <p className="text-red-500 text-sm mt-1">{errors[`variant_${index}_price`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Stock
                            </label>
                            <input
                              type="number"
                              value={variant.stock || 0}
                              onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="0"
                              min="0"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              SKU
                            </label>
                            <input
                              type="text"
                              value={variant.sku || ''}
                              onChange={(e) => updateVariant(index, { sku: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="SKU-001"
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Image URL
                            </label>
                            <input
                              type="url"
                              value={variant.imageUrl || ''}
                              onChange={(e) => updateVariant(index, { imageUrl: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="https://example.com/variant-image.jpg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={variant.description || ''}
                              onChange={(e) => updateVariant(index, { description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Variant description"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {(!formData.variants || formData.variants.length === 0) && (
                      <div className="text-center py-12 text-gray-500">
                        <p>No variants yet. Click "Add Variant" to get started.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`px-8 py-3 bg-red-500 text-white rounded-xl font-semibold transition-all ${
              isLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-red-600 hover:shadow-lg'
            }`}
          >
            {isLoading ? 'Saving...' : initialData ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;