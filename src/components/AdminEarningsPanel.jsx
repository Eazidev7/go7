/**
 * Admin Panel for Earnings & Withdrawals Management
 * Allows admins to approve earnings and mark withdrawals as paid
 */

import React, { useState, useEffect } from 'react';
import {
  getPendingEarnings,
  approveEarning,
  getPendingWithdrawals,
  markWithdrawalPaid
} from '../services/agentEarningsService';
import './AdminEarningsPanel.css';

const AdminEarningsPanel = () => {
  const [pendingEarnings, setPendingEarnings] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('earnings');
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    loadPendingData();
  }, []);

  const loadPendingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [earningsData, withdrawalsData] = await Promise.all([
        getPendingEarnings(),
        getPendingWithdrawals()
      ]);

      setPendingEarnings(earningsData.earnings || []);
      setPendingWithdrawals(withdrawalsData.withdrawals || []);
    } catch (err) {
      console.error('Error loading pending data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEarning = async (earningId) => {
    if (!window.confirm('Are you sure you want to approve this earning?')) {
      return;
    }

    setProcessing(prev => ({ ...prev, [earningId]: true }));

    try {
      const result = await approveEarning(earningId);
      if (result.success) {
        alert(`✅ Earning approved! ₦${result.amount.toLocaleString()} moved to available balance.`);
        loadPendingData();
      }
    } catch (err) {
      alert('Error approving earning: ' + err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [earningId]: false }));
    }
  };

  const handleMarkPaid = async (withdrawalId) => {
    const reference = prompt('Enter payment reference (optional):');
    if (reference === null) return; // User cancelled

    if (!window.confirm('Confirm that you have completed the bank transfer?')) {
      return;
    }

    setProcessing(prev => ({ ...prev, [withdrawalId]: true }));

    try {
      const result = await markWithdrawalPaid(withdrawalId, reference);
      if (result.success) {
        alert('✅ Withdrawal marked as paid!');
        loadPendingData();
      }
    } catch (err) {
      alert('Error marking withdrawal as paid: ' + err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [withdrawalId]: false }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEarningTypeLabel = (type) => {
    const labels = {
      registration: {
        label: 'Vendor Registration',
        description: '₦3,000 when vendor goes live',
        icon: '🏪'
      },
      activation: {
        label: 'Vendor Activation',
        description: '₦1,500 when vendor gets first order',
        icon: '🎉'
      }
    };
    return labels[type] || { label: type, description: '', icon: '💰' };
  };

  if (loading) {
    return (
      <div className="admin-panel loading">
        <div className="spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel error">
        <h3>Error loading data</h3>
        <p>{error}</p>
        <button onClick={loadPendingData}>Retry</button>
      </div>
    );
  }

  const totalPendingEarnings = pendingEarnings.reduce((sum, e) => sum + e.amount, 0);
  const totalPendingWithdrawals = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="panel-header">
        <h1>Agent Earnings Management</h1>
        <button className="refresh-btn" onClick={loadPendingData}>
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card earnings">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <p className="card-label">Pending Earnings</p>
            <p className="card-number">{pendingEarnings.length}</p>
            <p className="card-amount">{formatCurrency(totalPendingEarnings)}</p>
          </div>
        </div>

        <div className="summary-card withdrawals">
          <div className="card-icon">💸</div>
          <div className="card-content">
            <p className="card-label">Pending Withdrawals</p>
            <p className="card-number">{pendingWithdrawals.length}</p>
            <p className="card-amount">{formatCurrency(totalPendingWithdrawals)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={activeTab === 'earnings' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('earnings')}
        >
          Pending Earnings ({pendingEarnings.length})
        </button>
        <button
          className={activeTab === 'withdrawals' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('withdrawals')}
        >
          Pending Withdrawals ({pendingWithdrawals.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Pending Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="earnings-tab">
            {pendingEarnings.length === 0 ? (
              <div className="empty-state">
                <p>✅ No pending earnings to approve</p>
              </div>
            ) : (
              <div className="earnings-grid">
                {pendingEarnings.map((earning) => {
                  const typeInfo = getEarningTypeLabel(earning.type);
                  return (
                    <div key={earning.id} className="earning-card">
                      <div className="earning-header">
                        <span className="earning-icon">{typeInfo.icon}</span>
                        <div className="earning-title">
                          <h3>{typeInfo.label}</h3>
                          <p className="earning-description">{typeInfo.description}</p>
                        </div>
                        <div className="earning-amount">
                          {formatCurrency(earning.amount)}
                        </div>
                      </div>

                      <div className="earning-details">
                        <div className="detail-row">
                          <span className="label">Agent:</span>
                          <span className="value">{earning.agentName}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Vendor:</span>
                          <span className="value">{earning.vendorName}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Date:</span>
                          <span className="value">{formatDate(earning.createdAt)}</span>
                        </div>
                      </div>

                      <div className="earning-actions">
                        <button
                          className="btn-approve"
                          onClick={() => handleApproveEarning(earning.id)}
                          disabled={processing[earning.id]}
                        >
                          {processing[earning.id] ? 'Processing...' : '✅ Approve Earning'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pending Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="withdrawals-tab">
            {pendingWithdrawals.length === 0 ? (
              <div className="empty-state">
                <p>✅ No pending withdrawals to process</p>
              </div>
            ) : (
              <div className="withdrawals-grid">
                {pendingWithdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="withdrawal-card">
                    <div className="withdrawal-header">
                      <span className="withdrawal-icon">💳</span>
                      <div className="withdrawal-title">
                        <h3>Withdrawal Request</h3>
                        <p className="withdrawal-date">{formatDate(withdrawal.createdAt)}</p>
                      </div>
                      <div className="withdrawal-amount">
                        {formatCurrency(withdrawal.amount)}
                      </div>
                    </div>

                    <div className="withdrawal-details">
                      <div className="detail-section">
                        <h4>Agent Details</h4>
                        <div className="detail-row">
                          <span className="label">Name:</span>
                          <span className="value">{withdrawal.agentName}</span>
                        </div>
                      </div>

                      <div className="detail-section">
                        <h4>Bank Details</h4>
                        <div className="detail-row">
                          <span className="label">Bank:</span>
                          <span className="value">{withdrawal.bankName}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Account:</span>
                          <span className="value">{withdrawal.accountNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div className="withdrawal-actions">
                      <button
                        className="btn-pay"
                        onClick={() => handleMarkPaid(withdrawal.id)}
                        disabled={processing[withdrawal.id]}
                      >
                        {processing[withdrawal.id] ? 'Processing...' : '✅ Mark as Paid'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEarningsPanel;
