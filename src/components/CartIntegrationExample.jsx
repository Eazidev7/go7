// Example: How to integrate GO7 Cart System in any component

import React from 'react';
import { useCart } from '../contexts/CartContext';

export default function CartIntegrationExample() {
  const { addToCart, items, getItemCount, getSubtotal } = useCart();

  // Example product object
  const exampleProduct = {
    id: 'prod123',
    name: 'Jollof Rice Special',
    price: 2500,
    imageUrl: '/images/jollof-rice.jpg',
    vendorId: 'vendor123',
    vendorName: 'Mama's Kitchen',
    category: 'food'
  };

  // Example addons
  const exampleAddons = [
    { id: 'addon1', name: 'Extra Chicken', price: 500, qty: 1 },
    { id: 'addon2', name: 'Soft Drink', price: 300, qty: 1 }
  ];

  // Simple add to cart (no addons)
  const handleSimpleAddToCart = () => {
    addToCart({
      id: exampleProduct.id,
      name: exampleProduct.name,
      price: exampleProduct.price,
      imageUrl: exampleProduct.imageUrl,
      qty: 1,
      vendorId: exampleProduct.vendorId,
      vendorName: exampleProduct.vendorName,
      addons: [] // No addons
    });
    
    console.log('✅ Added to cart:', exampleProduct.name);
  };

  // Add to cart with addons and custom quantity
  const handleAddToCartWithAddons = () => {
    addToCart({
      id: exampleProduct.id,
      name: exampleProduct.name,
      price: exampleProduct.price,
      imageUrl: exampleProduct.imageUrl,
      qty: 2, // Quantity of 2
      vendorId: exampleProduct.vendorId,
      vendorName: exampleProduct.vendorName,
      addons: exampleAddons // Include addons
    });
    
    console.log('✅ Added to cart with addons:', exampleProduct.name, exampleAddons);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>GO7 Cart Integration Example</h2>
      
      {/* Cart Summary */}
      <div style={{
        background: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
        border: '1px solid #dee2e6'
      }}>
        <h3>Current Cart Status:</h3>
        <p>Items in cart: <strong>{getItemCount()}</strong></p>
        <p>Subtotal: <strong>₦{getSubtotal().toLocaleString()}</strong></p>
        
        {items.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4>Cart Items:</h4>
            {items.map((item, idx) => (
              <div key={idx} style={{
                padding: 8,
                background: 'white',
                marginBottom: 8,
                borderRadius: 4,
                border: '1px solid #e9ecef'
              }}>
                <div><strong>{item.name}</strong> x{item.qty}</div>
                <div>Vendor: {item.vendorName}</div>
                <div>Price: ₦{((item.price + (item.addons || []).reduce((s,a) => s + (a.price||0) * (a.qty||1), 0)) * item.qty).toLocaleString()}</div>
                {item.addons && item.addons.length > 0 && (
                  <div style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>
                    Add-ons: {item.addons.map(a => `${a.name} (₦${a.price})`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Example Product Card */}
      <div style={{
        border: '1px solid #dee2e6',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        background: 'white'
      }}>
        <img 
          src={exampleProduct.imageUrl} 
          alt={exampleProduct.name}
          style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
          onError={(e) => { e.target.src = '/placeholder-food.jpg'; }}
        />
        <h3>{exampleProduct.name}</h3>
        <p style={{ color: '#666' }}>From: {exampleProduct.vendorName}</p>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#E83A2E' }}>
          ₦{exampleProduct.price.toLocaleString()}
        </p>
        
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            onClick={handleSimpleAddToCart}
            style={{
              flex: 1,
              background: '#E83A2E',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Add to Cart
          </button>
          
          <button
            onClick={handleAddToCartWithAddons}
            style={{
              flex: 1,
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Add with Extras
          </button>
        </div>
      </div>

      {/* Integration Instructions */}
      <div style={{
        background: '#e7f3ff',
        padding: 16,
        borderRadius: 8,
        border: '1px solid #b8daff'
      }}>
        <h3>🚀 Integration Steps:</h3>
        <ol>
          <li>Import: <code>import {"{ useCart }"} from '../context/CartContext';</code></li>
          <li>Get cart functions: <code>const {"{ addToCart, items, getItemCount, getSubtotal }"} = useCart();</code></li>
          <li>Format your product object with required fields: <code>id, name, price, qty, vendorId, vendorName</code></li>
          <li>Call <code>addToCart(productObject)</code> when user clicks add to cart</li>
          <li>Use CartDrawer and CheckoutBar components (already added to App.jsx)</li>
        </ol>
        
        <h4>Required Product Fields:</h4>
        <ul>
          <li><strong>id:</strong> Unique product identifier</li>
          <li><strong>name:</strong> Product name</li>
          <li><strong>price:</strong> Base price (number)</li>
          <li><strong>qty:</strong> Quantity (number)</li>
          <li><strong>vendorId:</strong> Vendor identifier</li>
          <li><strong>vendorName:</strong> Vendor display name</li>
        </ul>
        
        <h4>Optional Fields:</h4>
        <ul>
          <li><strong>imageUrl:</strong> Product image URL</li>
          <li><strong>addons:</strong> Array of add-on objects with {`{id, name, price, qty}`}</li>
          <li><strong>category:</strong> Product category</li>
        </ul>
      </div>
    </div>
  );
}