/**
 * Admin Agent Panel Component
 * Allows admins to approve earnings and process withdrawals
 */

import React, { useState, useEffect } from 'react';
import {
  getPendingEarnings,
  getPendingWithdrawals,
  approveEarning,
  markWithdrawalPaid
} from '../services/agentEarningsService';
import './AdminAgentPanel.css';

const AdminAgentPanel = () => {
  const [pendingEarnings, setPendingEarnings] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('earnings');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
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
      console.error('Error loading pending items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEarning = async (earningId) => {
    if (!confirm('Are you sure you want to approve this earning?')) {
      return;
    }

    try {
      setProcessing(earningId);
      await approveEarning(earningId);
      alert('Earning approved successfully!');
      // Reload data
      loadPendingItems();
    } catch (err) {
      alert('Error approving earning: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkWithdrawalPaid = async (withdrawalId) => {
    const reference = prompt('Enter payment reference (optional):');
    if (reference === null) return; // User cancelled

    if (!confirm('Confirm that payment has been sent?')) {
      return;
    }

    try {
      setProcessing(withdrawalId);
      await markWithdrawalPaid(withdrawalId, reference || null);
      alert('Withdrawal marked as paid!');
      // Reload data
      loadPendingItems();
    } catch (err) {
      alert('Error marking withdrawal as paid: ' + err.message);
    } finally {
      setProcessing(null);
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
    return type === 'registration' ? 'Vendor Registration' : 'Vendor Activation';
  };

  if (loading) {
    return (
      <div className="admin-panel loading">
        <div className="spinner"></div>
        <p>Loading pending items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel error">
        <h3>Error loading admin panel</h3>
        <p>{error}</p>
        <button onClick={loadPendingItems}>Retry</button>
      </div>
    );
  }

  return (
    <div className="admin-agent-panel">
      {/* Header */}
      <div className="panel-header">
        <h1>Agent Earnings Admin Panel</h1>
        <button className="btn-refresh" onClick={loadPendingItems}>
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card earnings">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <p className="card-count">{pendingEarnings.length}</p>
            <p className="card-label">Pending Earnings</p>
            <p className="card-amount">
              {formatCurrency(
                pendingEarnings.reduce((sum, e) => sum + e.amount, 0)
              )}
            </p>
          </div>
        </div>

        <div className="summary-card withdrawals">
          <div className="card-icon">💸</div>
          <div className="card-content">
            <p className="card-count">{pendingWithdrawals.length}</p>
            <p className="card-label">Pending Withdrawals</p>
            <p className="card-amount">
              {formatCurrency(
                pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0)
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
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
            <h2>Pending Earnings Approvals</h2>
            {pendingEarnings.length === 0 ? (
              <div className="empty-state">
                <p>✅ No pending earnings to approve</p>
              </div>
            ) : (
              <div className="items-grid">
                {pendingEarnings.map((earning) => (
                  <div key={earning.id} className="approval-card">
                    <div className="card-header">
                      <span className="earning-type">
                        {getEarningTypeLabel(earning.type)}
                      </span>
                      <span className="earning-amount">
                        {formatCurrency(earning.amount)}
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="info-row">
                        <span className="label">Agent:</span>
                        <span className="value">{earning.agentName}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Vendor:</span>
                        <span className="value">{earning.vendorName}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Vendor ID:</span>
                        <span className="value code">{earning.vendorId}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Agent ID:</span>
                        <span className="value code">{earning.agentId}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Created:</span>
                        <span className="value">{formatDate(earning.createdAt)}</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <button
                        className="btn-approve"
                        onClick={() => handleApproveEarning(earning.id)}
                        disabled={processing === earning.id}
                      >
                        {processing === earning.id ? 'Processing...' : '✅ Approve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="withdrawals-tab">
            <h2>Pending Withdrawal Requests</h2>
            {pendingWithdrawals.length === 0 ? (
              <div className="empty-state">
                <p>✅ No pending withdrawals to process</p>
              </div>
            ) : (
              <div className="items-grid">
                {pendingWithdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="approval-card">
                    <div className="card-header">
                      <span className="withdrawal-label">Withdrawal Request</span>
                      <span className="withdrawal-amount">
                        {formatCurrency(withdrawal.amount)}
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="info-row">
                        <span className="label">Agent:</span>
                        <span className="value">{withdrawal.agentName}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Agent ID:</span>
                        <span className="value code">{withdrawal.agentId}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Bank:</span>
                        <span className="value">{withdrawal.bankName}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Account Number:</span>
                        <span className="value code">{withdrawal.accountNumber}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Requested:</span>
                        <span className="value">{formatDate(withdrawal.createdAt)}</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <button
                        className="btn-pay"
                        onClick={() => handleMarkWithdrawalPaid(withdrawal.id)}
                        disabled={processing === withdrawal.id}
                      >
                        {processing === withdrawal.id ? 'Processing...' : '💰 Mark as Paid'}
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

export default AdminAgentPanel;
