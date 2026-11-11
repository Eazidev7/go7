import React from 'react';
import { useNavigate } from 'react-router-dom';
import VendorProducts from '../../components/vendor/products/VendorProducts';

const VendorProductsPage = () => {
  const navigate = useNavigate();

  const handleEditProduct = (product) => {
    // Navigate to edit product page or open edit modal
    navigate(`/vendor/products/${product.id}/edit`);
  };

  const handleAddProduct = () => {
    // Navigate to add product page or open add modal
    navigate('/vendor/products/new');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VendorProducts
          onEditProduct={handleEditProduct}
          onAddProduct={handleAddProduct}
        />
      </div>
    </div>
  );
};

export default VendorProductsPage;