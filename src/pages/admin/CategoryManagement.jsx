import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import './CategoryManagement.css';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    description: '',
    displayOrder: 0,
    isActive: true
  });
  const [iconFile, setIconFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categoriesRef = collection(db, 'categories');
      const snapshot = await getDocs(categoriesRef);
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by displayOrder
      categoriesData.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleIconChange = (e) => {
    if (e.target.files[0]) {
      setIconFile(e.target.files[0]);
    }
  };

  const uploadIcon = async () => {
    if (!iconFile) return formData.icon;

    setUploading(true);
    try {
      const iconRef = ref(storage, `categories/${Date.now()}_${iconFile.name}`);
      await uploadBytes(iconRef, iconFile);
      const iconUrl = await getDownloadURL(iconRef);
      return iconUrl;
    } catch (error) {
      console.error('Error uploading icon:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setUploading(true);
      
      // Upload icon if new file selected
      const iconUrl = await uploadIcon();
      
      const categoryData = {
        ...formData,
        icon: iconUrl,
        displayOrder: parseInt(formData.displayOrder) || 0,
        updatedAt: serverTimestamp()
      };

      if (editingCategory) {
        // Update existing category
        const categoryRef = doc(db, 'categories', editingCategory.id);
        await updateDoc(categoryRef, categoryData);
        alert('Category updated successfully!');
      } else {
        // Create new category
        categoryData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'categories'), categoryData);
        alert('Category created successfully!');
      }

      // Reset form and close modal
      resetForm();
      setShowModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      description: category.description || '',
      displayOrder: category.displayOrder || 0,
      isActive: category.isActive !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      alert('Category deleted successfully!');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '',
      description: '',
      displayOrder: 0,
      isActive: true
    });
    setIconFile(null);
    setEditingCategory(null);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  return (
    <div className="category-management">
      <div className="category-header">
        <h2>Category Management</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Add Category
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading categories...</div>
      ) : (
        <div className="categories-grid">
          {categories.map(category => (
            <div key={category.id} className={`category-card ${!category.isActive ? 'inactive' : ''}`}>
              <div className="category-icon">
                {category.icon ? (
                  <img src={category.icon} alt={category.name} />
                ) : (
                  <div className="icon-placeholder">📁</div>
                )}
              </div>
              <div className="category-info">
                <h3>{category.name}</h3>
                {category.description && <p>{category.description}</p>}
                <div className="category-meta">
                  <span className="order-badge">Order: {category.displayOrder}</span>
                  <span className={`status-badge ${category.isActive ? 'active' : 'inactive'}`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="category-actions">
                <button className="btn-edit" onClick={() => handleEdit(category)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(category.id)}>Delete</button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="empty-state">
              <p>No categories yet. Click "Add Category" to create your first one!</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="category-form">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Restaurant, Grocery"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of this category"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Category Icon</label>
                {formData.icon && !iconFile && (
                  <div className="current-icon">
                    <img src={formData.icon} alt="Current icon" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIconChange}
                />
                <small>Upload a new icon image (PNG, JPG, SVG recommended)</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Display Order</label>
                  <input
                    type="number"
                    name="displayOrder"
                    value={formData.displayOrder}
                    onChange={handleInputChange}
                    min="0"
                  />
                  <small>Lower numbers appear first</small>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={uploading}>
                  {uploading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;