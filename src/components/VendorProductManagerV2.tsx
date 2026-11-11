/**
 * 🍱 VENDOR PRODUCT MANAGER V2
 * 
 * Complete V2 product management system with:
 * - Product CRUD operations
 * - Image upload for products and addons
 * - Measurement type support
 * - Real-time updates
 * - Category management
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VendorMenuSetupGuide from './vendor/VendorMenuSetupGuide';
import VendorImageCaptureInput from './vendor/VendorImageCaptureInput';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Image as ImageIcon, 
  Package,
  Save,
  X,
  Camera,
  Tag,
  Scale,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import productServiceV2, { 
  V2Product, 
  V2Addon, 
  MEASUREMENT_TYPES, 
  CATEGORIES 
} from '../services/productServiceV2';
import { createUncategorizedCategory } from '../services/vendorCategoryService';
import { normalizeMediaUrl } from '../utils/vendorImage';

interface VendorProductManagerV2Props {
  vendorId: string;
}

const VendorProductManagerV2: React.FC<VendorProductManagerV2Props> = ({ vendorId }) => {
  const [products, setProducts] = useState<V2Product[]>([]);
  const [vendorCategories, setVendorCategories] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    category: CATEGORIES.FOOD,
    categoryId: '', // NEW: Reference to vendor category
    measurementType: MEASUREMENT_TYPES.UNIT,
    minQty: 1,
    maxQty: 10,
    image: null as File | null,
    imagePreview: null as string | null
  });
  
  const [addons, setAddons] = useState<V2Addon[]>([]);
  
  // Initialize with one empty addon row
  const createEmptyAddon = (): V2Addon & { image?: File | null; imagePreview?: string | null } => ({
    id: `addon_${Date.now()}_${Math.random()}`,
    name: '',
    price: 0,
    imageUrl: null,
    isAvailable: true,
    image: null,
    imagePreview: null
  });

  // Initialize addons with one empty row on component mount
  useEffect(() => {
    if (addons.length === 0) {
      setAddons([createEmptyAddon()]);
    }
  }, []);

  // Fetch vendor categories on mount
  useEffect(() => {
    if (vendorId) {
      fetchVendorCategories();
    }
  }, [vendorId]);

  // Fetch products on component mount
  useEffect(() => {
    if (vendorId) {
      setupProductsListener();
    }
    return () => {
      // Cleanup listener
    };
  }, [vendorId]);

  const fetchVendorCategories = async () => {
    try {
      const categoriesRef = collection(db, `vendors/${vendorId}/categories`);
      const snapshot = await getDocs(categoriesRef);
      const categories = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unnamed Category'
      }));
      setVendorCategories(categories);
      
      // Set default categoryId if categories exist
      if (categories.length > 0 && !form.categoryId) {
        setForm(prev => ({ ...prev, categoryId: categories[0].id }));
      }
      return categories;
    } catch (error) {
      console.error('Error fetching vendor categories:', error);
      toast.error('Failed to load categories');
      return [];
    }
  };

  const ensureVendorCategoryId = async (): Promise<string> => {
    if (form.categoryId && vendorCategories.some((cat) => cat.id === form.categoryId)) {
      return form.categoryId;
    }

    const categories = vendorCategories.length > 0
      ? vendorCategories
      : await fetchVendorCategories();

    if (categories.length > 0) {
      const categoryId = categories[0].id;
      setForm((prev) => ({ ...prev, categoryId }));
      return categoryId;
    }

    const created = await createUncategorizedCategory(vendorId);
    const next = [{ id: created.id, name: created.name || 'Uncategorized' }];
    setVendorCategories(next);
    setForm((prev) => ({ ...prev, categoryId: created.id }));
    return created.id;
  };

  const setupProductsListener = () => {
    setLoading(true);
    const unsubscribe = productServiceV2.setupProductsListener(
      vendorId,
      (updatedProducts, error) => {
        if (error) {
          console.error('Products listener error:', error);
          toast.error('Failed to sync product updates');
        } else {
          setProducts(updatedProducts);
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  const handleImageFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setForm({
      ...form,
      image: file,
      imagePreview: previewUrl,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, files } = e.target as HTMLInputElement;
    
    if (type === 'file' && files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setForm({ 
        ...form, 
        image: file,
        imagePreview: previewUrl
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAddonChange = (index: number, field: string, value: any) => {
    const updatedAddons = [...addons];
    
    if (field === 'image' && value) {
      const file = value;
      const previewUrl = URL.createObjectURL(file);
      updatedAddons[index] = {
        ...updatedAddons[index],
        image: file,
        imagePreview: previewUrl
      };
    } else if (field === 'price') {
      updatedAddons[index] = {
        ...updatedAddons[index],
        [field]: parseFloat(value) || 0
      };
    } else {
      updatedAddons[index] = {
        ...updatedAddons[index],
        [field]: value
      };
    }
    
    setAddons(updatedAddons);
  };  const addAddonRow = () => {
    setAddons([...addons, createEmptyAddon()]);
    toast.success('New addon row added');
  };

  const removeAddonRow = (index: number) => {
    if (addons.length === 1) {
      toast.error('At least one addon row is required');
      return;
    }
    
    const updatedAddons = addons.filter((_, i) => i !== index);
    setAddons(updatedAddons);
    toast.success('Addon row removed');
  };
  
  const validateAddons = (): boolean => {
    const filledAddons = addons.filter(addon => addon.name.trim() !== '' || addon.price > 0);
    
    for (let i = 0; i < filledAddons.length; i++) {
      const addon = filledAddons[i];
      if (!addon.name.trim()) {
        toast.error(`Addon ${i + 1}: Name is required`);
        return false;
      }
      if (addon.price < 0) {
        toast.error(`Addon ${i + 1}: Price must be 0 or greater`);
        return false;
      }
    }
    
    return true;
  };

  const openForm = () => {
    setShowForm(true);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      basePrice: '',
      category: CATEGORIES.FOOD,
      categoryId: vendorCategories.length > 0 ? vendorCategories[0].id : '',
      measurementType: MEASUREMENT_TYPES.UNIT,
      minQty: 1,
      maxQty: 10,
      image: null,
      imagePreview: null
    });
    setAddons([createEmptyAddon()]); // Initialize with one empty addon row
    setEditingId(null);
    setShowForm(false);
    document.body.style.overflow = '';
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.basePrice) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate addons
    if (!validateAddons()) {
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Saving product...');

    try {
      const filledAddons = addons.filter(addon => addon.name.trim() !== '' || addon.price > 0);
      const categoryId = await ensureVendorCategoryId();

      const selectedCategory = vendorCategories.find(cat => cat.id === categoryId)
        || { id: categoryId, name: 'Uncategorized' };
      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        basePrice: parseFloat(form.basePrice),
        category: form.category,
        categoryId,
        categoryName: selectedCategory?.name || 'Uncategorized',
        measurementType: form.measurementType as 'unit' | 'portion' | 'bundle' | 'weight',
        minQty: form.minQty,
        maxQty: form.maxQty,
        addons: [],
        imageUrl: editingId ? products.find(p => p.id === editingId)?.imageUrl : null,
        isAvailable: true
      };

      let productId = editingId;
      let imageUploadWarning: string | null = null;

      if (editingId) {
        if (form.image) {
          try {
            const imageUrl = await productServiceV2.uploadProductImage(vendorId, editingId, form.image);
            productData.imageUrl = imageUrl;
          } catch (uploadError) {
            console.error('Product image upload failed:', uploadError);
            imageUploadWarning = 'Product updated but image upload failed. Try uploading the image again.';
          }
        }
        await productServiceV2.updateProduct(vendorId, editingId, productData);
        toast.success(
          imageUploadWarning || 'Product updated!',
          imageUploadWarning ? { id: loadingToast, icon: '⚠️' } : { id: loadingToast }
        );
      } else {
        productId = await productServiceV2.createProduct(vendorId, productData);
        if (form.image && productId) {
          try {
            const imageUrl = await productServiceV2.uploadProductImage(vendorId, productId, form.image);
            await productServiceV2.updateProduct(vendorId, productId, { imageUrl });
          } catch (uploadError) {
            console.error('Product image upload failed:', uploadError);
            imageUploadWarning = 'Product saved but image upload failed. Edit the product to add an image.';
          }
        }
        toast.success(
          imageUploadWarning || `Product "${form.name}" created successfully!`,
          imageUploadWarning ? { id: loadingToast, icon: '⚠️' } : { id: loadingToast }
        );
        console.log(`✅ Product created with ID: ${productId} at path: vendors/${vendorId}/products/${productId}`);
      }

      const processedAddons = await Promise.all(
        filledAddons.map(async (addon, index) => {
          let addonImageUrl = addon.imageUrl;

          if (addon.image) {
            try {
              addonImageUrl = await productServiceV2.uploadAddonImage(vendorId, addon.id, addon.image);
            } catch (error) {
              console.error(`Error uploading addon ${index + 1} image:`, error);
              toast.error(`Failed to upload addon ${index + 1} image`);
            }
          }

          return {
            id: addon.id,
            name: addon.name.trim(),
            price: addon.price,
            imageUrl: addonImageUrl,
            isAvailable: addon.isAvailable !== false
          };
        })
      );

      // Save addons to subcollection if any exist
      if (processedAddons.length > 0 && productId) {
        try {
          await productServiceV2.saveAddonsToSubcollection(vendorId, productId, processedAddons);
          console.log('✅ Addons saved to subcollection');
        } catch (addonError) {
          console.error('❌ Error saving addons:', addonError);
          toast.error('Product saved but failed to save addons');
        }
      }

      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      const message = error instanceof Error ? error.message : 'Failed to save product';
      toast.error(message, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: V2Product) => {
    setForm({
      name: product.name,
      description: product.description,
      basePrice: (product.basePrice || 0).toString(),
      category: product.category,
      categoryId: (product as any).categoryId || (vendorCategories.length > 0 ? vendorCategories[0].id : ''),
      measurementType: product.measurementType,
      minQty: product.minQty,
      maxQty: product.maxQty,
      image: null,
      imagePreview: product.imageUrl
    });
    
    // Initialize addons or create one empty addon row if none exist
    const existingAddons = product.addons && product.addons.length > 0 
      ? product.addons.map(addon => ({ ...addon, image: null, imagePreview: addon.imageUrl }))
      : [createEmptyAddon()];
      
    setAddons(existingAddons);
    setEditingId(product.id);
    openForm();
  };

  const handleDelete = async (product: V2Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      return;
    }

    const loadingToast = toast.loading('Deleting product...');

    try {
      await productServiceV2.deleteProduct(vendorId, product.id);
      if (product.imageUrl) {
        await productServiceV2.deleteProductImage(vendorId, product.id);
      }
      toast.success('Product deleted!', { id: loadingToast });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product', { id: loadingToast });
    }
  };

  const toggleAvailability = async (product: V2Product) => {
    const loadingToast = toast.loading('Updating availability...');

    try {
      await productServiceV2.toggleProductAvailability(vendorId, product.id, !product.isAvailable);
      toast.success(
        `Product ${!product.isAvailable ? 'enabled' : 'disabled'}!`,
        { id: loadingToast }
      );
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability', { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        <span className="ml-3 text-gray-600">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
      {/* Menu setup guide for vendors */}
      <VendorMenuSetupGuide />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Product Management</h2>
          <p className="text-sm sm:text-base text-gray-600">Add and edit your menu items</p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : openForm())}
          className="w-full sm:w-auto bg-yellow-500 text-white px-4 py-2.5 rounded-lg hover:bg-yellow-600 transition flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Product Form — fullscreen scrollable sheet on mobile */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close product form"
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={resetForm}
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="z-50 max-lg:fixed max-lg:inset-0 max-lg:flex max-lg:flex-col max-lg:bg-white lg:relative lg:inset-auto lg:z-auto lg:rounded-xl lg:shadow-sm lg:border lg:p-6"
            >
              <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b bg-white sticky top-0 z-10 lg:static lg:px-0 lg:py-0 lg:border-0 lg:mb-4">
                <h3 className="text-lg font-semibold">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 lg:overflow-visible lg:flex-none lg:px-0 lg:py-0">
                <form id="vendor-product-form" onSubmit={handleSubmit} className="space-y-4 pb-4 [&_input]:text-base [&_textarea]:text-base [&_select]:text-base">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="e.g. Rice & Beans, Jollof Rice, Amala & Ewedu"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price (₦) *
                  </label>
                  <input
                    type="number"
                    name="basePrice"
                    value={form.basePrice}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="What's included? e.g. One portion of white rice with stewed beans."
                />
              </div>

              {/* Product Category & Business Category & Measurement */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Category *
                  </label>
                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a category</option>
                    {vendorCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {vendorCategories.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Please create categories first in the Categories tab
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value={CATEGORIES.FOOD}>Food</option>
                    <option value={CATEGORIES.PHARMACY}>Pharmacy</option>
                    <option value={CATEGORIES.LOCAL_MARKET}>Local Market</option>
                    <option value={CATEGORIES.GROCERY}>Grocery</option>
                    <option value={CATEGORIES.OTHER}>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Measurement Type
                  </label>
                  <select
                    name="measurementType"
                    value={form.measurementType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value={MEASUREMENT_TYPES.UNIT}>Unit (plates, bottles)</option>
                    <option value={MEASUREMENT_TYPES.PORTION}>Portion (small, medium, large)</option>
                    <option value={MEASUREMENT_TYPES.BUNDLE}>Bundle (per tuber, per bunch)</option>
                    <option value={MEASUREMENT_TYPES.WEIGHT}>Weight (per kg, per derica)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Qty
                    </label>
                    <input
                      type="number"
                      name="minQty"
                      value={form.minQty}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Qty
                    </label>
                    <input
                      type="number"
                      name="maxQty"
                      value={form.maxQty}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image {!editingId && '*'}
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <VendorImageCaptureInput
                      onImageSelected={handleImageFile}
                      disabled={submitting}
                    />
                  </div>
                  {form.imagePreview && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border">
                      <img
                        src={form.imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Multiple Addons Repeater Section */}
              <div className="border-t pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">Extras for this dish (add-ons)</h4>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                      Optional items customers pick with this plate — e.g. Fried Egg, Extra Portion, Bottled Water
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addAddonRow}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-2 text-sm shrink-0"
                  >
                    <Plus size={16} />
                    Add Another Extra
                  </button>
                </div>
                
                <div className="space-y-4">
                  {addons.map((addon, index) => (
                    <motion.div
                      key={addon.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-gray-50 p-4 rounded-lg border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Addon #{index + 1}
                        </span>
                        {addons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAddonRow(index)}
                            className="text-red-500 hover:text-red-700 transition"
                            title="Remove this addon"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Addon Name */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Addon Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Fried Egg, Extra Portion, Bottled Water"
                            value={addon.name}
                            onChange={(e) => handleAddonChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                          />
                        </div>
                        
                        {/* Addon Price */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Price (₦)
                          </label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={addon.price}
                            onChange={(e) => handleAddonChange(index, 'price', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                          />
                        </div>
                        
                        {/* Addon Image */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Image (Optional)
                          </label>
                          <div className="flex items-center gap-2">
                            <VendorImageCaptureInput
                              compact
                              onImageSelected={(file) => handleAddonChange(index, 'image', file)}
                            />
                            {(addon.imagePreview || addon.imageUrl) && (
                              <div className="w-8 h-8 rounded overflow-hidden border">
                                <img
                                  src={addon.imagePreview || addon.imageUrl}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Addon Preview */}
                      {addon.name && addon.price > 0 && (
                        <div className="mt-3 p-2 bg-white rounded border-l-4 border-yellow-500">
                          <div className="flex items-center gap-2">
                            {(addon.imagePreview || addon.imageUrl) && (
                              <img
                                src={addon.imagePreview || addon.imageUrl}
                                alt={addon.name}
                                className="w-6 h-6 rounded object-cover"
                              />
                            )}
                            <span className="text-sm font-medium">{addon.name}</span>
                            <span className="text-sm text-gray-600">+₦{addon.price.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
                
                {addons.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No addons added yet</p>
                    <button
                      type="button"
                      onClick={addAddonRow}
                      className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                    >
                      Add your first addon
                    </button>
                  </div>
                )}
              </div>

                </form>
              </div>

              <div className="flex-shrink-0 border-t bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:border-0 lg:px-0 lg:pt-4">
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="vendor-product-form"
                    disabled={submitting}
                    className="w-full sm:flex-1 bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>Processing...</>
                    ) : editingId ? (
                      <>
                        <Save size={20} />
                        Update Product
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Create Product
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Products List */}
      <div className="bg-white rounded-xl shadow-sm border min-w-0 max-w-full overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <h3 className="text-lg font-semibold">Your Products ({products.length})</h3>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-500 mb-4">Start by adding your first product</p>
            <button
              onClick={openForm}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
            >
              Add Product
            </button>
          </div>
        ) : (
          <div className="divide-y min-w-0">
            {products.map((product) => (
              <div key={product.id} className="p-4 sm:p-6 min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  {/* Image + details */}
                  <div className="flex gap-3 min-w-0 flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {normalizeMediaUrl(product.imageUrl) ? (
                        <img
                          src={normalizeMediaUrl(product.imageUrl) || ''}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                        {product.name}
                      </h4>
                      {product.description && (
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2 break-words">
                          {product.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
                        <span className="font-semibold text-gray-900">
                          ₦{Number(product.basePrice).toLocaleString()}
                        </span>
                        {product.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                            <Tag size={12} />
                            {product.category}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                          <Scale size={12} />
                          {product.measurementType}
                        </span>
                        {product.addons && product.addons.length > 0 && (
                          <span className="text-blue-600 text-xs">
                            {product.addons.length} extra{product.addons.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions — own row on mobile so nothing is off-screen */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-shrink-0 border-t border-gray-100 pt-3 sm:border-t-0 sm:pt-0">
                    <button
                      onClick={() => toggleAvailability(product)}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        product.isAvailable
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {product.isAvailable ? (
                        <>
                          <Eye size={14} />
                          Available
                        </>
                      ) : (
                        <>
                          <EyeOff size={14} />
                          Hidden
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-sm font-medium"
                    >
                      <Edit size={16} />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(product)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition text-sm font-medium"
                      aria-label={`Delete ${product.name}`}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorProductManagerV2;