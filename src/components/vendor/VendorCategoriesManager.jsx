/**
 * Vendor Categories Manager
 * CRUD interface for managing vendor categories with drag-and-drop reordering
 */

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  fetchVendorCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  reorderCategories 
} from '../../services/vendorCategoryService';
import { getProductsByCategory } from '../../services/firestoreV2';
import CategoryAddonManager from './CategoryAddonManager';
import toast from 'react-hot-toast';
import './VendorCategoriesManager.css';

export default function VendorCategoriesManager({ vendorId = null }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [reassignTarget, setReassignTarget] = useState('');
  const [productsCount, setProductsCount] = useState({});
  const [selectedCategoryForAddons, setSelectedCategoryForAddons] = useState(null);
  
  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('');
  const [inheritAddons, setInheritAddons] = useState('all');

  useEffect(() => {
    loadCategories();
  }, [vendorId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchVendorCategories(vendorId);
      setCategories(data);
      
      // Load product counts for each category
      const counts = {};
      for (const cat of data) {
        const products = await getProductsByCategory(vendorId, cat.id);
        counts[cat.id] = products?.length || 0;
      }
      setProductsCount(counts);
    } catch (error) {
      toast.error('Failed to load categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      await createCategory(vendorId, {
        name: categoryName,
        slug: categorySlug || categoryName.toLowerCase().replace(/\s+/g, '-'),
        iconUrl: categoryIcon || null,
        inheritAddons: inheritAddons // NEW: Add-on inheritance setting
      });
      
      toast.success('Category created successfully');
      setCategoryName('');
      setCategorySlug('');
      setCategoryIcon('');
      setInheritAddons('all');
      setShowCreateModal(false);
      loadCategories();
    } catch (error) {
      toast.error('Failed to create category');
      console.error(error);
    }
  };

  const handleUpdateCategory = async (categoryId, updates) => {
    try {
      await updateCategory(vendorId, categoryId, updates);
      toast.success('Category updated');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      toast.error('Failed to update category');
      console.error(error);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      const productCount = productsCount[deletingCategory.id] || 0;
      
      if (productCount > 0 && !reassignTarget) {
        toast.error('Please select where to move the products');
        return;
      }

      await deleteCategory(
        vendorId, 
        deletingCategory.id, 
        reassignTarget === 'uncategorized' ? null : reassignTarget
      );
      
      toast.success('Category deleted');
      setDeletingCategory(null);
      setReassignTarget('');
      loadCategories();
    } catch (error) {
      toast.error('Failed to delete category');
      console.error(error);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCategories(items);

    try {
      const categoryIds = items.map(cat => cat.id);
      await reorderCategories(vendorId, categoryIds);
      toast.success('Categories reordered');
    } catch (error) {
      toast.error('Failed to reorder categories');
      loadCategories(); // Reload on error
    }
  };

  if (loading) {
    return (
      <div className="categories-loading">
        <div className="spinner"></div>
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="vendor-categories-manager">
      <div className="categories-header">
        <h2>Product Categories</h2>
        <button 
          className="btn-create-category"
          onClick={() => setShowCreateModal(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="categories-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M3 7h18M3 12h18M3 17h18" stroke="#ccc" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h3>No categories yet</h3>
          <p>Create categories to organize your products</p>
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First Category
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <div
                className="categories-list"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {categories.map((category, index) => (
                  <Draggable 
                    key={category.id} 
                    draggableId={category.id} 
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`category-card ${snapshot.isDragging ? 'dragging' : ''}`}
                      >
                        <div className="category-drag-handle" {...provided.dragHandleProps}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="9" cy="5" r="1" fill="currentColor"/>
                            <circle cx="9" cy="12" r="1" fill="currentColor"/>
                            <circle cx="9" cy="19" r="1" fill="currentColor"/>
                            <circle cx="15" cy="5" r="1" fill="currentColor"/>
                            <circle cx="15" cy="12" r="1" fill="currentColor"/>
                            <circle cx="15" cy="19" r="1" fill="currentColor"/>
                          </svg>
                        </div>

                        {editingCategory?.id === category.id ? (
                          <div className="category-edit-form">
                            <input
                              type="text"
                              value={editingCategory.name}
                              onChange={(e) => setEditingCategory({
                                ...editingCategory,
                                name: e.target.value
                              })}
                              placeholder="Category name"
                              autoFocus
                            />
                            <div className="category-edit-actions">
                              <button
                                className="btn-save"
                                onClick={() => handleUpdateCategory(category.id, {
                                  name: editingCategory.name
                                })}
                              >
                                Save
                              </button>
                              <button
                                className="btn-cancel"
                                onClick={() => setEditingCategory(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="category-info">
                              {category.iconUrl && (
                                <img 
                                  src={category.iconUrl} 
                                  alt={category.name}
                                  className="category-icon"
                                />
                              )}
                              <div>
                                <h3>{category.name}</h3>
                                <span className="category-count">
                                  {productsCount[category.id] || 0} products
                                </span>
                              </div>
                            </div>

                            <div className="category-actions">
                              <button
                                className="btn-icon btn-addons"
                                onClick={() => setSelectedCategoryForAddons(category)}
                                title="Manage Add-ons"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => setEditingCategory(category)}
                                title="Edit"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => setDeletingCategory(category)}
                                title="Delete"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Category</h2>
              <button 
                className="btn-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="category-form">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Main Dishes, Sides, Drinks"
                  required
                />
              </div>

              <div className="form-group">
                <label>Slug (optional)</label>
                <input
                  type="text"
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  placeholder="e.g. main-dishes"
                />
                <small>Leave empty to auto-generate from name</small>
              </div>

              <div className="form-group">
                <label>Icon URL (optional)</label>
                <input
                  type="url"
                  value={categoryIcon}
                  onChange={(e) => setCategoryIcon(e.target.value)}
                  placeholder="https://example.com/icon.png"
                />
              </div>

              <div className="form-group">
                <label>Add-on Inheritance</label>
                <select
                  value={inheritAddons}
                  onChange={(e) => setInheritAddons(e.target.value)}
                  className="form-select"
                >
                  <option value="all">All Products Inherit Category Add-ons</option>
                  <option value="product-only">Product-Specific Add-ons Only</option>
                </select>
                <small>
                  {inheritAddons === 'all' 
                    ? '✓ Products will show both category and product add-ons' 
                    : '✗ Products will only show their own add-ons'}
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="modal-overlay" onClick={() => setDeletingCategory(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Category</h2>
              <button 
                className="btn-close"
                onClick={() => setDeletingCategory(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to delete <strong>{deletingCategory.name}</strong>?
              </p>

              {productsCount[deletingCategory.id] > 0 && (
                <div className="warning-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="9" x2="12" y2="13" stroke="#ff9800" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="17" x2="12.01" y2="17" stroke="#ff9800" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <p>
                    This category contains {productsCount[deletingCategory.id]} product(s).
                    Where should these products be moved?
                  </p>
                </div>
              )}

              {productsCount[deletingCategory.id] > 0 && (
                <div className="form-group">
                  <label>Move products to:</label>
                  <select
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    required
                  >
                    <option value="">Select a category...</option>
                    <option value="uncategorized">Uncategorized</option>
                    {categories
                      .filter(cat => cat.id !== deletingCategory.id)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setDeletingCategory(null);
                  setReassignTarget('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={handleDeleteCategory}
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Add-ons Manager Modal */}
      {selectedCategoryForAddons && (
        <div className="modal-overlay" onClick={() => setSelectedCategoryForAddons(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Add-ons for "{selectedCategoryForAddons.name}"</h2>
              <button 
                className="btn-close"
                onClick={() => setSelectedCategoryForAddons(null)}
              >
                ×
              </button>
            </div>

            <CategoryAddonManager 
              vendorId={vendorId}
              categoryId={selectedCategoryForAddons.id}
              categoryName={selectedCategoryForAddons.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}
