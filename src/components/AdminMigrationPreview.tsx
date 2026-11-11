/**
 * Admin Migration Preview Dashboard
 * 
 * Lightweight dashboard to preview migrated V2 items before switching clients
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { Product } from '../types/product';
import { formatQuantity, MEASUREMENT_TYPES } from '../utils/measurementValidation';
import './AdminMigrationPreview.css';

export interface MigrationPreviewData {
  totalVendors: number;
  v2Vendors: number;
  totalProducts: number;
  v2Products: number;
  migrationProgress: number;
  sampleProducts: Product[];
  measurementTypeDistribution: Record<string, number>;
  recentlyMigrated: Product[];
}

export const AdminMigrationPreview: React.FC = () => {
  const [previewData, setPreviewData] = useState<MigrationPreviewData | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'v2' | 'v1'>('all');

  useEffect(() => {
    loadMigrationPreview();
  }, []);

  const loadMigrationPreview = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all vendors
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      const totalVendors = vendorsSnapshot.size;
      let v2Vendors = 0;
      let totalProducts = 0;
      let v2Products = 0;
      const measurementTypeDistribution: Record<string, number> = {};
      const sampleProducts: Product[] = [];
      const recentlyMigrated: Product[] = [];

      // Process each vendor
      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorId = vendorDoc.id;
        const vendorData = vendorDoc.data();
        
        // Check vendor's products
        const productsSnapshot = await getDocs(
          query(
            collection(db, `vendors/${vendorId}/products`),
            orderBy('updatedAt', 'desc'),
            limit(50)
          )
        );

        let vendorHasV2 = false;
        
        productsSnapshot.docs.forEach(productDoc => {
          const product = { id: productDoc.id, ...productDoc.data() } as Product;
          totalProducts++;

          if (product.measurementType) {
            // This is a V2 product
            v2Products++;
            vendorHasV2 = true;
            
            // Count measurement types
            measurementTypeDistribution[product.measurementType] = 
              (measurementTypeDistribution[product.measurementType] || 0) + 1;
            
            // Add to samples (limit to 20)
            if (sampleProducts.length < 20) {
              sampleProducts.push({
                ...product,
                vendorName: vendorData.businessName || vendorData.name || vendorId
              });
            }
            
            // Add recently migrated (within last 7 days)
            const updatedAt = product.updatedAt?.toDate ? product.updatedAt.toDate() : new Date(product.updatedAt);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            if (updatedAt > sevenDaysAgo && recentlyMigrated.length < 10) {
              recentlyMigrated.push({
                ...product,
                vendorName: vendorData.businessName || vendorData.name || vendorId
              });
            }
          }
        });

        if (vendorHasV2) {
          v2Vendors++;
        }
      }

      const migrationProgress = totalProducts > 0 ? Math.round((v2Products / totalProducts) * 100) : 0;

      setPreviewData({
        totalVendors,
        v2Vendors,
        totalProducts,
        v2Products,
        migrationProgress,
        sampleProducts,
        measurementTypeDistribution,
        recentlyMigrated
      });
    } catch (err) {
      console.error('Error loading migration preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load migration preview');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVendorProducts = async (vendorId: string) => {
    try {
      const productsSnapshot = await getDocs(
        query(
          collection(db, `vendors/${vendorId}/products`),
          orderBy('updatedAt', 'desc')
        )
      );

      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      setVendorProducts(products);
    } catch (err) {
      console.error('Error loading vendor products:', err);
    }
  };

  const filteredProducts = vendorProducts.filter(product => {
    if (filter === 'v2') return !!product.measurementType;
    if (filter === 'v1') return !product.measurementType;
    return true;
  });

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getMeasurementTypeInfo = (type: string) => {
    return MEASUREMENT_TYPES[type as keyof typeof MEASUREMENT_TYPES] || {
      label: type,
      description: 'Custom measurement type'
    };
  };

  if (isLoading) {
    return (
      <div className="admin-preview loading">
        <div className="loading-spinner">🔄</div>
        <p>Loading migration preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-preview error">
        <h3>❌ Error Loading Preview</h3>
        <p>{error}</p>
        <button onClick={loadMigrationPreview} className="retry-button">
          🔄 Retry
        </button>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="admin-preview empty">
        <p>No migration data available</p>
      </div>
    );
  }

  return (
    <div className="admin-migration-preview">
      <header className="preview-header">
        <h2>🔎 Migration Preview Dashboard</h2>
        <div className="header-actions">
          <button onClick={loadMigrationPreview} className="refresh-button">
            🔄 Refresh Data
          </button>
        </div>
      </header>

      {/* Migration Overview */}
      <div className="overview-section">
        <h3>📊 Migration Overview</h3>
        <div className="overview-grid">
          <div className="overview-card">
            <div className="card-header">
              <span className="card-icon">🏪</span>
              <h4>Vendors</h4>
            </div>
            <div className="card-content">
              <div className="metric-large">
                {previewData.v2Vendors} / {previewData.totalVendors}
              </div>
              <div className="metric-label">Migrated to V2</div>
              <div className="progress-bar small">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.round((previewData.v2Vendors / previewData.totalVendors) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-header">
              <span className="card-icon">📦</span>
              <h4>Products</h4>
            </div>
            <div className="card-content">
              <div className="metric-large">
                {previewData.v2Products} / {previewData.totalProducts}
              </div>
              <div className="metric-label">Migrated to V2</div>
              <div className="progress-bar small">
                <div 
                  className="progress-fill" 
                  style={{ width: `${previewData.migrationProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-header">
              <span className="card-icon">🎯</span>
              <h4>Progress</h4>
            </div>
            <div className="card-content">
              <div className="metric-large">{previewData.migrationProgress}%</div>
              <div className="metric-label">Migration Complete</div>
              <div className={`status-badge ${
                previewData.migrationProgress === 100 ? 'complete' :
                previewData.migrationProgress > 50 ? 'in-progress' : 'starting'
              }`}>
                {previewData.migrationProgress === 100 ? '✅ Complete' :
                 previewData.migrationProgress > 50 ? '🔄 In Progress' : '🚀 Starting'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Measurement Type Distribution */}
      <div className="measurement-section">
        <h3>⚖️ Measurement Type Distribution</h3>
        <div className="measurement-grid">
          {Object.entries(previewData.measurementTypeDistribution).map(([type, count]) => {
            const typeInfo = getMeasurementTypeInfo(type);
            return (
              <div key={type} className="measurement-card">
                <div className="measurement-header">
                  <h4>{typeInfo.label}</h4>
                  <span className="measurement-count">{count}</span>
                </div>
                <p className="measurement-description">{typeInfo.description}</p>
                <div className="measurement-examples">
                  {typeInfo.examples?.slice(0, 2).map((example, index) => (
                    <span key={index} className="example-tag">{example}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sample V2 Products */}
      <div className="samples-section">
        <h3>📦 Sample V2 Products</h3>
        <div className="products-grid">
          {previewData.sampleProducts.slice(0, 8).map((product) => (
            <div key={`${product.vendorId}-${product.id}`} className="product-card">
              <div className="product-header">
                <h4 className="product-name">{product.name}</h4>
                <span className="vendor-badge">{product.vendorName}</span>
              </div>
              
              <div className="product-details">
                <div className="price-section">
                  <span className="price">{formatPrice(product.basePrice)}</span>
                  <span className="measurement-type">
                    {getMeasurementTypeInfo(product.measurementType).label}
                  </span>
                </div>
                
                {product.unitLabel && (
                  <div className="unit-info">
                    Unit: {product.unitLabel}
                  </div>
                )}
                
                {product.addons && product.addons.length > 0 && (
                  <div className="addons-info">
                    🍽️ {product.addons.length} addon{product.addons.length !== 1 ? 's' : ''}
                  </div>
                )}
                
                <div className="quantity-range">
                  {product.minQty && product.maxQty ? (
                    <span>
                      {formatQuantity(product.minQty, product.measurementType, product.unitLabel)} - {formatQuantity(product.maxQty, product.measurementType, product.unitLabel)}
                    </span>
                  ) : product.minQty ? (
                    <span>Min: {formatQuantity(product.minQty, product.measurementType, product.unitLabel)}</span>
                  ) : product.maxQty ? (
                    <span>Max: {formatQuantity(product.maxQty, product.measurementType, product.unitLabel)}</span>
                  ) : (
                    <span>Any quantity</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Migrated */}
      {previewData.recentlyMigrated.length > 0 && (
        <div className="recent-section">
          <h3>🕰️ Recently Migrated (Last 7 Days)</h3>
          <div className="recent-list">
            {previewData.recentlyMigrated.map((product) => (
              <div key={`${product.vendorId}-${product.id}`} className="recent-item">
                <div className="recent-info">
                  <h4>{product.name}</h4>
                  <p>{product.vendorName} • {getMeasurementTypeInfo(product.measurementType).label}</p>
                </div>
                <div className="recent-meta">
                  <span className="recent-price">{formatPrice(product.basePrice)}</span>
                  <span className="recent-date">
                    {product.updatedAt?.toDate ? product.updatedAt.toDate().toLocaleDateString() : 'Recently'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Detail View */}
      <div className="vendor-section">
        <h3>🏪 Vendor Detail View</h3>
        <div className="vendor-controls">
          <select 
            value={selectedVendor} 
            onChange={(e) => {
              setSelectedVendor(e.target.value);
              if (e.target.value) {
                loadVendorProducts(e.target.value);
              }
            }}
            className="vendor-select"
          >
            <option value="">Select a vendor...</option>
            {/* This would be populated with actual vendor options */}
          </select>
          
          {selectedVendor && (
            <div className="filter-controls">
              <button 
                className={`filter-button ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({vendorProducts.length})
              </button>
              <button 
                className={`filter-button ${filter === 'v2' ? 'active' : ''}`}
                onClick={() => setFilter('v2')}
              >
                V2 ({vendorProducts.filter(p => p.measurementType).length})
              </button>
              <button 
                className={`filter-button ${filter === 'v1' ? 'active' : ''}`}
                onClick={() => setFilter('v1')}
              >
                V1 ({vendorProducts.filter(p => !p.measurementType).length})
              </button>
            </div>
          )}
        </div>

        {selectedVendor && filteredProducts.length > 0 && (
          <div className="vendor-products">
            <div className="products-table">
              <div className="table-header">
                <span>Product</span>
                <span>Type</span>
                <span>Price</span>
                <span>Quantity Range</span>
                <span>Status</span>
              </div>
              
              {filteredProducts.slice(0, 20).map((product) => (
                <div key={product.id} className="table-row">
                  <div className="product-info">
                    <strong>{product.name}</strong>
                    {product.description && (
                      <p className="product-description">{product.description}</p>
                    )}
                  </div>
                  
                  <div className="product-type">
                    {product.measurementType ? (
                      <span className="type-badge v2">
                        {getMeasurementTypeInfo(product.measurementType).label}
                      </span>
                    ) : (
                      <span className="type-badge v1">V1 Legacy</span>
                    )}
                  </div>
                  
                  <div className="product-price">
                    {formatPrice(product.basePrice || product.price || 0)}
                  </div>
                  
                  <div className="product-quantity">
                    {product.measurementType ? (
                      product.minQty || product.maxQty ? (
                        <span>
                          {product.minQty && formatQuantity(product.minQty, product.measurementType, product.unitLabel)}
                          {product.minQty && product.maxQty && ' - '}
                          {product.maxQty && formatQuantity(product.maxQty, product.measurementType, product.unitLabel)}
                        </span>
                      ) : (
                        <span>Any quantity</span>
                      )
                    ) : (
                      <span className="legacy-quantity">Legacy format</span>
                    )}
                  </div>
                  
                  <div className="product-status">
                    <span className={`status-indicator ${
                      product.isAvailable !== false ? 'available' : 'unavailable'
                    }`}>
                      {product.isAvailable !== false ? '✅ Available' : '❌ Unavailable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="preview-actions">
        <div className="actions-group">
          <button className="action-button primary" onClick={() => window.location.href = '/admin/migration'}>
            🚀 Continue Migration
          </button>
          
          <button className="action-button secondary" onClick={() => window.location.href = '/admin/validation'}>
            ✅ Validate Migration
          </button>
          
          {previewData.migrationProgress === 100 && (
            <button className="action-button success" onClick={() => window.location.href = '/admin/switch-to-v2'}>
              🎉 Switch All Clients to V2
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMigrationPreview;
