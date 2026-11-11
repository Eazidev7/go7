import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getDoc, collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { vendorDoc, ordersCol } from '../../lib/vendorRefs';
import { db } from '../../firebase/config';
import { Vendor, Order } from '../../types/marketplace';
import VendorLayout from '../../components/vendor/VendorLayout';
import { 
  PhoneIcon, 
  PrinterIcon, 
  ArrowPathIcon as RefreshIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ClockIcon,
  TruckIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatPhoneNumber } from '../../utils/formatters';
import { getVendorOrders, updateOrderStatus as updateOrderStatusService } from '../../services/vendorOrderService';
import { bookDelivery } from '../../services/deliveryService';
import { validatePickupTime, getPickupTimeConstraints } from '../../utils/pickupTimeValidation';

// Order status columns for Kanban board
const ORDER_STATUSES = [
  { key: 'new', label: 'New Orders', color: 'bg-blue-500' },
  { key: 'accepted', label: 'Accepted', color: 'bg-yellow-500' },
  { key: 'ready', label: 'Ready', color: 'bg-purple-500' },
  { key: 'picked_up', label: 'Picked Up', color: 'bg-orange-500' },
  { key: 'delivery_scheduled', label: 'Delivery Scheduled', color: 'bg-indigo-500' },
  { key: 'completed', label: 'Completed', color: 'bg-green-500' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500' }
];

// Helper function to format datetime
const formatDateTime = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  // Convert Firebase Timestamp to Date
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

const VendorOrders = () => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBatchDelivery, setShowBatchDelivery] = useState(false);
  const [batchPickupTime, setBatchPickupTime] = useState('');
  const [creatingDeliveries, setCreatingDeliveries] = useState(false);
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendorData = async () => {
      if (!auth.currentUser) {
        navigate('/vendor/login');
        return;
      }

      try {
        // Get vendor data
        const vendorSnapshot = await getDoc(vendorDoc(auth.currentUser.uid));
        
        if (!vendorSnapshot.exists()) {
          navigate('/vendor/setup');
          return;
        }
        
        const vendorData = vendorSnapshot.data() as Vendor;
        setVendor(vendorData);
        
        // Get orders
        const vendorOrders = await getVendorOrders(auth.currentUser.uid);
        setOrders(vendorOrders);
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [auth.currentUser, navigate]);

  const updateOrderStatus = async (orderId: string, newStatus: 'new' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled' | 'delivery_scheduled' | 'ready' | 'completed') => {
    try {
      await updateOrderStatusService(orderId, newStatus);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Handle order selection for batch delivery
  const handleOrderSelection = (orderId: string, checked: boolean) => {
    const newSelection = new Set(selectedOrders);
    
    if (checked) {
      newSelection.add(orderId);
    } else {
      newSelection.delete(orderId);
    }
    
    setSelectedOrders(newSelection);
  };

  // Refresh orders
  const refreshOrders = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      const vendorOrders = await getVendorOrders(auth.currentUser.uid);
      setOrders(vendorOrders);
    } catch (error) {
      console.error('Error refreshing orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create batch deliveries
  const createBatchDeliveries = async () => {
    if (selectedOrders.size === 0) return;
    
    setCreatingDeliveries(true);
    
    try {
      // Create a delivery for each selected order
      for (const orderId of selectedOrders) {
        const order = orders.find(o => o.id === orderId);
        if (!order) continue;
        
        // Fixed: bookDelivery call to match expected parameters
        await bookDelivery(order);
        await updateOrderStatus(orderId, 'delivery_scheduled');
      }
      
      // Clear selection and close modal
      setSelectedOrders(new Set());
      setShowBatchDelivery(false);
      refreshOrders();
    } catch (error) {
      console.error('Error creating batch deliveries:', error);
    } finally {
      setCreatingDeliveries(false);
    }
  };

  // Get minimum pickup time (30 minutes from now)
  const getMinPickupTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  };

  const OrderCard: React.FC<{ 
    order: Order; 
    onUpdateStatus: (orderId: string, status: 'new' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled' | 'delivery_scheduled' | 'ready' | 'completed') => void;
    showSelection?: boolean;
    isSelected?: boolean;
    onSelectionChange?: (orderId: string, checked: boolean) => void;
  }> = ({ 
    order, 
    onUpdateStatus,
    showSelection = false,
    isSelected = false,
    onSelectionChange
  }) => {
    const totalAmount = order.items?.reduce((sum, item) => sum + (item.price * item.qty), 0) || 0;

    const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', order.id || '');
      e.dataTransfer.effectAllowed = 'move';
    };

    const canBeScheduledForDelivery = ['ready', 'picked_up'].includes(order.status || '');

    return (
      <div 
        className="bg-white p-4 rounded-lg shadow mb-3 border-l-4 border-gray-300 cursor-move relative"
        draggable={true}
        onDragStart={handleDragStart}
        id={`order-${order.id}`}
      >
        {showSelection && (
          <div className="absolute top-2 right-2">
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={(e) => onSelectionChange && onSelectionChange(order.id || '', e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 rounded"
            />
          </div>
        )}
        
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-800">
            Order #{order.id?.slice(-6)}
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>
        
        <div className="text-sm text-gray-500 mb-2">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            {formatDateTime(order.createdAt)} 
          </div>
          {order.customer && (
            <div className="flex items-center mt-1">
              <div className="text-sm">
                {order.customer.name}
                {order.customer.phone && (
                  <a href={`tel:${order.customer.phone}`} className="flex items-center text-blue-500 hover:text-blue-700 mt-1">
                    <PhoneIcon className="h-3 w-3 mr-1" />
                    {formatPhoneNumber(order.customer.phone)}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-3 text-sm">
          <div className="font-medium">Items:</div>
          <ul className="list-disc list-inside ml-2">
            {order.items?.map((item, idx) => (
              <li key={idx} className="text-xs py-1 border-b border-dashed border-gray-100 last:border-0">
                {item.qty}x {item.name}
                {item.variantName && <span className="text-gray-500"> ({item.variantName})</span>}
                <span className="float-right font-medium">{formatCurrency(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-3 flex justify-between font-bold">
          <div>Total:</div>
          <div>{formatCurrency(totalAmount)}</div>
        </div>
        
        <div className="mt-4 flex justify-between">
          <button 
            onClick={() => window.print()}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 flex items-center"
          >
            <PrinterIcon className="h-3 w-3 mr-1" />
            Print
          </button>
          
          {order.status === 'new' && (
            <div className="space-x-2">
              <button 
                onClick={() => onUpdateStatus(order.id || '', 'accepted')}
                className="text-xs px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-800"
              >
                Accept
              </button>
              <button 
                onClick={() => onUpdateStatus(order.id || '', 'cancelled')}
                className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800"
              >
                Decline
              </button>
            </div>
          )}
          
          {order.status === 'accepted' && (
            <button 
              onClick={() => onUpdateStatus(order.id || '', 'ready')}
              className="text-xs px-2 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-800"
            >
              Mark Ready
            </button>
          )}
          
          {order.status === 'ready' && (
            <button 
              onClick={() => onUpdateStatus(order.id || '', 'picked_up')}
              className="text-xs px-2 py-1 rounded bg-orange-100 hover:bg-orange-200 text-orange-800"
            >
              Picked Up
            </button>
          )}
          
          {order.status === 'picked_up' && (
            <button 
              onClick={() => onUpdateStatus(order.id || '', 'completed')}
              className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800"
            >
              Complete
            </button>
          )}
        </div>
      </div>
    );
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'picked_up': return 'bg-orange-100 text-orange-800';
      case 'delivery_scheduled': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'new': return 'New';
      case 'accepted': return 'Accepted';
      case 'ready': return 'Ready';
      case 'picked_up': return 'Picked Up';
      case 'delivery_scheduled': return 'Delivery Scheduled';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status || 'Unknown';
    }
  };

  // Column component for Kanban view
  const Column: React.FC<{ 
    status: { key: string; label: string; color: string };
    orders: Order[];
  }> = ({ status, orders }) => {
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      const orderId = e.dataTransfer.getData('text/plain');
      if (!orderId || !draggedOrder) return;

      // Type assertion to ensure status.key is a valid status type
      const newStatus = status.key as 'new' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled' | 'delivery_scheduled' | 'ready' | 'completed';
      
      await updateOrderStatus(orderId, newStatus);
    };

    const filteredOrders = orders.filter(order => order.status === status.key);

    return (
      <div 
        className="bg-gray-100 p-3 rounded-md min-w-[280px] max-w-[280px] h-full flex flex-col"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className={`${status.color} text-white px-3 py-2 rounded-md mb-3 flex justify-between items-center`}>
          <h3 className="font-semibold">{status.label}</h3>
          <span className="bg-white text-gray-800 rounded-full px-2 py-0.5 text-xs">
            {filteredOrders.length}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredOrders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onUpdateStatus={updateOrderStatus} 
              showSelection={showBatchDelivery && ['ready', 'picked_up'].includes(order.status || '')}
              isSelected={selectedOrders.has(order.id || '')}
              onSelectionChange={handleOrderSelection}
            />
          ))}
        </div>
      </div>
    );
  };

  // Render the main component
  return (
    <VendorLayout title="Orders" vendor={vendor}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Manage Orders</h1>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={refreshOrders}
              className="flex items-center px-3 py-2 bg-white text-gray-700 rounded-md border hover:bg-gray-50 text-sm"
            >
              <RefreshIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
            
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                  viewMode === 'kanban' 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                  viewMode === 'list' 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <ShoppingBagIcon className="h-16 w-16 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No orders yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              When customers place orders, they will appear here.
            </p>
          </div>
        ) : viewMode === 'kanban' ? (
          <>
            {/* Batch delivery banner */}
            {showBatchDelivery && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-md flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-blue-800">Schedule batch deliveries</h3>
                  <p className="text-sm text-blue-600">
                    Select orders that are ready for delivery, then set a pickup time
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="datetime-local"
                    value={batchPickupTime}
                    onChange={(e) => setBatchPickupTime(e.target.value)}
                    min={getMinPickupTime()}
                    className="text-sm rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                  
                  <button
                    onClick={createBatchDeliveries}
                    disabled={selectedOrders.size === 0 || !batchPickupTime || creatingDeliveries}
                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md text-sm disabled:opacity-50"
                  >
                    {creatingDeliveries ? 'Processing...' : 'Schedule Deliveries'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowBatchDelivery(false);
                      setSelectedOrders(new Set());
                    }}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Add batch delivery button */}
            {!showBatchDelivery && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setShowBatchDelivery(true);
                    setBatchPickupTime(getMinPickupTime());
                  }}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  <TruckIcon className="h-4 w-4 mr-2" />
                  Schedule Batch Deliveries
                </button>
              </div>
            )}
            
            {/* Kanban board */}
            <div className="flex space-x-4 overflow-x-auto pb-6 h-[calc(100vh-260px)]">
              {ORDER_STATUSES.map(status => (
                <Column 
                  key={status.key} 
                  status={status} 
                  orders={orders}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map(order => {
                  const totalAmount = order.items?.reduce((sum, item) => sum + (item.price * item.qty), 0) || 0;
                  
                  return (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">Order #{order.id?.slice(-6)}</div>
                        <div className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customer?.name}</div>
                        {order.customer?.phone && (
                          <a href={`tel:${order.customer.phone}`} className="text-sm text-blue-500 hover:text-blue-700">
                            {formatPhoneNumber(order.customer.phone)}
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {order.status === 'new' && (
                          <>
                            <button 
                              onClick={() => updateOrderStatus(order.id || '', 'accepted')}
                              className="text-green-600 hover:text-green-900 mr-3"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => updateOrderStatus(order.id || '', 'cancelled')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        
                        {order.status === 'accepted' && (
                          <button 
                            onClick={() => updateOrderStatus(order.id || '', 'ready')}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Mark Ready
                          </button>
                        )}
                        
                        {order.status === 'ready' && (
                          <button 
                            onClick={() => updateOrderStatus(order.id || '', 'picked_up')}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Mark Picked Up
                          </button>
                        )}
                        
                        {order.status === 'picked_up' && (
                          <button 
                            onClick={() => updateOrderStatus(order.id || '', 'completed')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default VendorOrders;