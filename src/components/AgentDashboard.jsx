/**
 * Agent Dashboard Component
 * Displays agent earnings, balances, and withdrawal options
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAgent,
  getAgentEarnings,
  getAgentWithdrawals,
  requestWithdrawal,
  updateAgentBank
} from '../services/agentEarningsService';
import './AgentDashboard.css';

const AgentDashboard = ({ agentId: propAgentId }) => {
  const navigate = useNavigate();
  // Get agentId from URL params, props, or localStorage session
  const { agentId: urlAgentId } = useParams();
  const agentId = urlAgentId || propAgentId || localStorage.getItem('agentId');

  const handleLogout = () => {
    localStorage.removeItem('agentId');
    localStorage.removeItem('agentName');
    navigate('/agent/login');
  };

  const [copiedField, setCopiedField] = useState(null);
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
    } catch (err) {
      toast.error('Could not copy — please copy manually');
    }
  };
  
  const [agent, setAgent] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Withdrawal form
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalError, setWithdrawalError] = useState('');
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);

  // Bank details form
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [editingBank, setEditingBank] = useState(false);

  useEffect(() => {
    if (agentId) {
      loadAgentData();
    }
  }, [agentId]);

  const loadAgentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [agentData, earningsData, withdrawalsData] = await Promise.all([
        getAgent(agentId),
        getAgentEarnings(agentId),
        getAgentWithdrawals(agentId)
      ]);

      setAgent(agentData.agent);
      setEarnings(earningsData.earnings || []);
      setWithdrawals(withdrawalsData.withdrawals || []);

      // Set bank details for form
      if (agentData.agent.bankName) setBankName(agentData.agent.bankName);
      if (agentData.agent.accountNumber) setAccountNumber(agentData.agent.accountNumber);

    } catch (err) {
      console.error('Error loading agent data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    setWithdrawalError('');
    setWithdrawalSuccess(false);

    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount < 5000) {
      setWithdrawalError('Minimum withdrawal is ₦5,000');
      return;
    }

    if (amount > agent.availableBalance) {
      setWithdrawalError('Insufficient balance');
      return;
    }

    try {
      const result = await requestWithdrawal(agentId, amount);
      if (result.success) {
        setWithdrawalSuccess(true);
        setWithdrawalAmount('');
        // Reload data
        loadAgentData();
      }
    } catch (err) {
      setWithdrawalError(err.message);
    }
  };

  const handleUpdateBank = async (e) => {
    e.preventDefault();
    try {
      const result = await updateAgentBank(agentId, bankName, accountNumber);
      if (result.success) {
        setEditingBank(false);
        loadAgentData();
        alert('Bank details updated successfully');
      }
    } catch (err) {
      alert('Error updating bank details: ' + err.message);
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

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pending', className: 'status-pending' },
      approved: { label: 'Approved', className: 'status-approved' },
      paid: { label: 'Paid', className: 'status-paid' }
    };
    return badges[status] || { label: status, className: 'status-default' };
  };

  if (loading) {
    return (
      <div className="agent-dashboard loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agent-dashboard error">
        <h3>Error loading dashboard</h3>
        <p>{error}</p>
        <button onClick={loadAgentData}>Retry</button>
      </div>
    );
  }

  if (!agentId) {
    return (
      <div className="agent-dashboard error">
        <h3>Not logged in</h3>
        <p>Please log in to access your dashboard.</p>
        <Link to="/agent/login" className="btn-primary" style={{ display: 'inline-block', marginTop: '12px' }}>
          Go to Login
        </Link>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="agent-dashboard error">
        <h3>Agent not found</h3>
        <p>No agent found with ID: {agentId}</p>
        <button onClick={handleLogout} className="btn-secondary" style={{ marginTop: '12px' }}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Agent Dashboard</h1>
          <p className="agent-name">Welcome, {agent.name}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Logout
        </button>
      </div>

      {agent.agentCode && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <p style={{ fontWeight: 600, marginBottom: 4, color: '#991b1b' }}>Your Agent Code</p>
          <p style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 10 }}>
            Give this to vendors when signing them up manually — it's short and typo-proof (no confusing letters/numbers).
          </p>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
            <code style={{
              flex: 1,
              display: 'block',
              background: '#fff',
              padding: '12px',
              borderRadius: '8px',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '1px',
              textAlign: 'center',
              color: '#dc2626',
              border: '1px solid #fca5a5',
            }}>
              {agent.agentCode}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(agent.agentCode, 'code')}
              title="Copy Agent Code"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                background: copiedField === 'code' ? '#16a34a' : '#fff',
                color: copiedField === 'code' ? '#fff' : '#dc2626',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {copiedField === 'code' ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      )}

      <div style={{
        background: '#fff7ed',
        border: '1px solid #fed7aa',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <p style={{ fontWeight: 600, marginBottom: 8, color: '#9a3412' }}>Vendor signup link</p>
        <p style={{ fontSize: 13, color: '#7c2d12', marginBottom: 8 }}>
          Share this with vendors you onboard — your Agent ID is attached automatically:
        </p>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 8 }}>
          <code style={{
            flex: 1,
            display: 'block',
            background: '#fff',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: 12,
            wordBreak: 'break-all',
            border: '1px solid #fdba74',
          }}>
            {typeof window !== 'undefined' ? `${window.location.origin}/vendor/register?agent=${agentId}` : `/vendor/register?agent=${agentId}`}
          </code>
          <button
            type="button"
            onClick={() => copyToClipboard(
              typeof window !== 'undefined' ? `${window.location.origin}/vendor/register?agent=${agentId}` : `/vendor/register?agent=${agentId}`,
              'link'
            )}
            title="Copy referral link"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #fdba74',
              background: copiedField === 'link' ? '#16a34a' : '#fff',
              color: copiedField === 'link' ? '#fff' : '#9a3412',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {copiedField === 'link' ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#9a3412', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          Agent ID: <strong style={{ fontFamily: 'monospace' }}>{agentId}</strong>
          <button
            type="button"
            onClick={() => copyToClipboard(agentId, 'id')}
            title="Copy Agent ID"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #fdba74',
              background: copiedField === 'id' ? '#16a34a' : '#fff',
              color: copiedField === 'id' ? '#fff' : '#9a3412',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              gap: 4,
            }}
          >
            {copiedField === 'id' ? <Check size={12} /> : <Copy size={12} />}
            {copiedField === 'id' ? 'Copied' : 'Copy'}
          </button>
        </p>
      </div>

      {/* Balance Cards */}
      <div className="balance-cards">
        <div className="balance-card total">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <p className="card-label">Total Earnings</p>
            <p className="card-amount">{formatCurrency(agent.totalEarnings || 0)}</p>
          </div>
        </div>

        <div className="balance-card available">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <p className="card-label">Available Balance</p>
            <p className="card-amount">{formatCurrency(agent.availableBalance || 0)}</p>
            <p className="card-hint">Ready to withdraw</p>
          </div>
        </div>

        <div className="balance-card pending">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <p className="card-label">Pending Balance</p>
            <p className="card-amount">{formatCurrency(agent.pendingBalance || 0)}</p>
            <p className="card-hint">Awaiting approval</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'earnings' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('earnings')}
        >
          Earnings History
        </button>
        <button
          className={activeTab === 'withdrawals' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('withdrawals')}
        >
          Withdrawals
        </button>
        <button
          className={activeTab === 'settings' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="withdrawal-section">
              <h2>Request Withdrawal</h2>
              <p className="withdrawal-info">
                Minimum withdrawal: ₦5,000 • Available: {formatCurrency(agent.availableBalance || 0)}
              </p>

              {!agent.bankName || !agent.accountNumber ? (
                <div className="alert warning">
                  <p>⚠️ Please add your bank details in Settings before requesting withdrawal</p>
                </div>
              ) : (
                <form onSubmit={handleWithdrawal} className="withdrawal-form">
                  <div className="form-group">
                    <label>Amount (₦)</label>
                    <input
                      type="number"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      placeholder="5000"
                      min="5000"
                      step="100"
                      required
                    />
                  </div>

                  {withdrawalError && (
                    <div className="alert error">{withdrawalError}</div>
                  )}

                  {withdrawalSuccess && (
                    <div className="alert success">
                      ✅ Withdrawal request submitted successfully!
                    </div>
                  )}

                  <button type="submit" className="btn-primary">
                    Withdraw Funds
                  </button>
                </form>
              )}
            </div>

            <div className="recent-activity">
              <h2>Recent Activity</h2>
              {earnings.length === 0 && withdrawals.length === 0 ? (
                <p className="empty-state">No activity yet</p>
              ) : (
                <div className="activity-list">
                  {[...earnings.slice(0, 5), ...withdrawals.slice(0, 5)]
                    .sort((a, b) => {
                      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
                      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
                      return dateB - dateA;
                    })
                    .slice(0, 10)
                    .map((item, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-icon">
                          {item.type ? '💵' : '💸'}
                        </div>
                        <div className="activity-details">
                          <p className="activity-title">
                            {item.type ? getEarningTypeLabel(item.type) : 'Withdrawal'}
                          </p>
                          <p className="activity-date">{formatDate(item.createdAt)}</p>
                        </div>
                        <div className="activity-amount">
                          <span className={item.type ? 'positive' : 'negative'}>
                            {item.type ? '+' : '-'}{formatCurrency(item.amount)}
                          </span>
                          <span className={`status-badge ${getStatusBadge(item.status).className}`}>
                            {getStatusBadge(item.status).label}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="earnings-tab">
            <h2>Earnings History</h2>
            {earnings.length === 0 ? (
              <p className="empty-state">No earnings yet</p>
            ) : (
              <div className="table-container">
                <table className="earnings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((earning) => {
                      const badge = getStatusBadge(earning.status);
                      return (
                        <tr key={earning.id}>
                          <td>{formatDate(earning.createdAt)}</td>
                          <td>{getEarningTypeLabel(earning.type)}</td>
                          <td className="amount-cell">+{formatCurrency(earning.amount)}</td>
                          <td>
                            <span className={`status-badge ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="withdrawals-tab">
            <h2>Withdrawals History</h2>
            {withdrawals.length === 0 ? (
              <p className="empty-state">No withdrawals yet</p>
            ) : (
              <div className="table-container">
                <table className="withdrawals-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Bank Details</th>
                      <th>Status</th>
                      <th>Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal) => {
                      const badge = getStatusBadge(withdrawal.status);
                      return (
                        <tr key={withdrawal.id}>
                          <td>{formatDate(withdrawal.createdAt)}</td>
                          <td className="amount-cell">-{formatCurrency(withdrawal.amount)}</td>
                          <td>
                            {withdrawal.bankName}<br />
                            <small>{withdrawal.accountNumber}</small>
                          </td>
                          <td>
                            <span className={`status-badge ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td>{withdrawal.paidAt ? formatDate(withdrawal.paidAt) : 'Pending'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h2>Bank Details</h2>
            <p className="settings-info">
              Add or update your bank account details for withdrawals
            </p>

            {!editingBank && (agent.bankName || agent.accountNumber) ? (
              <div className="bank-details-display">
                <p><strong>Bank Name:</strong> {agent.bankName || 'Not set'}</p>
                <p><strong>Account Number:</strong> {agent.accountNumber || 'Not set'}</p>
                <button
                  className="btn-secondary"
                  onClick={() => setEditingBank(true)}
                >
                  Edit Bank Details
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateBank} className="bank-form">
                <div className="form-group">
                  <label>Bank Name</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                  >
                    <option value="">Select Bank</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="GTBank">GTBank</option>
                    <option value="First Bank">First Bank</option>
                    <option value="UBA">UBA</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                    <option value="Kuda Bank">Kuda Bank</option>
                    <option value="Opay">Opay</option>
                    <option value="PalmPay">PalmPay</option>
                    <option value="Moniepoint">Moniepoint</option>
                    <option value="Wema Bank">Wema Bank</option>
                    <option value="Sterling Bank">Sterling Bank</option>
                    <option value="Polaris Bank">Polaris Bank</option>
                    <option value="Stanbic IBTC">Stanbic IBTC</option>
                    <option value="Union Bank">Union Bank</option>
                    <option value="Fidelity Bank">Fidelity Bank</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="0123456789"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    Save Bank Details
                  </button>
                  {editingBank && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setEditingBank(false)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="agent-info-section">
              <h3>Agent Information</h3>
              <p><strong>Name:</strong> {agent.name}</p>
              <p><strong>Phone:</strong> {agent.phone}</p>
              <p><strong>Email:</strong> {agent.email || 'Not set'}</p>
              <p><strong>Member since:</strong> {formatDate(agent.createdAt)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
