import React from 'react';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../contexts/CartContext';

const CartButton: React.FC = () => {
  const { openCart, totalItems } = useCart();

  return (
    <button
      type="button"
      className="ml-4 relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
      onClick={openCart}
      aria-label="Open shopping cart"
    >
      <ShoppingCartIcon className="h-6 w-6" aria-hidden="true" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
          {totalItems}
        </span>
      )}
    </button>
  );
};

export default CartButton;
