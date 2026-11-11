import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { uploadImageToHostinger } from '../services/hostingerImageUpload';
import Swal from 'sweetalert2';

// GO7 Notification System
import {
  showGo7Success,
  showGo7Error,
  showGo7Warning,
  showGo7Toast
} from '../utils/go7Notifications';

const VendorProducts = () => {
  // Auth & Navigation
  const { currentUser } = useAuthContext();
  const vendorId = currentUser?.uid || 'guest';
  
  // State Management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({});
  
  // Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    category: '',
    available: true,
    featured: false,
    stockQuantity: 1,
    options: []
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newCategory, setNewCategory] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Refs
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  
  // Product Options
  const [newOption, setNewOption] = useState({ name: '', values: [], priceAdjustment: 0 });
  const [newOptionValue, setNewOptionValue] = useState('');
  
  // Fetch Products & Categories
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [vendorId]);
  
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'vendors', vendorId, 'products'),
        where('active', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const productList = [];
      
      querySnapshot.forEach((doc) => {
        productList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setProducts(productList);
    } catch (error) {
      console.error('Error fetching products:', error);
      showGo7Error('Failed to load products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchCategories = async () => {
    try {
      const q = query(
        collection(db, 'categories'),
        where('vendorId', '==', vendorId)
      );
      
      const querySnapshot = await getDocs(q);
      const categoryList = [];
      
      querySnapshot.forEach((doc) => {
        categoryList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setCategories(categoryList);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  // Image Handling
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      showGo7Warning('Please select a JPEG, PNG, or WebP image.');
      return;
    }
    
    if (file.size > maxSize) {
      showGo7Warning('Image must be smaller than 5MB.');
      return;
    }
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  const uploadImage = async (file) => {
    if (!file) return null;

    setUploadProgress(10);
    try {
      const safeName = String(file.name || 'product.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      const url = await uploadImageToHostinger(
        file,
        `vendors/${vendorId}/products/${Date.now()}-${safeName}`
      );
      setUploadProgress(100);
      return url;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      throw error;
    }
  };
  
  // Product Management Functions
  const addProduct = async (e) => {
    e.preventDefault();
    
    try {
      // Input validation
      if (!newProduct.name || !newProduct.price || !newProduct.category) {
        showGo7Warning('Please fill all required fields (name, price, category)');
        return;
      }
      
      const price = parseFloat(newProduct.price);
      const salePrice = newProduct.salePrice ? parseFloat(newProduct.salePrice) : null;
      
      if (isNaN(price) || price <= 0) {
        showGo7Warning('Please enter a valid price');
        return;
      }
      
      if (salePrice && (isNaN(salePrice) || salePrice <= 0 || salePrice >= price)) {
        showGo7Warning('Sale price must be lower than regular price');
        return;
      }
      
      // Start loading state
      setLoadingStates(prev => ({ ...prev, addProduct: true }));
      
      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      
      // Create product document
      const productData = {
        ...newProduct,
        price,
        salePrice: salePrice || null,
        imageUrl,
        vendorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        stockQuantity: parseInt(newProduct.stockQuantity) || 0
      };
      
      await addDoc(collection(db, 'vendors', vendorId, 'products'), productData);
      
      // Reset form
      setNewProduct({
        name: '',
        description: '',
        price: '',
        salePrice: '',
        category: '',
        available: true,
        featured: false,
        stockQuantity: 1,
        options: []
      });
      setImageFile(null);
      setImagePreview('');
      setUploadProgress(0);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh products
      fetchProducts();
      
      showGo7Success('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      showGo7Error('Failed to add product. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, addProduct: false }));
    }
  };
  
  const toggleProductAvailability = async (productId, currentStatus) => {
    try {
      setLoadingStates(prev => ({ ...prev, [productId]: true }));
      
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        available: !currentStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setProducts(products.map(product => 
        product.id === productId 
          ? { ...product, available: !currentStatus } 
          : product
      ));
      
      showGo7Toast(`Product ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling availability:', error);
      showGo7Error('Failed to update product status');
    } finally {
      setLoadingStates(prev => ({ ...prev, [productId]: false }));
    }
  };
  
  const deleteProduct = async (productId) => {
    // Confirmation dialog
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This product will be permanently deleted!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });
    
    if (result.isConfirmed) {
      try {
        setLoadingStates(prev => ({ ...prev, [`delete_${productId}`]: true }));
        
        await deleteDoc(doc(db, 'products', productId));
        
        // Update local state
        setProducts(products.filter(product => product.id !== productId));
        
        showGo7Success('Product deleted successfully');
      } catch (error) {
        console.error('Error deleting product:', error);
        showGo7Error('Failed to delete product');
      } finally {
        setLoadingStates(prev => ({ ...prev, [`delete_${productId}`]: false }));
      }
    }
  };
  
  // Category Management
  const addCategory = async () => {
    if (!newCategory.trim()) {
      showGo7Warning('Please enter a category name');
      return;
    }
    
    try {
      setLoadingStates(prev => ({ ...prev, addCategory: true }));
      
      const categoryData = {
        name: newCategory.trim(),
        vendorId,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'categories'), categoryData);
      
      // Refresh categories
      fetchCategories();
      setNewCategory('');
      
      showGo7Toast('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      showGo7Error('Failed to add category');
    } finally {
      setLoadingStates(prev => ({ ...prev, addCategory: false }));
    }
  };
  
  // Product Options Management
  const addOptionValue = () => {
    if (!newOptionValue.trim()) return;
    
    setNewOption(prev => ({
      ...prev,
      values: [...prev.values, newOptionValue.trim()]
    }));
    
    setNewOptionValue('');
  };
  
  const removeOptionValue = (index) => {
    setNewOption(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index)
    }));
  };
  
  const addOptionToProduct = () => {
    if (!newOption.name || newOption.values.length === 0) {
      showGo7Warning('Please add a name and at least one value for the option');
      return;
    }
    
    setNewProduct(prev => ({
      ...prev,
      options: [...prev.options, { ...newOption }]
    }));
    
    setNewOption({ name: '', values: [], priceAdjustment: 0 });
  };
  
  const removeOption = (index) => {
    setNewProduct(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };
  
  // Filtered Products
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => product.category === selectedCategory);
  
  return (
    <div className="vendor-products-container">
      <div className="page-header">
        <h1>Product Management</h1>
        <p>Add and manage your products for customers to order</p>
      </div>
      
      {/* Product Form Section */}
      <div className="product-form-section">
        <h2>Add New Product</h2>
        
        <form ref={formRef} onSubmit={addProduct} className="product-form">
          <div className="form-grid">
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="productName">Product Name *</label>
                <input
                  id="productName"
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  placeholder="Enter product name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="productDescription">Description</label>
                <textarea
                  id="productDescription"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
              
              <div className="price-row">
                <div className="form-group">
                  <label htmlFor="productPrice">Price *</label>
                  <input
                    id="productPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="productSalePrice">Sale Price</label>
                  <input
                    id="productSalePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProduct.salePrice}
                    onChange={(e) => setNewProduct({...newProduct, salePrice: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="productCategory">Category *</label>
                  <select
                    id="productCategory"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="add-category-inline">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category"
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    disabled={loadingStates.addCategory}
                    className="add-category-btn"
                  >
                    {loadingStates.addCategory ? 'Adding...' : '+ Add'}
                  </button>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="productQuantity">Stock Quantity</label>
                  <input
                    id="productQuantity"
                    type="number"
                    min="0"
                    step="1"
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({...newProduct, stockQuantity: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-switches">
                <div className="form-switch">
                  <label>
                    <input
                      type="checkbox"
                      checked={newProduct.available}
                      onChange={(e) => setNewProduct({...newProduct, available: e.target.checked})}
                    />
                    <span>Available for Order</span>
                  </label>
                </div>
                
                <div className="form-switch">
                  <label>
                    <input
                      type="checkbox"
                      checked={newProduct.featured}
                      onChange={(e) => setNewProduct({...newProduct, featured: e.target.checked})}
                    />
                    <span>Featured Product</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="form-col">
              <div className="image-upload-section">
                <label>Product Image</label>
                <div 
                  className="image-upload-area" 
                  onClick={() => fileInputRef.current.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Product preview" className="image-preview" />
                  ) : (
                    <div className="upload-placeholder">
                      <i className="upload-icon">📷</i>
                      <span>Click to upload image</span>
                      <small>JPEG, PNG or WebP (max 5MB)</small>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="upload-progress">
                    <div 
                      className="upload-progress-bar" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
              
              <div className="product-options-section">
                <h3>Product Options</h3>
                <div className="option-form">
                  <div className="option-row">
                    <input
                      type="text"
                      placeholder="Option name (e.g. Size)"
                      value={newOption.name}
                      onChange={(e) => setNewOption({...newOption, name: e.target.value})}
                    />
                    <input
                      type="number"
                      placeholder="Price adjustment"
                      value={newOption.priceAdjustment}
                      onChange={(e) => setNewOption({...newOption, priceAdjustment: parseFloat(e.target.value) || 0})}
                      step="0.01"
                    />
                  </div>
                  
                  <div className="option-values">
                    <div className="option-value-input">
                      <input
                        type="text"
                        placeholder="Add option value (e.g. Small)"
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOptionValue())}
                      />
                      <button 
                        type="button" 
                        onClick={addOptionValue}
                        className="add-value-btn"
                      >
                        Add
                      </button>
                    </div>
                    
                    {newOption.values.length > 0 && (
                      <div className="option-value-tags">
                        {newOption.values.map((value, idx) => (
                          <span key={idx} className="option-tag">
                            {value}
                            <button
                              type="button"
                              onClick={() => removeOptionValue(idx)}
                              className="remove-tag"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={addOptionToProduct}
                    className="add-option-btn"
                    disabled={!newOption.name || newOption.values.length === 0}
                  >
                    Add Option to Product
                  </button>
                </div>
                
                {/* Display selected options */}
                {newProduct.options.length > 0 && (
                  <div className="selected-options">
                    <h4>Selected Options</h4>
                    {newProduct.options.map((option, idx) => (
                      <div key={idx} className="selected-option-item">
                        <div className="option-header">
                          <span className="option-name">{option.name}</span>
                          {option.priceAdjustment > 0 && (
                            <span className="price-adj">+${option.priceAdjustment}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="remove-option"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="option-values">
                          {option.values.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              disabled={loadingStates.addProduct}
              className="add-product-btn"
            >
              {loadingStates.addProduct ? 'Adding Product...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Product List Section */}
      <div className="product-list-section">
        <div className="list-header">
          <h2>Your Products</h2>
          
          <div className="filter-controls">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="loading-spinner">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>No products found. Add your first product above!</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className={`product-card ${!product.available ? 'inactive' : ''}`}>
                <div className="product-image">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                  {product.salePrice && (
                    <div className="sale-badge">Sale</div>
                  )}
                  {product.featured && (
                    <div className="featured-badge">Featured</div>
                  )}
                </div>
                
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <div className="product-meta">
                    <span className="category">{product.category}</span>
                    <span className="stock">
                      Stock: {product.stockQuantity || 'Unlimited'}
                    </span>
                  </div>
                  {product.description && (
                    <p className="description">{product.description}</p>
                  )}
                  
                  <div className="price-display">
                    {product.salePrice ? (
                      <>
                        <span className="original-price">${product.price}</span>
                        <span className="sale-price">${product.salePrice}</span>
                      </>
                    ) : (
                      <span className="regular-price">${product.price}</span>
                    )}
                  </div>
                  
                  {product.options && product.options.length > 0 && (
                    <div className="product-options-display">
                      <strong>Options:</strong>
                      {product.options.map((option, idx) => (
                        <div key={idx} className="option-summary">
                          {option.name}: {option.values.join(', ')}
                          {option.priceAdjustment > 0 && ` (+$${option.priceAdjustment})`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="product-actions">
                  <button 
                    className={`availability-toggle ${product.available ? 'active' : 'inactive'}`}
                    onClick={() => toggleProductAvailability(product.id, product.available)}
                    disabled={loadingStates[product.id]}
                  >
                    {loadingStates[product.id] ? 'Updating...' : product.available ? 'Active' : 'Inactive'}
                  </button>
                  
                  <button
                    className="delete-product"
                    onClick={() => deleteProduct(product.id)}
                    disabled={loadingStates[`delete_${product.id}`]}
                  >
                    {loadingStates[`delete_${product.id}`] ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* CSS Styles */}
      <style jsx>{`
        .vendor-products-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .page-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .page-header h1 {
          font-size: 24px;
          margin-bottom: 5px;
          color: #333;
        }
        
        .page-header p {
          color: #666;
        }
        
        .product-form-section {
          background-color: #fff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .product-form-section h2 {
          font-size: 20px;
          margin-bottom: 20px;
          color: #333;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #555;
        }
        
        input, textarea, select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        textarea {
          min-height: 80px;
        }
        
        .price-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .add-category-inline {
          display: flex;
          gap: 10px;
        }
        
        .add-category-btn {
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0 15px;
          cursor: pointer;
          font-weight: 500;
          flex-shrink: 0;
        }
        
        .add-category-btn:disabled {
          background: #ccc;
        }
        
        .form-switches {
          margin-top: 15px;
        }
        
        .form-switch {
          margin-bottom: 10px;
        }
        
        .form-switch label {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .form-switch input {
          width: auto;
          margin-right: 10px;
        }
        
        .image-upload-section {
          margin-bottom: 20px;
        }
        
        .image-upload-area {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          background: #fafafa;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .image-upload-area:hover {
          border-color: #aaa;
        }
        
        .upload-icon {
          font-size: 40px;
          margin-bottom: 10px;
          color: #888;
        }
        
        .image-preview {
          max-width: 100%;
          max-height: 200px;
          border-radius: 4px;
        }
        
        .upload-progress {
          margin-top: 10px;
          height: 4px;
          background: #eee;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .upload-progress-bar {
          height: 100%;
          background: #4caf50;
          transition: width 0.3s ease;
        }
        
        .product-options-section {
          margin-top: 20px;
        }
        
        .product-options-section h3 {
          font-size: 16px;
          margin-bottom: 10px;
        }
        
        .option-form {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        
        .option-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .option-values {
          margin-bottom: 10px;
        }
        
        .option-value-input {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .add-value-btn {
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0 15px;
          cursor: pointer;
          font-weight: 500;
          flex-shrink: 0;
        }
        
        .option-value-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        
        .option-tag {
          background: #e1f5fe;
          color: #0277bd;
          border-radius: 16px;
          padding: 4px 10px;
          font-size: 12px;
          display: flex;
          align-items: center;
        }
        
        .remove-tag {
          background: none;
          border: none;
          color: #0277bd;
          margin-left: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .add-option-btn {
          background: #673ab7;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 15px;
          cursor: pointer;
          font-weight: 500;
          width: 100%;
        }
        
        .add-option-btn:disabled {
          background: #ccc;
        }
        
        .selected-options {
          margin-top: 15px;
        }
        
        .selected-options h4 {
          font-size: 14px;
          margin-bottom: 10px;
        }
        
        .selected-option-item {
          background: #f0f0f0;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        
        .option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }
        
        .option-name {
          font-weight: 500;
        }
        
        .price-adj {
          color: #e91e63;
          font-size: 13px;
        }
        
        .remove-option {
          background: none;
          border: none;
          color: #f44336;
          cursor: pointer;
          font-size: 12px;
          text-decoration: underline;
          padding: 0;
        }
        
        .form-actions {
          margin-top: 30px;
          text-align: center;
        }
        
        .add-product-btn {
          background: #f57c00;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 12px 30px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.3s;
        }
        
        .add-product-btn:hover {
          background: #ef6c00;
        }
        
        .add-product-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .product-list-section {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .list-header h2 {
          font-size: 20px;
          color: #333;
        }
        
        .filter-controls select {
          width: auto;
          min-width: 200px;
        }
        
        .loading-spinner {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        
        .no-products {
          text-align: center;
          padding: 40px;
          color: #666;
          background: #f9f9f9;
          border-radius: 8px;
        }
        
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        
        .product-card {
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          position: relative;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        
        .product-card.inactive {
          opacity: 0.6;
        }
        
        .product-image {
          height: 180px;
          position: relative;
          background: #f0f0f0;
        }
        
        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .no-image {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #999;
        }
        
        .sale-badge,
        .featured-badge {
          position: absolute;
          top: 10px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .sale-badge {
          background: #f44336;
          color: white;
          left: 10px;
        }
        
        .featured-badge {
          background: #ffc107;
          color: #333;
          right: 10px;
        }
        
        .product-info {
          padding: 15px;
        }
        
        .product-info h3 {
          font-size: 16px;
          margin-bottom: 5px;
          color: #333;
          line-height: 1.3;
        }
        
        .product-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        
        .category {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 2px 6px;
          border-radius: 3px;
        }
        
        .description {
          font-size: 13px;
          color: #666;
          margin-bottom: 10px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .price-display {
          margin-bottom: 10px;
        }
        
        .regular-price {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }
        
        .original-price {
          font-size: 14px;
          text-decoration: line-through;
          color: #999;
          margin-right: 8px;
        }
        
        .sale-price {
          font-size: 18px;
          font-weight: 600;
          color: #e53935;
        }
        
        .product-options-display {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
        }
        
        .option-summary {
          margin-top: 3px;
        }
        
        .product-actions {
          display: flex;
          padding: 10px 15px;
          border-top: 1px solid #eee;
          gap: 10px;
        }
        
        .availability-toggle, 
        .delete-product {
          flex: 1;
          padding: 8px 0;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          font-size: 13px;
        }
        
        .availability-toggle {
          background: #eee;
          color: #333;
        }
        
        .availability-toggle.active {
          background: #4caf50;
          color: white;
        }
        
        .availability-toggle.inactive {
          background: #ffeb3b;
          color: #333;
        }
        
        .delete-product {
          background: #f44336;
          color: white;
        }
        
        .availability-toggle:disabled,
        .delete-product:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .product-card {
            max-width: 100%;
          }
          
          .list-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .filter-controls {
            width: 100%;
          }
          
          .filter-controls select {
            width: 100%;
          }
          
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }
          
          .form-actions {
            padding: 0 10px;
          }
          
          .add-product-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default VendorProducts;