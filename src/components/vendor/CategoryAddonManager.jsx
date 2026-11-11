/**
 * 🎯 CATEGORY ADDON MANAGER
 * 
 * Allows vendors to manage add-ons at the category level
 * These add-ons are inherited by all products in the category
 * Path: vendors/{vendorId}/categories/{categoryId}/addons
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadImageToHostinger } from '../../services/hostingerImageUpload';
import { Plus, Edit, Trash2, Image as ImageIcon, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import './CategoryAddonManager.css';

export default function CategoryAddonManager({ vendorId, categoryId, categoryName }) {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    price: '',
    minQty: 0,
    maxQty: 10,
    isAvailable: true,
    image: null,
    imagePreview: null
  });

  useEffect(() => {
    if (vendorId && categoryId) {
      loadCategoryAddons();
    }
  }, [vendorId, categoryId]);

  const loadCategoryAddons = async () => {
    try {
      setLoading(true);
      const addonsRef = collection(db, 'vendors', vendorId, 'categories', categoryId, 'addons');
      const snapshot = await getDocs(addonsRef);
      
      const addonsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAddons(addonsList);
      console.log(`✅ Loaded ${addonsList.length} category addons`);
    } catch (error) {
      console.error('Error loading category addons:', error);
      const msg = error?.code === 'permission-denied'
        ? 'Permission denied loading category extras — contact support'
        : 'Failed to load category extras';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file' && files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setForm({ 
        ...form, 
        image: file,
        imagePreview: previewUrl
      });
    } else if (type === 'checkbox') {
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      price: '',
      minQty: 0,
      maxQty: 10,
      isAvailable: true,
      image: null,
      imagePreview: null
    });
    setEditingId(null);
    setShowForm(false);
  };

  const uploadAddonImage = async (addonId, imageFile) => {
    try {
      return await uploadImageToHostinger(
        imageFile,
        `vendors/${vendorId}/categories/${categoryId}/addons/${addonId}.jpg`
      );
    } catch (error) {
      console.error('Error uploading addon image:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.price) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Saving addon...');

    try {
      const addonData = {
        name: form.name.trim(),
        price: parseFloat(form.price),
        minQty: parseInt(form.minQty) || 0,
        maxQty: parseInt(form.maxQty) || 10,
        isAvailable: form.isAvailable,
        source: 'category',
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        // Update existing addon
        let imageUrl = addons.find(a => a.id === editingId)?.imageUrl;
        
        if (form.image) {
          imageUrl = await uploadAddonImage(editingId, form.image);
        }

        const addonRef = doc(db, 'vendors', vendorId, 'categories', categoryId, 'addons', editingId);
        await updateDoc(addonRef, {
          ...addonData,
          imageUrl: imageUrl || null
        });
        
        toast.success('Addon updated!', { id: loadingToast });
      } else {
        // Create new addon
        addonData.createdAt = serverTimestamp();
        addonData.imageUrl = null;

        const addonsRef = collection(db, 'vendors', vendorId, 'categories', categoryId, 'addons');
        const docRef = await addDoc(addonsRef, addonData);

        // Upload image if provided (non-blocking — extra still saves without photo)
        if (form.image) {
          try {
            const imageUrl = await uploadAddonImage(docRef.id, form.image);
            await updateDoc(doc(db, 'vendors', vendorId, 'categories', categoryId, 'addons', docRef.id), {
              imageUrl
            });
          } catch (imageError) {
            console.error('Category extra image upload failed:', imageError);
            toast.success('Extra saved (image upload failed — you can edit and retry)', { id: loadingToast });
            resetForm();
            loadCategoryAddons();
            return;
          }
        }

        toast.success('Category extra created!', { id: loadingToast });
      }

      resetForm();
      loadCategoryAddons();
    } catch (error) {
      console.error('Error saving addon:', error);
      const msg = error?.code === 'permission-denied'
        ? 'Permission denied — category extras could not be saved'
        : error?.code === 'storage/unauthorized'
        ? 'Extra saved but image upload was blocked'
        : `Failed to save category extra${error?.message ? `: ${error.message}` : ''}`;
      toast.error(msg, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (addon) => {
    setForm({
      name: addon.name,
      price: addon.price.toString(),
      minQty: addon.minQty || 0,
      maxQty: addon.maxQty || 10,
      isAvailable: addon.isAvailable !== false,
      image: null,
      imagePreview: addon.imageUrl
    });
    setEditingId(addon.id);
    setShowForm(true);
  };

  const handleDelete = async (addon) => {
    if (!window.confirm(`Delete "${addon.name}"? This cannot be undone.`)) {
      return;
    }

    const loadingToast = toast.loading('Deleting addon...');

    try {
      const addonRef = doc(db, 'vendors', vendorId, 'categories', categoryId, 'addons', addon.id);
      await deleteDoc(addonRef);
      
      toast.success('Addon deleted!', { id: loadingToast });
      loadCategoryAddons();
    } catch (error) {
      console.error('Error deleting addon:', error);
      toast.error('Failed to delete addon', { id: loadingToast });
    }
  };

  const toggleAvailability = async (addon) => {
    const loadingToast = toast.loading('Updating...');

    try {
      const addonRef = doc(db, 'vendors', vendorId, 'categories', categoryId, 'addons', addon.id);
      await updateDoc(addonRef, {
        isAvailable: !addon.isAvailable,
        updatedAt: serverTimestamp()
      });
      
      toast.success('Availability updated!', { id: loadingToast });
      loadCategoryAddons();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update', { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="category-addons-loading">
        <div className="spinner"></div>
        <p>Loading category add-ons...</p>
      </div>
    );
  }

  return (
    <div className="category-addon-manager">
      <div className="addon-header">
        <div>
          <h3>Category Add-ons</h3>
          <p className="addon-subtitle">
            📁 These add-ons will be available for all products in "{categoryName}"
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-add-addon"
        >
          <Plus size={18} />
          Add Category Addon
        </button>
      </div>

      {/* Addon Form */}
      {showForm && (
        <div className="addon-form-card">
          <div className="form-header">
            <h4>{editingId ? 'Edit Addon' : 'New Category Addon'}</h4>
            <button onClick={resetForm} className="btn-icon">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="addon-form">
            <div className="form-row">
              <div className="form-group">
                <label>Addon Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Fried Egg, Extra Portion, Bottled Water"
                  required
                />
              </div>

              <div className="form-group">
                <label>Price (₦) *</label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Min Quantity</label>
                <input
                  type="number"
                  name="minQty"
                  value={form.minQty}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Max Quantity</label>
                <input
                  type="number"
                  name="maxQty"
                  value={form.maxQty}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Addon Image</label>
              <div className="image-upload-row">
                <input
                  type="file"
                  name="image"
                  onChange={handleInputChange}
                  accept="image/*"
                />
                {form.imagePreview && (
                  <div className="image-preview">
                    <img src={form.imagePreview} alt="Preview" />
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isAvailable"
                  checked={form.isAvailable}
                  onChange={handleInputChange}
                />
                <span>Available to customers</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : editingId ? 'Update Addon' : 'Create Addon'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addons List */}
      {addons.length === 0 ? (
        <div className="addons-empty">
          <ImageIcon size={48} color="#ccc" />
          <h4>No category add-ons yet</h4>
          <p>Create shared add-ons that all products in this category can use</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Create First Addon
          </button>
        </div>
      ) : (
        <div className="addons-grid">
          {addons.map(addon => (
            <div key={addon.id} className={`addon-card ${!addon.isAvailable ? 'disabled' : ''}`}>
              <div className="addon-image-wrapper">
                {addon.imageUrl ? (
                  <img src={addon.imageUrl} alt={addon.name} className="addon-image" />
                ) : (
                  <div className="addon-placeholder">
                    <ImageIcon size={32} color="#ccc" />
                  </div>
                )}
                <div className="addon-source-badge">📁 Category</div>
              </div>

              <div className="addon-info">
                <h4>{addon.name}</h4>
                <p className="addon-price">₦{addon.price.toLocaleString()}</p>
                {(addon.minQty > 0 || addon.maxQty < 99) && (
                  <p className="addon-qty">Qty: {addon.minQty}-{addon.maxQty}</p>
                )}
              </div>

              <div className="addon-actions">
                <button
                  onClick={() => toggleAvailability(addon)}
                  className={`btn-toggle ${addon.isAvailable ? 'active' : ''}`}
                  title={addon.isAvailable ? 'Disable' : 'Enable'}
                >
                  {addon.isAvailable ? '✓' : '✗'}
                </button>
                <button
                  onClick={() => handleEdit(addon)}
                  className="btn-icon"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(addon)}
                  className="btn-icon btn-danger"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
