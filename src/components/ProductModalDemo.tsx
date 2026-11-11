// 🚀 PRODUCT MODAL V2 DEMO — Testing Component (Nov 2025)
// Test component to demonstrate the new V2 ProductModal functionality

import React, { useState } from 'react';
import ProductModalV2 from './ProductModalV2';

const ProductModalDemo: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  // Sample product data for testing
  const sampleProduct = {
    id: 'prod_123',
    name: 'Jollof Rice Special',
    price: 2500,
    image: '/sample-jollof.jpg',
    description: 'Our signature jollof rice with perfectly seasoned chicken and plantain',
    measurementType: 'portion' as const,
    category: 'main-dish',
    rating: 4.8,
    preparationTime: '15-20 mins'
  };

  const sampleVendorId = 'vendor_123';

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">ProductModal V2 Demo</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
        <img 
          src={sampleProduct.image}
          alt={sampleProduct.name}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
        <h3 className="text-xl font-semibold mb-2">{sampleProduct.name}</h3>
        <p className="text-gray-600 mb-4">{sampleProduct.description}</p>
        <div className="text-xl font-bold text-red-600 mb-4">
          ₦{sampleProduct.price.toLocaleString()}
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
        >
          Add extras
        </button>
      </div>

      {/* ProductModal V2 */}
      <ProductModalV2
        product={sampleProduct}
        vendorId={sampleVendorId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default ProductModalDemo;