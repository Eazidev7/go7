import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface OrderDetails {
  id: string;
  vendorId: string;
  customer: {
    name: string;
    phone: string;
  };
  items: Array<{
    productId: string;
    title: string;
    qty: number;
    unitPrice: number;
    options?: Record<string, string>;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  payment: {
    method: 'POD' | 'CARD';
    status: 'pending' | 'paid' | 'failed';
  };
  status: 'new' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  areaFrom: string;
  areaTo: string;
  createdAt: any; // Firestore timestamp
}

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        if (!orderId) {
          setError('Order ID not found');
          setLoading(false);
          return;
        }

        const orderRef = doc(db, `orders/${orderId}`);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
          setError('Order not found');
          setLoading(false);
          return;
        }

        const orderData = orderSnap.data() as Omit<OrderDetails, 'id'>;
        setOrder({
          id: orderSnap.id,
          ...orderData
        });
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
        <p className="text-gray-600">{error || 'Order not found'}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  const getStatusIcon = () => {
    switch (order.status) {
      case 'new':
        return <ClockIcon className="h-8 w-8 text-yellow-500" />;
      case 'accepted':
      case 'picked_up':
      case 'delivered':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-8 w-8 text-red-500" />;
      default:
        return <ClockIcon className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (order.status) {
      case 'new':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'picked_up':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Order Confirmed!</h1>
          <p className="text-gray-600 mt-2">
            Thank you for your order. We've received it and will begin processing it soon.
          </p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg leading-6 font-medium text-gray-900">Order #{order.id}</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex items-center">
              {getStatusIcon()}
              <span className="ml-2 text-sm font-medium text-gray-900">{getStatusText()}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1 text-sm text-gray-900">{order.customer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="mt-1 text-sm text-gray-900">{order.customer.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Delivery Area</p>
                <p className="mt-1 text-sm text-gray-900">{order.areaTo}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Method</p>
                <p className="mt-1 text-sm text-gray-900">
                  {order.payment.method === 'POD' ? 'Pay on Delivery' : 'Card Payment'}
                  {' '}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.payment.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : order.payment.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.payment.status === 'paid' 
                      ? 'Paid' 
                      : order.payment.status === 'failed'
                      ? 'Failed'
                      : 'Pending'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Item
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Options
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Qty
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Price
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.options 
                        ? Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      ₦{item.unitPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ₦{(item.unitPrice * item.qty).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    Subtotal
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                    ₦{order.subtotal.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    Delivery Fee
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                    ₦{order.deliveryFee.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    ₦{order.total.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
