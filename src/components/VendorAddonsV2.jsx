import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import addOnService from '../services/addOnServiceV2';
import toast from 'react-hot-toast';
import './VendorAddonsV2.css';

const VendorAddonsV2 = ({ vendorId }) => {
  const { user } = useAuth();
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    unitType: 'each',
    unitLabel: 'piece',
    inStock: true
  });
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Fetch addons and categories on component mount
  useEffect(() => {
    if (vendorId) {
      fetchAddons();
      fetchCategories();
      
      // Set up real-time listener
      const unsubscribe = addOnService.listenToVendorAddOns(vendorId, (updatedAddons, error) => {
        if (error) {
          console.error('Error in addons listener:', error);
          toast.error('Failed to sync addon updates');
        } else {
          setAddons(updatedAddons || []);
        }
      });
      
      return () => unsubscribe && unsubscribe();
    }
  }, [vendorId]);

  const fetchAddons = async () => {
    try {
      setLoading(true);
      const fetchedAddons = await addOnService.getVendorAddOns(vendorId);
      setAddons(fetchedAddons);
    } catch (error) {
      console.error('Error fetching addons:', error);
      toast.error('Failed to fetch addons');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const fetchedCategories = await addOnService.getAddonCategories(vendorId);
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error('You must be logged in to manage addons');
      return;
    }

    // Validate form data
    const validation = addOnService.validateAddonData(formData);
    if (!validation.valid) {
      toast.error(validation.errors.join(', '));
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const addonData = {
        ...formData,
        price: parseFloat(formData.price)
      };

      const onProgress = (progressData) => {
        setUploadProgress(progressData.progress);
      };

      let result;
      if (editingAddon) {
        // Update existing addon
        result = await addOnService.updateAddOn(
          vendorId,
          editingAddon.id,
          addonData,
          selectedImage,
          onProgress
        );
        toast.success('Addon updated successfully!');
      } else {
        // Create new addon
        result = await addOnService.createAddOn(
          vendorId,
          addonData,
          selectedImage,
          onProgress
        );
        toast.success('Addon created successfully!');
      }

      console.log('Operation result:', result);
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Refresh categories if new category was added
      if (addonData.category && !categories.includes(addonData.category)) {
        fetchCategories();
      }
      
    } catch (error) {
      console.error('Error saving addon:', error);
      toast.error(error.message || 'Failed to save addon');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (addon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name || '',
      description: addon.description || '',
      price: addon.price?.toString() || '',
      category: addon.category || '',
      unitType: addon.unitType || 'each',
      unitLabel: addon.unitLabel || 'piece',
      inStock: addon.inStock !== undefined ? addon.inStock : true
    });
    
    // Set image preview if addon has thumbnail
    if (addon.thumbUrl) {
      setImagePreview(addon.thumbUrl);
    }
    
    setShowModal(true);
  };

  const handleDelete = async (addon) => {
    if (!window.confirm(`Are you sure you want to delete "${addon.name}"?`)) {
      return;
    }

    try {
      await addOnService.deleteAddOn(vendorId, addon.id);
      toast.success('Addon deleted successfully!');
      fetchCategories(); // Refresh categories
    } catch (error) {
      console.error('Error deleting addon:', error);
      toast.error('Failed to delete addon');
    }
  };

  const handleToggleAvailability = async (addon) => {
    try {
      await addOnService.toggleAddonAvailability(vendorId, addon.id, !addon.inStock);
      toast.success(`Addon ${!addon.inStock ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      console.error('Error toggling addon availability:', error);
      toast.error('Failed to update addon availability');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      unitType: 'each',
      unitLabel: 'piece',
      inStock: true
    });
    setSelectedImage(null);
    setImagePreview(null);
    setEditingAddon(null);
  };

  const filteredAddons = addons.filter(addon => {
    const matchesSearch = addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (addon.description && addon.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || addon.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="vendor-addons-v2">
      <div className="addons-header">
        <h2>🍽️ Addon Management V2</h2>
        <p>Manage your restaurant add-ons with automatic thumbnail generation</p>
      </div>

      {/* Controls */}
      <div className="addons-controls">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search addons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="add-addon-btn"
        >
          ➕ Add New Addon
        </button>
      </div>

      {/* Addons Grid */}
      {loading ? (
        <div className="loading">Loading addons...</div>
      ) : (
        <div className="addons-grid">
          {filteredAddons.length === 0 ? (
            <div className="no-addons">
              <h3>No addons found</h3>
              <p>Start by creating your first addon!</p>
            </div>
          ) : (
            filteredAddons.map(addon => (
              <div key={addon.id} className={`addon-card ${!addon.inStock ? 'out-of-stock' : ''}`}>
                <div className="addon-image">
                  {addon.thumbUrl ? (
                    <img src={addon.thumbUrl} alt={addon.name} />
                  ) : (
                    <div className="no-image">📷</div>
                  )}
                  {!addon.inStock && <div className="out-of-stock-overlay">Out of Stock</div>}
                </div>
                
                <div className="addon-info">
                  <h3>{addon.name}</h3>
                  {addon.description && <p className="description">{addon.description}</p>}
                  <div className="price">₦{addon.price?.toLocaleString()}</div>
                  <div className="category-badge">{addon.category}</div>
                  <div className="unit-info">
                    {addon.unitType}: {addon.unitLabel}
                  </div>
                </div>
                
                <div className="addon-actions">
                  <button
                    onClick={() => handleToggleAvailability(addon)}
                    className={`availability-btn ${addon.inStock ? 'in-stock' : 'out-of-stock'}`}
                  >
                    {addon.inStock ? '✅' : '❌'}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(addon)}
                    className="edit-btn"
                  >
                    ✏️
                  </button>
                  
                  <button
                    onClick={() => handleDelete(addon)}
                    className="delete-btn"
                  >
                    🗑️
                  </button>
                </div>
                
                {addon.imageProcessing && (
                  <div className="processing-indicator">
                    🔄 Processing image...
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingAddon ? 'Edit Addon' : 'Add New Addon'}</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="close-btn"
              >
                ✖️
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="addon-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Price (₦) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="e.g., protein, spicy, drinks"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Unit Type</label>
                  <select
                    value={formData.unitType}
                    onChange={(e) => setFormData({...formData, unitType: e.target.value})}
                  >
                    <option value="each">Each</option>
                    <option value="weight">Weight</option>
                    <option value="volume">Volume</option>
                    <option value="portion">Portion</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Unit Label</label>
                  <input
                    type="text"
                    value={formData.unitLabel}
                    onChange={(e) => setFormData({...formData, unitLabel: e.target.value})}
                    placeholder="e.g., piece, gram, ml"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.inStock}
                    onChange={(e) => setFormData({...formData, inStock: e.target.checked})}
                  />
                  In Stock
                </label>
              </div>
              
              <div className="form-group">
                <label>Image (max 5MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>
              
              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${uploadProgress}%`}}
                    ></div>
                  </div>
                  <span>{Math.round(uploadProgress)}% uploaded</span>
                </div>
              )}
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isUploading}
                  className="save-btn"
                >
                  {isUploading ? 'Processing...' : (editingAddon ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorAddonsV2;