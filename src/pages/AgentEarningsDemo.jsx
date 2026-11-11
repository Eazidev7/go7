/**
 * Agent Earnings Demo/Test Page
 * Test the complete agent earnings system
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AgentDashboard from '../components/AgentDashboard';
import AdminEarningsPanel from '../components/AdminEarningsPanel';
import { createAgent, createVendor } from '../services/agentEarningsService';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import './AgentEarningsDemo.css';

const AgentEarningsDemo = () => {
  const [view, setView] = useState('menu'); // 'menu', 'agent', 'admin', 'test'
  const [testAgentId, setTestAgentId] = useState('');
  const [testVendorId, setTestVendorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, { time: timestamp, message, type }]);
  };

  // Create test agent
  const handleCreateTestAgent = async () => {
    setLoading(true);
    try {
      const result = await createAgent({
        name: 'Test Agent ' + Math.random().toString(36).substr(2, 5),
        phone: '0801' + Math.floor(1000000 + Math.random() * 9000000),
        email: `test${Date.now()}@example.com`,
        bankName: 'Test Bank',
        accountNumber: '0123456789'
      });

      setTestAgentId(result.agentId);
      addLog(`✅ Agent created: ${result.agentId}`, 'success');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create test vendor
  const handleCreateTestVendor = async () => {
    if (!testAgentId) {
      addLog('❌ Create an agent first!', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await createVendor({
        name: 'Test Vendor ' + Math.random().toString(36).substr(2, 5),
        location: 'Abeokuta, Ogun State',
        agentId: testAgentId,
        isLive: false
      });

      setTestVendorId(result.vendorId);
      addLog(`✅ Vendor created: ${result.vendorId}`, 'success');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mark vendor as live (triggers ₦3,000 earning)
  const handleMarkVendorLive = async () => {
    if (!testVendorId) {
      addLog('❌ Create a vendor first!', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'vendors', testVendorId), {
        isLive: true
      });

      addLog('✅ Vendor marked as LIVE! Check agent dashboard for ₦3,000 pending earning', 'success');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mark vendor has first order (triggers ₦1,500 earning)
  const handleMarkFirstOrder = async () => {
    if (!testVendorId) {
      addLog('❌ Create a vendor first!', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'vendors', testVendorId), {
        hasFirstOrder: true
      });

      addLog('✅ Vendor received first order! Check agent dashboard for ₦1,500 pending earning', 'success');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-earnings-demo">
      {/* Navigation */}
      <div className="demo-nav">
        <button 
          className={view === 'menu' ? 'active' : ''} 
          onClick={() => setView('menu')}
        >
          🏠 Menu
        </button>
        <button 
          className={view === 'agent' ? 'active' : ''} 
          onClick={() => setView('agent')}
          disabled={!testAgentId}
        >
          👤 Agent Dashboard
        </button>
        <button 
          className={view === 'admin' ? 'active' : ''} 
          onClick={() => setView('admin')}
        >
          👑 Admin Panel
        </button>
        <button 
          className={view === 'test' ? 'active' : ''} 
          onClick={() => setView('test')}
        >
          🧪 Test Controls
        </button>
      </div>

      {/* Content */}
      <div className="demo-content">
        {view === 'menu' && (
          <div className="menu-view">
            <h1>🎯 Agent Earnings System Demo</h1>
            <p className="subtitle">Complete agent onboarding and earnings management</p>

            <div className="info-cards">
              <div className="info-card">
                <h3>💰 How It Works</h3>
                <ol>
                  <li>Agents sign up vendors to the platform</li>
                  <li>When vendor goes <strong>live</strong> → Agent earns <strong>₦3,000</strong></li>
                  <li>When vendor gets <strong>first order</strong> → Agent earns <strong>₦1,500</strong></li>
                  <li>Admin approves earnings</li>
                  <li>Agent can withdraw (min ₦5,000)</li>
                </ol>
              </div>

              <div className="info-card">
                <h3>🧪 Test Scenario</h3>
                <ol>
                  <li>Go to <strong>Test Controls</strong> tab</li>
                  <li>Create a test agent</li>
                  <li>Create a test vendor</li>
                  <li>Mark vendor as live (triggering ₦3,000 earning)</li>
                  <li>View <strong>Agent Dashboard</strong> to see pending balance</li>
                  <li>View <strong>Admin Panel</strong> to approve earning</li>
                  <li>Request withdrawal from agent dashboard</li>
                </ol>
              </div>

              <div className="info-card">
                <h3>📊 Features</h3>
                <ul>
                  <li>✅ Auto-triggered earnings on vendor milestones</li>
                  <li>✅ Admin approval workflow</li>
                  <li>✅ Withdrawal management</li>
                  <li>✅ Balance tracking (Total, Available, Pending)</li>
                  <li>✅ Transaction history</li>
                  <li>✅ Bank account management</li>
                </ul>
              </div>
            </div>

            <div className="quick-start">
              <h3>🚀 Get Started</h3>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/agent/login">
                  <button className="btn-primary">
                    Login as Agent
                  </button>
                </Link>
                <Link to="/agent/signup">
                  <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    Sign Up as Agent
                  </button>
                </Link>
                <button 
                  className="btn-primary"
                  onClick={() => setView('test')}
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                >
                  Test Demo →
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'agent' && testAgentId && (
          <div className="agent-view">
            <AgentDashboard agentId={testAgentId} />
          </div>
        )}

        {view === 'admin' && (
          <div className="admin-view">
            <AdminEarningsPanel />
          </div>
        )}

        {view === 'test' && (
          <div className="test-view">
            <h2>🧪 Test Controls</h2>
            
            <div className="test-section">
              <h3>Step 1: Create Test Agent</h3>
              <button 
                onClick={handleCreateTestAgent}
                disabled={loading || testAgentId}
                className="btn-test"
              >
                {testAgentId ? '✅ Agent Created' : 'Create Test Agent'}
              </button>
              {testAgentId && (
                <div className="test-result">
                  <p>Agent ID: <code>{testAgentId}</code></p>
                  <button 
                    onClick={() => setView('agent')}
                    className="btn-secondary"
                  >
                    View Agent Dashboard →
                  </button>
                </div>
              )}
            </div>

            <div className="test-section">
              <h3>Step 2: Create Test Vendor</h3>
              <button 
                onClick={handleCreateTestVendor}
                disabled={loading || !testAgentId || testVendorId}
                className="btn-test"
              >
                {testVendorId ? '✅ Vendor Created' : 'Create Test Vendor'}
              </button>
              {testVendorId && (
                <div className="test-result">
                  <p>Vendor ID: <code>{testVendorId}</code></p>
                </div>
              )}
            </div>

            <div className="test-section">
              <h3>Step 3: Trigger Earnings</h3>
              <div className="button-group">
                <button 
                  onClick={handleMarkVendorLive}
                  disabled={loading || !testVendorId}
                  className="btn-success"
                >
                  🚀 Mark Vendor Live (₦3,000)
                </button>
                <button 
                  onClick={handleMarkFirstOrder}
                  disabled={loading || !testVendorId}
                  className="btn-success"
                >
                  🎉 Mark First Order (₦1,500)
                </button>
              </div>
            </div>

            <div className="test-section">
              <h3>Step 4: Test Admin Panel</h3>
              <button 
                onClick={() => setView('admin')}
                className="btn-admin"
              >
                Open Admin Panel →
              </button>
              <p className="help-text">
                Approve pending earnings and process withdrawals
              </p>
            </div>

            {/* Log Console */}
            <div className="log-console">
              <h3>📋 Action Log</h3>
              <div className="log-entries">
                {log.length === 0 ? (
                  <p className="empty">No actions yet. Start by creating a test agent.</p>
                ) : (
                  log.map((entry, index) => (
                    <div key={index} className={`log-entry ${entry.type}`}>
                      <span className="log-time">{entry.time}</span>
                      <span className="log-message">{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentEarningsDemo;
