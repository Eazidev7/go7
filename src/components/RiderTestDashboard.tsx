'use client';

import React, { useState } from 'react';
import { setupCompleteRiderTestEnvironment, SAMPLE_RIDERS, SAMPLE_RIDER_ORDERS } from '../utils/rider-test-data';
import { simulateRiderJourney, updateRiderGPS, updateRiderStatus } from '../utils/rider-utils';
import { serverTimestamp } from 'firebase/firestore';

// TypeScript interface for test status
interface TestStatus {
  isRunning: boolean;
  message: string;
  type: 'info' | 'success' | 'error';
}

const RiderTestDashboard: React.FC = () => {
  const [testStatus, setTestStatus] = useState<TestStatus>({
    isRunning: false,
    message: 'Ready to test rider functionality',
    type: 'info'
  });

  // Update test status with visual feedback
  const updateStatus = (message: string, type: TestStatus['type'] = 'info', isRunning = false) => {
    setTestStatus({ message, type, isRunning });
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  // Setup complete test environment
  const handleSetupTestEnvironment = async () => {
    updateStatus('Setting up complete rider test environment...', 'info', true);
    
    try {
      await setupCompleteRiderTestEnvironment();
      updateStatus('✅ Complete rider test environment setup successfully!', 'success');
    } catch (error) {
      updateStatus(`❌ Error setting up test environment: ${error}`, 'error');
    }
  };

  // Simulate GPS tracking for a specific rider
  const handleSimulateGPS = async (riderId: string) => {
    updateStatus(`Starting GPS simulation for rider ${riderId}...`, 'info', true);
    
    try {
      const startCoords: [number, number] = [3.3619, 7.1475]; // Central Abeokuta
      const endCoords: [number, number] = [3.3700, 7.1530]; // Delivery location
      const orderId = SAMPLE_RIDER_ORDERS.find(o => o.riderId === riderId)?.orderId || 'GO-001';
      
      await simulateRiderJourney(riderId, startCoords, endCoords, orderId, 10);
      updateStatus(`✅ GPS simulation completed for rider ${riderId}`, 'success');
    } catch (error) {
      updateStatus(`❌ GPS simulation failed for rider ${riderId}: ${error}`, 'error');
    }
  };

  // Update rider status
  const handleUpdateRiderStatus = async (riderId: string, status: 'active' | 'inactive' | 'busy') => {
    updateStatus(`Updating rider ${riderId} status to ${status}...`, 'info', true);
    
    try {
      await updateRiderStatus(riderId, status);
      updateStatus(`✅ Rider ${riderId} status updated to ${status}`, 'success');
    } catch (error) {
      updateStatus(`❌ Failed to update rider status: ${error}`, 'error');
    }
  };

  // Send test GPS location
  const handleSendTestGPS = async (riderId: string) => {
    updateStatus(`Sending test GPS location for rider ${riderId}...`, 'info', true);
    
    try {
      // Random location in Abeokuta area
      const lat = 7.1475 + (Math.random() - 0.5) * 0.01;
      const lng = 3.3619 + (Math.random() - 0.5) * 0.01;
      
      await updateRiderGPS(riderId, {
        lat,
        lng,
        status: 'en_route',
        timestamp: serverTimestamp(),
        currentOrderId: 'GO-001',
        speed: Math.random() * 40 + 10,
        heading: Math.random() * 360
      });
      
      updateStatus(`✅ Test GPS location sent for rider ${riderId}`, 'success');
    } catch (error) {
      updateStatus(`❌ Failed to send GPS location: ${error}`, 'error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '20px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }}>
      {/* Set document title */}
      {typeof document !== 'undefined' && (document.title = 'Rider Test Dashboard - Go7')}

      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '30px',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#E30613',
          margin: '0 0 10px 0'
        }}>
          🛵 Go7 Rider Test Dashboard
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666',
          margin: 0
        }}>
          Comprehensive testing interface for the rider-facing Go7 delivery app
        </p>
      </div>

      {/* Status Display */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '30px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          {testStatus.isRunning && (
            <div style={{
              width: '20px',
              height: '20px',
              border: '3px solid #E30613',
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          
          <div style={{
            fontSize: '16px',
            color: testStatus.type === 'error' ? '#dc2626' : 
                   testStatus.type === 'success' ? '#059669' : '#374151',
            fontWeight: testStatus.type !== 'info' ? '600' : 'normal'
          }}>
            {testStatus.message}
          </div>
        </div>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* Main Test Controls */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Environment Setup */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '25px',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: '0 0 15px 0'
          }}>
            🚀 Environment Setup
          </h2>
          
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '20px',
            lineHeight: '1.5'
          }}>
            Initialize the complete rider test environment with sample riders, orders, and chat data.
          </p>
          
          <button
            onClick={handleSetupTestEnvironment}
            disabled={testStatus.isRunning}
            style={{
              width: '100%',
              padding: '12px 20px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              background: testStatus.isRunning ? '#9ca3af' : '#E30613',
              border: 'none',
              borderRadius: '8px',
              cursor: testStatus.isRunning ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {testStatus.isRunning ? 'Setting Up...' : 'Setup Test Environment'}
          </button>
        </div>

        {/* Quick Links */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '25px',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: '0 0 15px 0'
          }}>
            🔗 Quick Test Links
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <a
              href="/rider/login"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 15px',
                background: '#f3f4f6',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              📱 Rider Login
            </a>
            
            <a
              href="/rider/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 15px',
                background: '#f3f4f6',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              📊 Rider Dashboard
            </a>
            
            <a
              href="/rider/order/GO-001"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 15px',
                background: '#f3f4f6',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              📦 Sample Order
            </a>

            <a
              href="/track/GO-001"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 15px',
                background: '#f3f4f6',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              👥 Customer View
            </a>
          </div>
        </div>
      </div>

      {/* Rider Management */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '30px',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#1f2937',
          margin: '0 0 20px 0'
        }}>
          👥 Test Rider Management
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '15px'
        }}>
          {SAMPLE_RIDERS.map((rider) => (
            <div
              key={rider.riderId}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '15px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '10px'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    margin: '0 0 5px 0'
                  }}>
                    {rider.name}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '0 0 5px 0'
                  }}>
                    {rider.riderId} • {rider.phone}
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    margin: 0
                  }}>
                    {rider.vehicle} • ⭐ {rider.rating} • {rider.completedOrders} orders
                  </p>
                </div>
                
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: rider.status === 'active' ? '#059669' : 
                         rider.status === 'busy' ? '#dc2626' : '#6b7280',
                  background: rider.status === 'active' ? '#d1fae5' : 
                             rider.status === 'busy' ? '#fee2e2' : '#f3f4f6'
                }}>
                  {rider.status}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                <button
                  onClick={() => handleSimulateGPS(rider.riderId)}
                  disabled={testStatus.isRunning}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    background: '#f9fafb',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: testStatus.isRunning ? 'not-allowed' : 'pointer'
                  }}
                >
                  📍 GPS Sim
                </button>
                
                <button
                  onClick={() => handleSendTestGPS(rider.riderId)}
                  disabled={testStatus.isRunning}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    background: '#f9fafb',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: testStatus.isRunning ? 'not-allowed' : 'pointer'
                  }}
                >
                  📡 Send GPS
                </button>

                <button
                  onClick={() => handleUpdateRiderStatus(rider.riderId, 'active')}
                  disabled={testStatus.isRunning}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#059669',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    cursor: testStatus.isRunning ? 'not-allowed' : 'pointer'
                  }}
                >
                  ✅ Active
                </button>
                
                <button
                  onClick={() => handleUpdateRiderStatus(rider.riderId, 'busy')}
                  disabled={testStatus.isRunning}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#dc2626',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    cursor: testStatus.isRunning ? 'not-allowed' : 'pointer'
                  }}
                >
                  🚫 Busy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Assignments */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '25px',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#1f2937',
          margin: '0 0 20px 0'
        }}>
          📦 Sample Order Assignments
        </h2>

        <div style={{
          display: 'grid',
          gap: '10px'
        }}>
          {SAMPLE_RIDER_ORDERS.map((assignment) => {
            const rider = SAMPLE_RIDERS.find(r => r.riderId === assignment.riderId);
            
            return (
              <div
                key={assignment.orderId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <strong style={{ color: '#1f2937' }}>
                    Order {assignment.orderId}
                  </strong>
                  <span style={{ color: '#6b7280', marginLeft: '10px' }}>
                    → {rider?.name} ({assignment.riderId})
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: assignment.status === 'delivered' ? '#059669' : '#7c3aed',
                    background: assignment.status === 'delivered' ? '#d1fae5' : '#ede9fe'
                  }}>
                    {assignment.status.replace('_', ' ')}
                  </div>
                  
                  <a
                    href={`/rider/order/${assignment.orderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      background: '#E30613',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    View Order
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RiderTestDashboard;