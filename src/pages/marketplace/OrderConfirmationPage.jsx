import React, { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { getOrder } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';

/**
 * Order confirmation page displayed after successful checkout
 */
const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  
  // Get payment status from URL if it exists
  const queryParams = new URLSearchParams(location.search);
  const paymentStatus = queryParams.get('status');
  
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orderData = await getOrder(orderId);
        if (orderData) {
          setOrder(orderData);
        } else {
          setError('Order not found');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };
    
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading order details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-100 pt-10">
        <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="mt-4 text-2xl font-bold text-gray-800">Order Not Found</h1>
            <p className="mt-2 text-gray-600">{error || 'The order details could not be found'}</p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Determine if payment was successful based on order data or URL params
  const isPaymentSuccessful = order.payment.status === 'paid' || 
    (paymentStatus && paymentStatus.toLowerCase() === 'successful');
  
  return (
    <div className="min-h-screen bg-gray-100 pt-10 pb-12">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header section */}
          <div className={`p-6 ${isPaymentSuccessful ? 'bg-green-50' : 'bg-yellow-50'} border-b`}>
            <div className="flex items-center">
              {isPaymentSuccessful ? (
                <CheckCircleIcon className="h-10 w-10 text-green-500 mr-4" />
              ) : (
                <ExclamationCircleIcon className="h-10 w-10 text-yellow-500 mr-4" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {isPaymentSuccessful 
                    ? 'Order Confirmed!' 
                    : 'Order Received - Payment Pending'}
                </h1>
                <p className="text-gray-600">
                  {isPaymentSuccessful
                    ? 'Thank you for your purchase. Your order has been confirmed.'
                    : 'Your order has been received but payment is still pending.'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Order details */}
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Order Summary</h2>
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium">{order.id}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(order.createdAt.toDate()).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium capitalize">{order.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium capitalize">
                    {order.payment.method === 'POD' ? 'Pay on Delivery' : order.payment.method}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Customer information */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Customer Information</h2>
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{order.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{order.customer.phone}</span>
                </div>
              </div>
            </div>
            
            {/* Delivery information */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Delivery Information</h2>
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium">{order.areaFrom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium">{order.areaTo}</span>
                </div>
              </div>
            </div>
            
            {/* Order items */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Order Items</h2>
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.name}</div>
                          {item.variantName && (
                            <div className="text-xs text-gray-500">{item.variantName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.qty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCurrency(item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Order totals */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Delivery Fee:</span>
                  <span className="font-medium">{formatCurrency(order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-800 font-semibold">Total:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(order.subtotal + order.deliveryFee)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3 mt-8">
              <Link
                to="/"
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Continue Shopping
              </Link>
              
              {!isPaymentSuccessful && order.payment.method === 'CARD' && (
                <Link
                  to={`/orders/${orderId}/pay`}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Complete Payment
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
