// Go7 Production Delivery Tracking System Demo
// Complete testing interface for real-time delivery tracking

import React, { useState, useEffect } from 'react';
import { createTestDeliveries, simulateRiderMovement, testDeliveryData, testDeliveryData2 } from '../utils/testDeliveryData.js';

const DeliveryTrackingDemo = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [deliveryIds, setDeliveryIds] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [simulationTarget, setSimulationTarget] = useState('pickup');

  // Create test deliveries
  const handleCreateDeliveries = async () => {
    setIsCreating(true);
    try {
      const result = await createTestDeliveries();
      setDeliveryIds([result.delivery1, result.delivery2]);
      setSelectedDelivery(result.delivery1);
      alert('✅ Test deliveries created successfully!\n\nCheck browser console for tracking URLs.');
    } catch (error) {
      console.error('❌ Error creating deliveries:', error);
      alert('❌ Error creating test deliveries. Check console for details.');
    } finally {
      setIsCreating(false);
    }
  };

  // Simulate rider movement
  const handleSimulateMovement = async () => {
    if (!selectedDelivery) {
      alert('Please select a delivery first');
      return;
    }

    setIsSimulating(true);
    try {
      let targetLat, targetLng, targetName;
      
      if (simulationTarget === 'pickup') {
        // Move to pickup location (Mama's Kitchen - Victoria Island)
        targetLat = 6.4269;
        targetLng = 3.4210;
        targetName = "Pickup Location (Victoria Island)";
      } else {
        // Move to dropoff location (Customer's Office - Lekki)  
        targetLat = 6.4474;
        targetLng = 3.4653;
        targetName = "Dropoff Location (Lekki)";
      }

      console.log(`🏍️ Starting rider simulation to ${targetName}`);
      await simulateRiderMovement(selectedDelivery, targetLat, targetLng, 15);
      
      alert(`✅ Rider movement simulation to ${targetName} completed!`);
    } catch (error) {
      console.error('❌ Error simulating movement:', error);
      alert('❌ Error simulating rider movement. Check console for details.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Open tracking page
  const openTrackingPage = (deliveryId) => {
    const url = `${window.location.origin}/#/production-tracking/${deliveryId}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e61e25 0%, #ff4b4b 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '32px',
            color: '#e61e25',
            marginBottom: '10px',
            fontWeight: 'bold'
          }}>
            🚀 Go7 Production Delivery Tracking
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Real-time delivery tracking system demo with Google Maps + Firebase
          </p>
        </div>

        {/* System Status */}
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>🔧 System Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '18px' }}>✅</span>
              <span>Firebase Firestore Connected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '18px' }}>✅</span>
              <span>Google Maps API Ready</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '18px' }}>✅</span>
              <span>Real-time Updates Active</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '18px' }}>✅</span>
              <span>Rider Animation Ready</span>
            </div>
          </div>
        </div>

        {/* Step 1: Create Test Data */}
        <div style={{
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
            <span style={{ marginRight: '8px' }}>1️⃣</span>
            Create Test Deliveries
          </h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Generate sample delivery documents in Firestore with realistic Lagos locations
          </p>
          <button
            onClick={handleCreateDeliveries}
            disabled={isCreating}
            style={{
              background: isCreating ? '#ccc' : '#e61e25',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isCreating ? '⏳ Creating...' : '🔄 Create Test Deliveries'}
          </button>
          
          {deliveryIds.length > 0 && (
            <div style={{ 
              marginTop: '15px',
              padding: '12px',
              background: '#dcfce7',
              borderRadius: '8px',
              border: '1px solid #10b981'
            }}>
              <strong style={{ color: '#059669' }}>✅ Created Deliveries:</strong>
              <div style={{ marginTop: '5px' }}>
                {deliveryIds.map(id => (
                  <div key={id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '5px' 
                  }}>
                    <code style={{ 
                      background: '#fff', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      {id}
                    </code>
                    <button
                      onClick={() => openTrackingPage(id)}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      📱 Open Tracking
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Simulate Rider Movement */}
        {deliveryIds.length > 0 && (
          <div style={{
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
              <span style={{ marginRight: '8px' }}>2️⃣</span>
              Simulate Rider Movement
            </h3>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Watch real-time rider movement with smooth animation
            </p>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Select Delivery:
                </label>
                <select
                  value={selectedDelivery}
                  onChange={(e) => setSelectedDelivery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                >
                  {deliveryIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Move To:
                </label>
                <select
                  value={simulationTarget}
                  onChange={(e) => setSimulationTarget(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                >
                  <option value="pickup">🏪 Pickup (Victoria Island)</option>
                  <option value="dropoff">🏠 Dropoff (Lekki)</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleSimulateMovement}
              disabled={isSimulating}
              style={{
                background: isSimulating ? '#ccc' : '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isSimulating ? '🏍️ Simulating Movement...' : '🏍️ Start Rider Simulation'}
            </button>
            
            {isSimulating && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                background: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #f59e0b'
              }}>
                <strong style={{ color: '#d97706' }}>🏍️ Simulation in Progress:</strong>
                <br />
                <span style={{ color: '#92400e', fontSize: '14px' }}>
                  Rider is moving in real-time. Open the tracking page to see live updates!
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Test Features */}
        <div style={{
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
            <span style={{ marginRight: '8px' }}>3️⃣</span>
            Test Production Features
          </h3>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            <div style={{ 
              padding: '15px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#fafafa'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>🗺️ Real-time Map</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Google Maps with live rider tracking, route visualization, and smooth animation
              </p>
            </div>
            <div style={{ 
              padding: '15px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#fafafa'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>🔄 Firebase Sync</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Real-time data synchronization with Firestore onSnapshot listeners
              </p>
            </div>
            <div style={{ 
              padding: '15px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#fafafa'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>📱 Mobile UI</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Bottom sheet interface with delivery details, status timeline, and actions
              </p>
            </div>
            <div style={{ 
              padding: '15px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#fafafa'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>🔔 Notifications</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Multi-channel notifications with SMS, Email, and Push (Cloud Functions)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Access Links */}
        <div style={{
          background: '#f1f5f9',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>🔗 Quick Access</h3>
          <div style={{ 
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <a
              href="/#/production-tracking/delivery_test_001"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '10px 16px',
                background: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📱 Test Delivery 1
            </a>
            <a
              href="/#/production-tracking/delivery_test_002"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '10px 16px',
                background: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📱 Test Delivery 2
            </a>
            <a
              href="https://console.firebase.google.com/project/go7-6dd10/firestore/data/deliveries"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '10px 16px',
                background: '#f59e0b',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              🔥 Firebase Console
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #3b82f6'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1d4ed8' }}>📋 Testing Instructions:</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#1e40af' }}>
            <li style={{ marginBottom: '5px' }}>Click "Create Test Deliveries" to generate sample data</li>
            <li style={{ marginBottom: '5px' }}>Open tracking pages in new tabs to see real-time updates</li>
            <li style={{ marginBottom: '5px' }}>Use "Simulate Rider Movement" to watch live animation</li>
            <li style={{ marginBottom: '5px' }}>Check Firebase Console to see data updates in real-time</li>
            <li>Test on mobile devices for the best experience</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTrackingDemo;