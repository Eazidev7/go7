import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductFormStepper from '../../components/vendor/products/ProductFormStepper';
import { Product } from '../../types/marketplace';

const ProductFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId?: string }>();

  const handleSave = (product: Product) => {
    // Navigate back to products list after successful save
    navigate('/vendor/products');
  };

  const handleCancel = () => {
    // Navigate back to products list on cancel
    navigate('/vendor/products');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProductFormStepper
          productId={productId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default ProductFormPage;