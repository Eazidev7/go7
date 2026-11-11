import React, { useState } from 'react';
import { useOrders } from '../state/ordersStore.jsx';
import { formatNaira } from '../utils/earnings.js';

const OpsReconciliation = () => {
  const { orders, updateOrder } = useOrders();
  const [filter, setFilter] = useState('all'); // all | pod_cash | pod_transfer
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | collected | verified

  // Filter PoD orders
  const podOrders = orders.filter(order => 
    order.payment && order.payment.method.startsWith('pod_')
  );

  // Apply filters
  const filteredOrders = podOrders.filter(order => {
    const methodMatch = filter === 'all' || order.payment.method === filter;
    const statusMatch = statusFilter === 'all' || order.reconciliation.status === statusFilter;
    return methodMatch && statusMatch;
  });

  const handleMarkVerified = (orderId) => {
    updateOrder(orderId, {
      reconciliation: {
        status: 'verified'
      }
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-800',
      collected: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getMethodBadge = (method) => {
    const colors = {
      pod_cash: 'bg-green-100 text-green-800',
      pod_transfer: 'bg-blue-100 text-blue-800'
    };
    
    const labels = {
      pod_cash: 'Cash',
      pod_transfer: 'Transfer'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[method] || 'bg-gray-100 text-gray-800'}`}>
        {labels[method] || method}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ops Reconciliation</h1>
          <p className="text-gray-600 mt-2">Manage Pay on Delivery order reconciliation</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Methods</option>
                <option value="pod_cash">Cash Only</option>
                <option value="pod_transfer">Transfer Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="collected">Collected</option>
                <option value="verified">Verified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-bold text-amber-600">
              {podOrders.filter(o => o.reconciliation.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending Collection</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-bold text-blue-600">
              {podOrders.filter(o => o.reconciliation.status === 'collected').length}
            </div>
            <div className="text-sm text-gray-600">Awaiting Verification</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-bold text-green-600">
              {podOrders.filter(o => o.reconciliation.status === 'verified').length}
            </div>
            <div className="text-sm text-gray-600">Verified</div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              PoD Orders ({filteredOrders.length})
            </h2>
          </div>
          
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <p className="text-gray-500">No PoD orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Collected At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id.slice(-6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNaira(order.customerFee || order.price || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getMethodBadge(order.payment.method)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.reconciliation.collectedBy || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.reconciliation.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.reconciliation.collectedAt 
                          ? new Date(order.reconciliation.collectedAt).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {order.reconciliation.status === 'collected' && (
                          <button
                            onClick={() => handleMarkVerified(order.id)}
                            className="text-purple-600 hover:text-purple-900 font-medium"
                          >
                            Mark Verified
                          </button>
                        )}
                        {order.reconciliation.proofUrl && (
                          <a
                            href={order.reconciliation.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 font-medium ml-3"
                          >
                            View Proof
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpsReconciliation;
