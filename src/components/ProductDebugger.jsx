/**
 * Product Debugger Component
 * Helps debug why uploaded products aren't showing in the frontend
 */

import React, { useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function ProductDebugger() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendorId, setVendorId] = useState('');

  const checkProducts = async () => {
    if (!vendorId.trim()) {
      alert('Please enter a vendor ID');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Checking products for vendor:', vendorId);

      // Check V2 products path
      const v2Path = collection(db, 'vendors', vendorId, 'products');
      const v2Query = query(v2Path, orderBy('createdAt', 'desc'), limit(10));
      const v2Snapshot = await getDocs(v2Query);
      
      console.log('📊 V2 Products found:', v2Snapshot.size);
      
      const foundProducts = [];
      v2Snapshot.forEach(doc => {
        const data = doc.data();
        foundProducts.push({
          id: doc.id,
          name: data.name || 'No name',
          category: data.category || 'No category',
          price: data.price || 0,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate?.() || 'No date',
          path: 'V2'
        });
      });

      // Check V1 products path (legacy)
      try {
        const v1Path = collection(db, 'products');
        const v1Query = query(v1Path, orderBy('createdAt', 'desc'), limit(5));
        const v1Snapshot = await getDocs(v1Query);
        
        console.log('📊 V1 Products found:', v1Snapshot.size);
        
        v1Snapshot.forEach(doc => {
          const data = doc.data();
          if (data.vendorId === vendorId) {
            foundProducts.push({
              id: doc.id,
              name: data.name || 'No name',
              category: data.category || 'No category',
              price: data.price || 0,
              isActive: data.isActive,
              createdAt: data.createdAt?.toDate?.() || 'No date',
              path: 'V1'
            });
          }
        });
      } catch (v1Error) {
        console.warn('V1 products check failed:', v1Error);
      }

      setProducts(foundProducts);
      console.log('✅ Total products found:', foundProducts.length);
      
    } catch (error) {
      console.error('❌ Error checking products:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Force reload without cache
    window.location.reload(true);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'white', 
      border: '2px solid #ddd', 
      padding: '15px', 
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#E83A2E' }}>🔧 Product Debugger</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <input 
          type="text"
          placeholder="Enter Vendor ID"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '8px'
          }}
        />
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={checkProducts}
            disabled={loading}
            style={{
              padding: '8px 12px',
              background: '#E83A2E',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '🔍 Checking...' : '🔍 Check Products'}
          </button>
          
          <button 
            onClick={clearCache}
            style={{
              padding: '8px 12px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑️ Clear Cache
          </button>
        </div>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <h4 style={{ margin: '10px 0 5px 0' }}>Products Found: {products.length}</h4>
        
        {products.length === 0 && !loading && (
          <p style={{ color: '#666', fontSize: '14px' }}>
            No products found. Try entering your vendor ID and clicking "Check Products".
          </p>
        )}
        
        {products.map((product, index) => (
          <div key={index} style={{
            background: '#f9f9f9',
            padding: '8px',
            marginBottom: '8px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>{product.name}</strong><br/>
            <span style={{ color: '#666' }}>
              {product.category} • ₦{product.price} • {product.path}<br/>
              Active: {product.isActive ? '✅' : '❌'} • {String(product.createdAt)}
            </span>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
        💡 If products don't show: Check vendor ID, refresh page, or clear cache
      </div>
    </div>
  );
}