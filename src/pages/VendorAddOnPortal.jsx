import React, { useState, useEffect } from 'react';
import { PlusIcon, MinusIcon, TrashIcon, PhotoIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer, useToasts } from '../components/addons/ToastNotifications';
import { uploadAddonWithImage } from '../services/addonImageUpload';
import { getAuth } from 'firebase/auth';

const VendorAddOnPortal = () => {
  const [addOns, setAddOns] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToasts();

  const [newAddon, setNewAddon] = useState({
    name: '',
    description: '',
    price: '',
    category: 'protein',
    images: [],
    isBundle: false,
    bundleItems: [],
    nutrition: '',
    unitLabel: 'each'
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Mock existing add-ons
  useEffect(() => {
    setAddOns([
      {
        id: 1,
        name: 'Extra Chicken Breast',
        description: 'Premium grilled chicken breast',
        price: 2500,
        category: 'protein',
        images: ['/api/placeholder/300/300'],
        isBundle: false,
        bundleItems: [],
        nutrition: 'High protein, low fat',
        active: true
      },
      {
        id: 2,
        name: 'Meal Combo Deal',
        description: 'Rice + Chicken + Drink',
        price: 4000,
        category: 'protein',
        images: ['/api/placeholder/300/300'],
        isBundle: true,
        bundleItems: ['Jollof Rice', 'Grilled Chicken', 'Soft Drink'],
        nutrition: 'Complete balanced meal',
        active: true
      }
    ]);
  }, []);

  const categories = [
    { value: 'protein', label: 'Protein', emoji: '🍗' },
    { value: 'carbs', label: 'Carbs', emoji: '🍚' },
    { value: 'spicy', label: 'Spicy', emoji: '🌶️' },
    { value: 'drinks', label: 'Drinks', emoji: '🥤' },
    { value: 'dessert', label: 'Dessert', emoji: '🍰' }
  ];

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        showError('Invalid File', `${file.name} is not an image file`);
        return false;
      }
      if (!isValidSize) {
        showError('File Too Large', `${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      // Create preview URLs
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setNewAddon(prev => ({
            ...prev,
            images: [...prev.images, e.target.result]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Upload images to Firebase
  const uploadImages = async () => {
    if (selectedFiles.length === 0) return [];

    setUploadingImage(true);
    const uploadedUrls = [];

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        showError('Authentication Required', 'Please log in to upload images');
        return [];
      }

      const vendorId = currentUser.uid; // Use authenticated user ID as vendor ID
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const addonId = `addon-${Date.now()}-${i}`;
        
        const addonData = {
          name: newAddon.name,
          description: newAddon.description,
          price: parseInt(newAddon.price),
          category: newAddon.category,
          unitLabel: newAddon.unitLabel,
          vendorId: vendorId
        };

        try {
          const result = await uploadAddonWithImage({
            vendorId,
            addonId,
            imageFile: file,
            addonData,
            onProgress: (progress) => {
              console.log(`Upload progress for ${file.name}: ${progress}%`);
            }
          });

          if (result.success) {
            uploadedUrls.push(result.originalUrl);
            showInfo('Upload Success', `${file.name} uploaded successfully`);
          } else {
            showError('Upload Failed', `Failed to upload ${file.name}`);
          }
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          showError('Upload Error', `Error uploading ${file.name}: ${fileError.message}`);
        }
      }
    } catch (error) {
      showError('Upload Error', 'Failed to upload images');
      console.error('Image upload error:', error);
    } finally {
      setUploadingImage(false);
    }

    return uploadedUrls;
  };

  const handleSaveAddon = async () => {
    if (!newAddon.name || !newAddon.price) {
      showError('Missing Fields', 'Please fill in name and price');
      return;
    }

    let finalImages = [...newAddon.images];

    // Upload new images if any
    if (selectedFiles.length > 0) {
      const uploadedUrls = await uploadImages();
      finalImages = [...finalImages.filter(img => !img.startsWith('data:')), ...uploadedUrls];
    }

    const addon = {
      ...newAddon,
      id: editingAddon ? editingAddon.id : Date.now(),
      price: parseInt(newAddon.price),
      images: finalImages,
      imageUrl: finalImages[0] || '', // Set primary image
      active: true
    };

    if (editingAddon) {
      setAddOns(prev => prev.map(item => item.id === editingAddon.id ? addon : item));
      showSuccess('Updated', `${addon.name} has been updated`);
    } else {
      setAddOns(prev => [...prev, addon]);
      showSuccess('Created', `${addon.name} has been added`);
    }

    resetForm();
  };

  // Remove image from preview
  const removeImage = (index) => {
    setNewAddon(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setNewAddon({
      name: '',
      description: '',
      price: '',
      category: 'protein',
      images: [],
      isBundle: false,
      bundleItems: [],
      nutrition: '',
      unitLabel: 'each'
    });
    setSelectedFiles([]);
    setIsCreating(false);
    setEditingAddon(null);
  };

  const handleEdit = (addon) => {
    setNewAddon({ ...addon, price: addon.price.toString() });
    setEditingAddon(addon);
    setIsCreating(true);
  };

  const handleDelete = (id) => {
    const addon = addOns.find(a => a.id === id);
    setAddOns(prev => prev.filter(item => item.id !== id));
    showError('Deleted', `${addon.name} has been removed`);
  };

  const handleToggleActive = (id) => {
    setAddOns(prev => prev.map(item => 
      item.id === id ? { ...item, active: !item.active } : item
    ));
  };

  const addBundleItem = () => {
    setNewAddon(prev => ({
      ...prev,
      bundleItems: [...prev.bundleItems, '']
    }));
  };

  const updateBundleItem = (index, value) => {
    setNewAddon(prev => ({
      ...prev,
      bundleItems: prev.bundleItems.map((item, i) => i === index ? value : item)
    }));
  };

  const removeBundleItem = (index) => {
    setNewAddon(prev => ({
      ...prev,
      bundleItems: prev.bundleItems.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Add-On Management Portal</h1>
          <p className="opacity-90">Create and manage your premium add-ons</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Create Button */}
        {!isCreating && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCreating(true)}
            className="mb-6 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Create New Add-On
          </motion.button>
        )}

        {/* Create/Edit Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-xl p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingAddon ? 'Edit Add-On' : 'Create New Add-On'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add-On Name *
                    </label>
                    <input
                      type="text"
                      value={newAddon.name}
                      onChange={(e) => setNewAddon(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="e.g., Extra Chicken Breast"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newAddon.description}
                      onChange={(e) => setNewAddon(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Describe your add-on..."
                    />
                  </div>

                  {/* Price & Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (₦) *
                      </label>
                      <input
                        type="number"
                        value={newAddon.price}
                        onChange={(e) => setNewAddon(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="2500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={newAddon.category}
                        onChange={(e) => setNewAddon(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.emoji} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Nutrition Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nutrition Info
                    </label>
                    <input
                      type="text"
                      value={newAddon.nutrition}
                      onChange={(e) => setNewAddon(prev => ({ ...prev, nutrition: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="e.g., High protein, low fat"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Bundle Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <h3 className="font-semibold text-gray-900">Bundle Deal</h3>
                      <p className="text-sm text-gray-600">Combine multiple items</p>
                    </div>
                    <button
                      onClick={() => setNewAddon(prev => ({ ...prev, isBundle: !prev.isBundle }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        newAddon.isBundle ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        newAddon.isBundle ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Bundle Items */}
                  <AnimatePresence>
                    {newAddon.isBundle && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700">
                            Bundle Items
                          </label>
                          <button
                            onClick={addBundleItem}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <PlusIcon className="w-5 h-5" />
                          </button>
                        </div>
                        {newAddon.bundleItems.map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => updateBundleItem(index, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Bundle item name"
                            />
                            <button
                              onClick={() => removeBundleItem(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <MinusIcon className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add-On Images
                    </label>
                    
                    {/* Image Upload Area */}
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingImage}
                      />
                      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                        uploadingImage 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-300 hover:border-red-400 hover:bg-red-50'
                      }`}>
                        {uploadingImage ? (
                          <div className="flex flex-col items-center">
                            <CloudArrowUpIcon className="w-12 h-12 text-blue-500 mx-auto mb-2 animate-bounce" />
                            <p className="text-blue-600 font-medium">Uploading images...</p>
                            <p className="text-sm text-blue-500">Please wait</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 font-medium">Click to upload images</p>
                            <p className="text-sm text-gray-500">PNG, JPG up to 10MB each</p>
                            <p className="text-xs text-gray-400 mt-1">Multiple images supported</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image Previews */}
                    {newAddon.images.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Selected Images ({newAddon.images.length})
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {newAddon.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                              {index === 0 && (
                                <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                                  Primary
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          ✨ The first image will be used as the primary addon image
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Unit Label Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Label
                    </label>
                    <select
                      value={newAddon.unitLabel}
                      onChange={(e) => setNewAddon(prev => ({...prev, unitLabel: e.target.value}))}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                    >
                      <option value="each">Each</option>
                      <option value="piece">Piece</option>
                      <option value="serving">Serving</option>
                      <option value="bowl">Bowl</option>
                      <option value="plate">Plate</option>
                      <option value="bottle">Bottle</option>
                      <option value="cup">Cup</option>
                      <option value="portion">Portion</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <motion.button
                  whileHover={{ scale: uploadingImage ? 1 : 1.02 }}
                  whileTap={{ scale: uploadingImage ? 1 : 0.98 }}
                  onClick={handleSaveAddon}
                  disabled={uploadingImage}
                  className={`flex-1 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 ${
                    uploadingImage 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-xl'
                  }`}
                >
                  {uploadingImage ? (
                    <div className="flex items-center justify-center gap-2">
                      <CloudArrowUpIcon className="w-5 h-5 animate-spin" />
                      Uploading Images...
                    </div>
                  ) : (
                    editingAddon ? 'Update Add-On' : 'Create Add-On'
                  )}
                </motion.button>
                <button
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add-Ons List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Add-Ons ({addOns.length})</h2>
          
          {addOns.map((addon) => (
            <motion.div
              key={addon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl shadow-lg p-6 ${!addon.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={addon.images[0] || '/api/placeholder/80/80'}
                    alt={addon.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{addon.name}</h3>
                    <p className="text-gray-600">{addon.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-lg font-bold text-red-600">₦{addon.price.toLocaleString()}</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm capitalize">
                        {categories.find(c => c.value === addon.category)?.emoji} {addon.category}
                      </span>
                      {addon.isBundle && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          Bundle
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleActive(addon.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      addon.active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {addon.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleEdit(addon)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(addon.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default VendorAddOnPortal;