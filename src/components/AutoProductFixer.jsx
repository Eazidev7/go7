import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';

const AutoProductFixer = () => {
  const [status, setStatus] = useState('Starting...');
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const fixProducts = async () => {
    if (running) return;
    setRunning(true);
    addLog('🚀 Starting automatic product fix...', 'info');

    try {
      const vendorsRef = collection(db, 'vendors');
      const vendorsSnapshot = await getDocs(vendorsRef);
      
      addLog(`✅ Found ${vendorsSnapshot.size} vendors`, 'success');
      
      let totalProducts = 0;
      let productsFixed = 0;
      let vendorsFixed = 0;
      let productsCreated = 0;
      
      const sampleProducts = [
        { name: "Jollof Rice", basePrice: 2500, category: "Main Course", description: "Delicious Nigerian Jollof rice with chicken" },
        { name: "Fried Rice", basePrice: 2000, category: "Main Course", description: "Mixed vegetable fried rice" },
        { name: "Amala & Ewedu", basePrice: 1500, category: "Local Dishes", description: "Traditional Nigerian soup" },
        { name: "Pounded Yam & Egusi", basePrice: 3000, category: "Local Dishes", description: "Fresh pounded yam with egusi soup" },
        { name: "Chicken & Chips", basePrice: 2800, category: "Fast Food", description: "Crispy fried chicken with chips" }
      ];

      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorId = vendorDoc.id;
        const vendorName = vendorDoc.data().name || vendorDoc.data().businessName || 'Unnamed';
        
        const productsRef = collection(db, 'vendors', vendorId, 'products');
        const productsSnapshot = await getDocs(productsRef);
        
        totalProducts += productsSnapshot.size;
        
        // Fix existing products
        if (productsSnapshot.size > 0) {
          for (const productDoc of productsSnapshot.docs) {
            const productData = productDoc.data();
            if (!productData.vendorId || productData.vendorId !== vendorId) {
              const productRef = doc(db, 'vendors', vendorId, 'products', productDoc.id);
              await updateDoc(productRef, {
                vendorId: vendorId,
                restaurant_id: vendorId,
                updatedAt: Timestamp.now()
              });
              productsFixed++;
              addLog(`  🔧 Fixed vendorId for ${productData.name}`, 'warning');
            }
          }
          addLog(`✅ ${vendorName}: ${productsSnapshot.size} products verified`, 'success');
        } else {
          // Create products for empty vendors
          addLog(`🛠️ Creating products for ${vendorName}...`, 'info');
          
          for (const product of sampleProducts) {
            await addDoc(productsRef, {
              name: product.name,
              description: product.description,
              desc: product.description,
              basePrice: product.basePrice,
              price: product.basePrice,
              category: product.category,
              vendorId: vendorId,
              restaurant_id: vendorId,
              active: true,
              isActive: true,
              available: true,
              isAvailable: true,
              measurementType: 'portion',
              imageUrl: `https://via.placeholder.com/400x300?text=${encodeURIComponent(product.name)}`,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            });
            productsCreated++;
          }
          vendorsFixed++;
          addLog(`✅ Created ${sampleProducts.length} products for ${vendorName}`, 'success');
        }
      }

      const finalResults = {
        totalVendors: vendorsSnapshot.size,
        totalProducts,
        productsFixed,
        vendorsFixed,
        productsCreated
      };
      
      setResults(finalResults);
      setStatus('Complete!');
      addLog('🎉 All vendors fixed!', 'success');
      
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      setStatus('Error occurred');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    // Auto-run on mount
    const timer = setTimeout(() => {
      fixProducts();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '80vh',
      background: '#1a1a1a',
      color: '#00ff00',
      border: '2px solid #00ff00',
      borderRadius: '8px',
      padding: '20px',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px',
      overflowY: 'auto'
    }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#00ff00' }}>
        🔧 Auto Product Fixer
      </h2>
      
      <div style={{ marginBottom: '15px', padding: '10px', background: '#000', borderRadius: '4px' }}>
        <strong>Status:</strong> {status}
      </div>

      {results && (
        <div style={{ marginBottom: '15px', padding: '10px', background: '#004400', borderRadius: '4px' }}>
          <div><strong>Total Vendors:</strong> {results.totalVendors}</div>
          <div><strong>Total Products:</strong> {results.totalProducts}</div>
          <div><strong>Products Fixed:</strong> {results.productsFixed}</div>
          <div><strong>Vendors Fixed:</strong> {results.vendorsFixed}</div>
          <div><strong>Products Created:</strong> {results.productsCreated}</div>
        </div>
      )}

      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto', 
        background: '#000', 
        padding: '10px', 
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        {logs.map((log, i) => (
          <div key={i} style={{ 
            color: log.type === 'error' ? '#ff0000' : log.type === 'warning' ? '#ffaa00' : log.type === 'success' ? '#00ff00' : '#00aaff',
            marginBottom: '5px'
          }}>
            [{log.time}] {log.message}
          </div>
        ))}
      </div>

      {!running && results && (
        <button
          onClick={fixProducts}
          style={{
            width: '100%',
            padding: '10px',
            background: '#00ff00',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Run Again
        </button>
      )}
    </div>
  );
};

export default AutoProductFixer;
