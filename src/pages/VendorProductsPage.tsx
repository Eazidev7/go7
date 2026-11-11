import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VendorProductService, ProductData, AddonData } from '../services/vendorProductService';
import { Plus, Edit2, Trash2, Image as ImageIcon, DollarSign } from 'lucide-react';
import './VendorProductsPage.css';

// ====================================================================
// 🛍️ VENDOR PRODUCTS PAGE - Premium UI with real-time sync
// ====================================================================

interface VendorProductsPageProps {
  vendorId?: string; // Optional prop, fallback to route param
}

export const VendorProductsPage: React.FC<VendorProductsPageProps> = ({ vendorId: propVendorId }) => {
  const { vendorId: paramVendorId } = useParams<{ vendorId: string }>();
  const vendorId = propVendorId || paramVendorId || '';
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProductData[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [addons, setAddons] = useState<AddonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [editingAddon, setEditingAddon] = useState<AddonData | null>(null);

  // ====================================================================
  // Real-time listeners
  // ====================================================================

  useEffect(() => {
    if (!vendorId) {
      setError('Vendor ID is required');
      setLoading(false);
      return;
    }

    // Subscribe to products
    const unsubscribeProducts = VendorProductService.subscribeToVendorProducts(
      vendorId,
      (updatedProducts) => {
        setProducts(updatedProducts);
        setLoading(false);
        console.log(`✅ Products updated: ${updatedProducts.length} items`);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeProducts();
    };
  }, [vendorId]);

  // Subscribe to addons when product is selected
  useEffect(() => {
    if (!selectedProduct || !vendorId) {
      setAddons([]);
      return;
    }

    const unsubscribeAddons = VendorProductService.subscribeToProductAddons(
      vendorId,
      selectedProduct.id!,
      (updatedAddons) => {
        setAddons(updatedAddons);
        console.log(`✅ Addons updated: ${updatedAddons.length} items`);
      },
      (err) => {
        console.error('❌ Addon subscription error:', err);
      }
    );

    return () => {
      unsubscribeAddons();
    };
  }, [selectedProduct, vendorId]);

  // ====================================================================
  // Product handlers
  // ====================================================================

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product: ProductData) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This will also delete all addons.')) {
      return;
    }

    try {
      await VendorProductService.deleteProduct(vendorId, productId);
      if (selectedProduct?.id === productId) {
        setSelectedProduct(null);
      }
    } catch (err) {
      alert('Failed to delete product: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleSelectProduct = (product: ProductData) => {
    setSelectedProduct(product);
  };

  // ====================================================================
  // Addon handlers
  // ====================================================================

  const handleCreateAddon = () => {
    if (!selectedProduct) {
      alert('Please select a product first');
      return;
    }
    setEditingAddon(null);
    setShowAddonModal(true);
  };

  const handleEditAddon = (addon: AddonData) => {
    setEditingAddon(addon);
    setShowAddonModal(true);
  };

  const handleDeleteAddon = async (addonId: string) => {
    if (!selectedProduct || !confirm('Are you sure you want to delete this addon?')) {
      return;
    }

    try {
      await VendorProductService.deleteAddon(vendorId, selectedProduct.id!, addonId);
    } catch (err) {
      alert('Failed to delete addon: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // ====================================================================
  // Render
  // ====================================================================

  if (loading) {
    return (
      <div className="vendor-products-loading">
        <div className="loading-spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vendor-products-error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="vendor-products-page">
      {/* Header */}
      <div className="vendor-products-header">
        <div className="header-content">
          <h1>Products & Addons</h1>
          <p className="subtitle">{products.length} products</p>
        </div>
        <button className="btn-primary" onClick={handleCreateProduct}>
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Main Content - Split Layout */}
      <div className="vendor-products-content">
        
        {/* Left: Product List */}
        <div className="products-list-section">
          <div className="section-header">
            <h2>Products</h2>
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              <ImageIcon size={48} />
              <p>No products yet</p>
              <button className="btn-secondary" onClick={handleCreateProduct}>
                Create Your First Product
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProduct?.id === product.id}
                  onSelect={() => handleSelectProduct(product)}
                  onEdit={() => handleEditProduct(product)}
                  onDelete={() => handleDeleteProduct(product.id!)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details & Addons */}
        <div className="product-details-section">
          {selectedProduct ? (
            <>
              {/* Product Details */}
              <div className="product-details-card">
                <div className="product-detail-header">
                  <h2>{selectedProduct.name}</h2>
                  <div className="detail-actions">
                    <button className="btn-icon" onClick={() => handleEditProduct(selectedProduct)}>
                      <Edit2 size={18} />
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDeleteProduct(selectedProduct.id!)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {selectedProduct.imageUrl && (
                  <div className="product-detail-image">
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} />
                  </div>
                )}

                <div className="product-detail-info">
                  <div className="info-row">
                    <span className="label">Price:</span>
                    <span className="value price">
                      {VendorProductService.formatPrice(selectedProduct.price, selectedProduct.currency)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Description:</span>
                    <span className="value">{selectedProduct.description}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Measurement:</span>
                    <span className="value">{selectedProduct.measurementType}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Quantity Range:</span>
                    <span className="value">{selectedProduct.minQty} - {selectedProduct.maxQty}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className={`badge ${selectedProduct.available ? 'badge-success' : 'badge-danger'}`}>
                      {selectedProduct.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Addons Section */}
              <div className="addons-section">
                <div className="addons-header">
                  <h3>Add-ons ({addons.length})</h3>
                  <button className="btn-secondary" onClick={handleCreateAddon}>
                    <Plus size={18} />
                    Add Addon
                  </button>
                </div>

                {addons.length === 0 ? (
                  <div className="empty-state-small">
                    <p>No add-ons yet</p>
                  </div>
                ) : (
                  <div className="addons-list">
                    {addons.map((addon) => (
                      <AddonCard
                        key={addon.id}
                        addon={addon}
                        onEdit={() => handleEditAddon(addon)}
                        onDelete={() => handleDeleteAddon(addon.id!)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <ImageIcon size={64} />
              <p>Select a product to view details and manage add-ons</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          vendorId={vendorId}
          product={editingProduct}
          onClose={() => setShowProductModal(false)}
          onSuccess={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {showAddonModal && selectedProduct && (
        <AddonModal
          vendorId={vendorId}
          productId={selectedProduct.id!}
          addon={editingAddon}
          onClose={() => setShowAddonModal(false)}
          onSuccess={() => {
            setShowAddonModal(false);
            setEditingAddon(null);
          }}
        />
      )}
    </div>
  );
};

// ====================================================================
// PRODUCT CARD COMPONENT
// ====================================================================

interface ProductCardProps {
  product: ProductData;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isSelected, onSelect, onEdit, onDelete }) => {
  return (
    <div className={`product-card ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="product-card-image">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} />
        ) : (
          <div className="placeholder-image">
            <ImageIcon size={32} />
          </div>
        )}
      </div>

      <div className="product-card-content">
        <h3 className="product-card-title">{product.name}</h3>
        <p className="product-card-price">
          {VendorProductService.formatPrice(product.price, product.currency)}
        </p>
        <p className="product-card-desc">{product.description}</p>

        <div className="product-card-footer">
          <span className={`badge ${product.available ? 'badge-success' : 'badge-danger'}`}>
            {product.available ? 'Available' : 'Unavailable'}
          </span>
          {product.addonCount && product.addonCount > 0 && (
            <span className="addon-count">{product.addonCount} add-ons</span>
          )}
        </div>
      </div>

      <div className="product-card-actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn-icon" onClick={onEdit} title="Edit">
          <Edit2 size={16} />
        </button>
        <button className="btn-icon btn-danger" onClick={onDelete} title="Delete">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ====================================================================
// ADDON CARD COMPONENT
// ====================================================================

interface AddonCardProps {
  addon: AddonData;
  onEdit: () => void;
  onDelete: () => void;
}

const AddonCard: React.FC<AddonCardProps> = ({ addon, onEdit, onDelete }) => {
  return (
    <div className="addon-card">
      <div className="addon-card-image">
        {addon.imageUrl ? (
          <img src={addon.imageUrl} alt={addon.name} />
        ) : (
          <div className="placeholder-image-small">
            <ImageIcon size={20} />
          </div>
        )}
      </div>

      <div className="addon-card-content">
        <h4>{addon.name}</h4>
        <p className="addon-price">+₦{addon.price.toFixed(2)}</p>
        <p className="addon-limit">Limit: {addon.qtyLimit}</p>
      </div>

      <div className="addon-card-actions">
        <button className="btn-icon" onClick={onEdit}>
          <Edit2 size={14} />
        </button>
        <button className="btn-icon btn-danger" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ====================================================================
// PRODUCT MODAL (Create/Edit)
// ====================================================================

interface ProductModalProps {
  vendorId: string;
  product: ProductData | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ vendorId, product, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<ProductData>>({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    currency: product?.currency || 'NGN',
    measurementType: product?.measurementType || 'portion',
    minQty: product?.minQty || 1,
    maxQty: product?.maxQty || 100,
    available: product?.available ?? true,
    category: product?.category || 'Food'
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate price is numeric
      const price = parseFloat(String(formData.price));
      if (isNaN(price) || price < 0) {
        alert('Please enter a valid price');
        setSubmitting(false);
        return;
      }

      if (product) {
        // Update existing product
        await VendorProductService.updateProduct(
          vendorId,
          product.id!,
          { ...formData, price },
          imageFile || undefined
        );
      } else {
        // Create new product
        await VendorProductService.createProduct(
          vendorId,
          formData as Omit<ProductData, 'id' | 'createdAt' | 'updatedAt' | 'vendorId'>,
          imageFile || undefined
        );
      }

      onSuccess();
    } catch (err) {
      alert('Failed to save product: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Edit Product' : 'Create Product'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Jollof Rice"
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="Brief description of the product"
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
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>Measurement Type</label>
              <select
                value={formData.measurementType}
                onChange={(e) => setFormData({ ...formData, measurementType: e.target.value as any })}
              >
                <option value="portion">Portion</option>
                <option value="tuber">Tuber</option>
                <option value="unit">Unit</option>
                <option value="pack">Pack</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="L">Liter (L)</option>
                <option value="ml">Milliliter (ml)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Min Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.minQty}
                onChange={(e) => setFormData({ ...formData, minQty: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="form-group">
              <label>Max Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.maxQty}
                onChange={(e) => setFormData({ ...formData, maxQty: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Food, Drinks, Snacks"
            />
          </div>

          <div className="form-group">
            <label>Product Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
          </div>

          <div className="form-group-checkbox">
            <label>
              <input
                type="checkbox"
                checked={formData.available}
                onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
              />
              <span>Available for sale</span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ====================================================================
// ADDON MODAL (Create/Edit)
// ====================================================================

interface AddonModalProps {
  vendorId: string;
  productId: string;
  addon: AddonData | null;
  onClose: () => void;
  onSuccess: () => void;
}

const AddonModal: React.FC<AddonModalProps> = ({ vendorId, productId, addon, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<AddonData>>({
    name: addon?.name || '',
    price: addon?.price || 0,
    available: addon?.available ?? true,
    qtyLimit: addon?.qtyLimit || 10
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(addon?.imageUrl || '');
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const price = parseFloat(String(formData.price));
      if (isNaN(price) || price < 0) {
        alert('Please enter a valid price');
        setSubmitting(false);
        return;
      }

      if (addon) {
        await VendorProductService.updateAddon(
          vendorId,
          productId,
          addon.id!,
          { ...formData, price },
          imageFile || undefined
        );
      } else {
        await VendorProductService.createAddon(
          vendorId,
          productId,
          formData as Omit<AddonData, 'id' | 'createdAt' | 'updatedAt'>,
          imageFile || undefined
        );
      }

      onSuccess();
    } catch (err) {
      alert('Failed to save addon: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{addon ? 'Edit Add-on' : 'Create Add-on'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Add-on Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Extra Meat"
            />
          </div>

          <div className="form-group">
            <label>Price (₦) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label>Quantity Limit</label>
            <input
              type="number"
              min="1"
              value={formData.qtyLimit}
              onChange={(e) => setFormData({ ...formData, qtyLimit: parseInt(e.target.value) || 10 })}
            />
          </div>

          <div className="form-group">
            <label>Add-on Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="image-preview-small">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
          </div>

          <div className="form-group-checkbox">
            <label>
              <input
                type="checkbox"
                checked={formData.available}
                onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
              />
              <span>Available</span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : addon ? 'Update Add-on' : 'Create Add-on'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorProductsPage;
