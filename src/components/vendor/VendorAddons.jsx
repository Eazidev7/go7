import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  XMarkIcon,
  PhotoIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import addOnService from '../../services/addOnService';
import { useToasts } from '../addons/ToastNotifications';
import './VendorAddons.css';

const VendorAddons = ({ vendorId }) => {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    addonCategory: 'food',
    description: '',
    available: true,
    measurement: {
      type: 'unit',
      min: 1,
      step: 1
    }
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const { showSuccess, showError } = useToasts();

  const normalizeMeasurement = (measurement) => {
    if (measurement && typeof measurement === 'object' && !Array.isArray(measurement)) {
      return {
        type: measurement.type || 'unit',
        min: Number(measurement.min) > 0 ? Number(measurement.min) : 1,
        step: Number(measurement.step) > 0 ? Number(measurement.step) : 1,
        max: measurement.max != null ? Number(measurement.max) : 10,
      };
    }
    return { type: 'unit', min: 1, step: 1, max: 10 };
  };

  // Load addons with real-time updates using onSnapshot
  useEffect(() => {
    if (!vendorId) {
      console.log('⚠️ No vendorId provided to VendorAddons component');
      setLoading(false);
      return;
    }

    console.log('🔍 VendorAddons: Loading add-ons for vendorId:', vendorId);
    let cancelled = false;
    let reloadTimer = null;
    let initial = true;

    const loadAllAddons = async ({ showSpinner = false } = {}) => {
      if (showSpinner) setLoading(true);
      let allAddons = [];

      try {
        // 1. Load vendor-level add-ons from vendors/{vendorId}/addons
        const vendorAddonsRef = collection(db, 'vendors', vendorId, 'addons');
        const vendorSnapshot = await getDocs(vendorAddonsRef);

        vendorSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          allAddons.push({
            ...data,
            id: docSnap.id,
            source: 'vendor',
            title: data.title || data.name || data.addonName || 'Unnamed',
            name: data.name || data.title || data.addonName || 'Unnamed',
            price: data.price ?? data.addonPrice ?? 0,
            imageUrl: data.imageUrl || data.image || data.addonImageUrl || '',
            description: data.description || '',
            measurement: normalizeMeasurement(data.measurement),
            available: data.available !== false,
          });
        });

        // 2. Load product-level add-ons (dedupe by id)
        const productsRef = collection(db, 'vendors', vendorId, 'products');
        const productsSnapshot = await getDocs(productsRef);

        for (const productDoc of productsSnapshot.docs) {
          try {
            const productAddonsRef = collection(db, 'vendors', vendorId, 'products', productDoc.id, 'addons');
            const productAddonsSnapshot = await getDocs(productAddonsRef);

            productAddonsSnapshot.forEach((addonDoc) => {
              const data = addonDoc.data();
              const exists = allAddons.find(a => a.id === addonDoc.id);
              if (!exists) {
                allAddons.push({
                  ...data,
                  id: addonDoc.id,
                  source: 'product',
                  productId: productDoc.id,
                  productName: productDoc.data().name || productDoc.data().title,
                  title: data.title || data.name || data.addonName || 'Unnamed',
                  name: data.name || data.title || data.addonName || 'Unnamed',
                  price: data.price ?? data.addonPrice ?? 0,
                  imageUrl: data.imageUrl || data.image || data.addonImageUrl || '',
                  description: data.description || '',
                  measurement: normalizeMeasurement(data.measurement),
                  available: data.available !== false,
                });
              }
            });
          } catch (productAddonError) {
            console.warn('Could not load addons for product', productDoc.id, productAddonError);
          }
        }

        // 3. Legacy path if empty
        if (allAddons.length === 0) {
          const legacyRef = collection(db, 'vendors', vendorId, 'addOns');
          const legacySnapshot = await getDocs(legacyRef);

          legacySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            allAddons.push({
              id: docSnap.id,
              source: 'legacy',
              title: data.title || data.name || data.addonName || 'Unnamed',
              name: data.name || data.title || data.addonName || 'Unnamed',
              price: data.price || data.addonPrice || 0,
              imageUrl: data.imageUrl || data.image || data.addonImageUrl || '',
              description: data.description || '',
              measurement: normalizeMeasurement(data.measurement),
              available: data.available !== false,
              ...data
            });
          });
        }

        if (!cancelled) setAddons(allAddons);
      } catch (error) {
        console.error('❌ Error loading addons:', error);
        if (!cancelled) showError('Failed to load add-ons');
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
        if (!cancelled && initial) {
          initial = false;
          setLoading(false);
        }
      }
    };

    loadAllAddons({ showSpinner: true });

    const vendorAddonsRef = collection(db, 'vendors', vendorId, 'addons');
    const unsubscribe = onSnapshot(vendorAddonsRef, () => {
      // Debounce snapshot reloads — never flip full-page loading spinner on save
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadAllAddons({ showSpinner: false });
      }, 300);
    });

    return () => {
      cancelled = true;
      if (reloadTimer) clearTimeout(reloadTimer);
      unsubscribe();
    };
  }, [vendorId]);

  const handleOpenModal = async (addon = null) => {
    if (addon) {
      setEditingAddon(addon);
      setFormData({
        title: addon.title || addon.name || '',
        price: addon.price?.toString() || '',
        addonCategory: addon.addonCategory || 'food',
        description: addon.description || '',
        available: addon.available !== false,
        measurement: normalizeMeasurement(addon.measurement)
      });
      setImagePreview(addon.imageUrl || null);
    } else {
      setEditingAddon(null);
      setFormData({
        title: '',
        price: '',
        addonCategory: 'food',
        description: '',
        available: true,
        measurement: {
          type: 'unit',
          min: 1,
          step: 1,
          max: 10
        }
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAddon(null);
    setFormData({
      title: '',
      price: '',
      addonCategory: 'food',
      measurement: {
        type: 'unit',
        min: 1,
        step: 1
      }
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showError('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file');
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

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showError('Please enter an add-on title');
      return;
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      showError('Please enter a valid price');
      return;
    }

    // Only require image for NEW addons, not when editing
    if (!editingAddon && !imageFile && !imagePreview) {
      showError('Please select an image');
      return;
    }

    const measurement = normalizeMeasurement(formData.measurement);

    try {
      setUploading(true);

      const addonData = {
        title: formData.title.trim(),
        price: parseFloat(formData.price),
        addonCategory: formData.addonCategory,
        description: formData.description?.trim() || '',
        available: formData.available,
        measurement
      };

      const savePromise = editingAddon
        ? addOnService.updateAddOn(
            vendorId,
            editingAddon.id,
            addonData,
            imageFile,
            { productId: editingAddon.productId || null }
          )
        : addOnService.createAddOn(vendorId, addonData, imageFile);

      // Hard timeout so the Save button never spins forever
      const result = await Promise.race([
        savePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Save is taking too long. Check your connection and try again.')), 45000)
        ),
      ]);

      console.log('✅ Save result:', result);
      showSuccess(editingAddon ? 'Add-on updated successfully!' : 'Add-on created successfully!');
      handleCloseModal();
    } catch (error) {
      console.error('❌ Error saving addon:', error);
      showError(error.message || 'Failed to save add-on');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (addon) => {
    const addonId = typeof addon === 'string' ? addon : addon?.id;
    if (!addonId) return;
    if (!window.confirm('Are you sure you want to delete this add-on?')) {
      return;
    }

    const productId = typeof addon === 'object' ? addon.productId || null : null;

    // Optimistic remove so product copies cannot flash back before fan-out finishes
    setAddons((prev) => prev.filter((a) => a.id !== addonId));

    try {
      await addOnService.deleteAddOn(vendorId, addonId, { productId });
      showSuccess('Add-on deleted successfully!');
    } catch (error) {
      console.error('Error deleting addon:', error);
      showError(error.message || 'Failed to delete add-on');
    }
  };

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'food': return 'bg-orange-100 text-orange-800';
      case 'market': return 'bg-blue-100 text-blue-800';
      case 'pharmacy': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMeasurementText = (measurement) => {
    const m = normalizeMeasurement(measurement);
    return `${m.type} (min: ${m.min}, step: ${m.step})`;
  };

  // Debug logging for render
  console.log('🎨 VendorAddons rendering with:', {
    vendorId,
    loading,
    addonsCount: addons.length,
    addons: addons
  });

  if (loading) {
    return (
      <div className="vendor-addons-loading">
        <div className="loading-spinner"></div>
        <p>Loading add-ons...</p>
      </div>
    );
  }

  return (
    <div className="vendor-addons">
      {/* Header */}
      <div className="vendor-addons-header">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add-On Management</h2>
          <p className="text-gray-600 mt-1">Manage your product add-ons and extras ({addons.length} add-ons)</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5" />
          New Add-on
        </button>
      </div>

      {/* Debug Info */}
      {addons.length === 0 && (
        <div style={{background: '#fff3cd', padding: '12px', margin: '10px 0', borderRadius: '8px', border: '1px solid #ffc107'}}>
          <strong>🔍 Debug Info:</strong>
          <div>Vendor ID: {vendorId || 'MISSING'}</div>
          <div>Loading: {loading ? 'Yes' : 'No'}</div>
          <div>Addons count: {addons.length}</div>
          <div>Check console for detailed logs</div>
        </div>
      )}

      {/* Add-ons Grid */}
      <div className="vendor-addons-grid">
        {addons.length === 0 ? (
          <div className="empty-state">
            <PhotoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No add-ons yet</h3>
            <p className="text-gray-500 mb-4">Create your first add-on to get started</p>
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary"
            >
              <PlusIcon className="w-5 h-5" />
              Create Add-on
            </button>
          </div>
        ) : (
          addons.map((addon) => (
            <motion.div
              key={addon.id}
              className="addon-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              whileHover={{ y: -2 }}
            >
              {/* Image */}
              <div className="addon-image">
                {addon.imageUrl && addon.imageUrl.trim() !== '' ? (
                  <img 
                    src={addon.imageUrl} 
                    alt={addon.title || addon.name || 'Add-on'}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f3f4f6; border-radius: 8px; font-size: 48px;">🍽️</div>';
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    fontSize: '48px'
                  }}>
                    🍽️
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="addon-content">
                <div className="addon-header">
                  <h3 className="addon-title">{addon.title || addon.name || 'Unnamed Add-on'}</h3>
                  <span className={`category-badge ${getCategoryBadgeColor(addon.addonCategory)}`}>
                    {addon.addonCategory || 'General'}
                  </span>
                </div>
                
                <div className="addon-details">
                  <p className="addon-price">₦{addon.price ? addon.price.toLocaleString() : '0'}</p>
                  <p className="addon-measurement">{addon.measurement ? getMeasurementText(addon.measurement) : 'N/A'}</p>
                  {addon.source && (
                    <p className="addon-source" style={{fontSize: '0.75rem', color: '#666', marginTop: '4px'}}>
                      {addon.source === 'product' ? `From: ${addon.productName || 'Product'}` : addon.source === 'vendor' ? 'Vendor Add-on' : 'Legacy'}
                    </p>
                  )}
                </div>

                <div className="addon-actions">
                  <button
                    onClick={() => handleOpenModal(addon)}
                    className="btn-secondary-sm"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(addon)}
                    className="btn-danger-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="modal-content addon-modal"
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="modal-header">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingAddon ? 'Edit Add-on' : 'Create New Add-on'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="btn-icon"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="modal-body">
                {/* Image Upload */}
                <div className="form-group">
                  <label className="form-label">Add-on Image</label>
                  <div className="image-upload-area">
                    {imagePreview ? (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Preview" />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="remove-image-btn"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="addon-image-upload" className="upload-placeholder" style={{ cursor: 'pointer' }}>
                        <CloudArrowUpIcon className="w-12 h-12 text-gray-400" />
                        <span>Click to upload image</span>
                        <span className="text-sm text-gray-500">PNG, JPG up to 5MB</span>
                      </label>
                    )}
                    <input
                      id="addon-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="form-input"
                    placeholder="e.g., Extra Cheese, Large Size"
                    required
                  />
                </div>

                {/* Price */}
                <div className="form-group">
                  <label className="form-label">Price (₦)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="form-input"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="form-input"
                    placeholder="Brief description of this add-on"
                    rows="3"
                  />
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={formData.addonCategory}
                    onChange={(e) => handleInputChange('addonCategory', e.target.value)}
                    className="form-select"
                  >
                    <option value="food">Food</option>
                    <option value="market">Market</option>
                    <option value="pharmacy">Pharmacy</option>
                  </select>
                </div>

                {/* Availability Toggle */}
                <div className="form-group">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.available}
                      onChange={(e) => handleInputChange('available', e.target.checked)}
                      className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                    />
                    <span className="form-label mb-0">Available</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    Customers can only select available add-ons
                  </p>
                </div>

                {/* Measurement */}
                <div className="form-group">
                  <label className="form-label">Measurement</label>
                  <div className="measurement-grid">
                    <div>
                      <label className="form-label-sm">Type</label>
                      <select
                        value={formData.measurement.type}
                        onChange={(e) => handleInputChange('measurement.type', e.target.value)}
                        className="form-select"
                      >
                        <option value="unit">Unit</option>
                        <option value="spoon">Spoon</option>
                        <option value="kg">Kilogram</option>
                        <option value="tablet">Tablet</option>
                        <option value="pack">Pack</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label-sm">Min</label>
                      <input
                        type="number"
                        value={formData.measurement.min}
                        onChange={(e) => handleInputChange('measurement.min', e.target.value)}
                        className="form-input"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="form-label-sm">Step</label>
                      <input
                        type="number"
                        value={formData.measurement.step}
                        onChange={(e) => handleInputChange('measurement.step', e.target.value)}
                        className="form-input"
                        min="1"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <div className="loading-spinner-sm"></div>
                        Saving...
                      </>
                    ) : (
                      editingAddon ? 'Update Add-on' : 'Create Add-on'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorAddons;