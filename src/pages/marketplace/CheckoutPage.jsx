import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import CheckoutForm from '../../components/marketplace/CheckoutForm';
import { ChevronLeftIcon, ShoppingCartIcon } from '@heroicons/react/24/solid';

/**
 * Checkout page component
 */
const CheckoutPage = () => {
  const { cart } = useCart();
  const navigate = useNavigate();
  
  // Redirect to shopping if cart is empty
  if (!cart.items.length) {
    return (
      <div className="min-h-screen bg-gray-100 pt-10">
        <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md text-center">
          <div className="mb-6 flex justify-center">
            <ShoppingCartIcon className="h-16 w-16 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">
            You don't have any items in your cart yet. Add some products to proceed with checkout.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 pt-6 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Back to Cart
          </button>
        </div>
        
        {/* Page title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Checkout</h1>
          <p className="mt-2 text-sm text-gray-600">
            Complete your order by providing the information below
          </p>
        </div>
        
        {/* Checkout form */}
        <CheckoutForm />
      </div>
    </div>
  );
};

export default CheckoutPage;
