import React from 'react';
import { Link } from 'react-router-dom';
import CheckoutForm from '../../components/marketplace/CheckoutForm';
import { useCart } from '../../contexts/CartContext';
import { XMarkIcon as XIcon } from '@heroicons/react/24/solid';

const CheckoutPage: React.FC = () => {
  const { items } = useCart();

  // Redirect to home if cart is empty
  if (items.length === 0) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Your cart is empty</h1>
            <p className="mt-4 text-lg text-gray-500">You haven't added any items to your cart yet.</p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <span className="sr-only">Close</span>
            <XIcon className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          {/* Cart items */}
          <section aria-labelledby="cart-heading" className="lg:col-span-7">
            <h2 id="cart-heading" className="sr-only">
              Items in your shopping cart
            </h2>

            <ul role="list" className="border-t border-b border-gray-200 divide-y divide-gray-200">
              {items.map((item: any, index: number) => (
                <li key={index} className="flex py-6 sm:py-10">
                  <div className="flex-shrink-0">
                    <img
                      src={item.product.imageUrl || '/placeholder.png'}
                      alt={item.product.title}
                      className="w-24 h-24 rounded-md object-center object-cover sm:w-48 sm:h-48"
                    />
                  </div>

                  <div className="ml-4 flex-1 flex flex-col justify-between sm:ml-6">
                    <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                      <div>
                        <div className="flex justify-between">
                          <h3 className="text-sm">
                            <span className="font-medium text-gray-700 hover:text-gray-800">
                              {item.product.title}
                            </span>
                          </h3>
                        </div>
                        {item.product.variantName && (
                          <div className="mt-1 flex text-sm">
                            <p className="text-gray-500">{item.product.variantName}</p>
                          </div>
                        )}
                        <p className="mt-1 text-sm font-medium text-gray-900">₦{item.product.price.toLocaleString()}</p>
                      </div>

                      <div className="mt-4 sm:mt-0 sm:pr-9">
                        <div className="absolute top-0 right-0 sm:right-4">
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            Qty: {item.qty}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 flex text-sm text-gray-700 space-x-2">
                      <span className="text-green-500">In Stock</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Checkout form */}
          <section
            aria-labelledby="summary-heading"
            className="mt-16 bg-white rounded-lg px-4 py-6 sm:p-6 lg:p-8 lg:mt-0 lg:col-span-5"
          >
            <CheckoutForm />
          </section>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
