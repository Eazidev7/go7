import React, { useState } from 'react';
import DeliverySheet from '../components/DeliverySheet.jsx';
import { Helmet } from 'react-helmet-async';

const DeliverySheetDemo = () => {
  const [currentDemo, setCurrentDemo] = useState('enroute');
  const [mapZoom, setMapZoom] = useState('normal');

  // Demo scenarios
  const demoScenarios = {
    enroute: {
      delivery: {
        id: 'DEMO_001',
        status: 'enroute',
        eta: '12 min',
        pickupAddress: 'Chowdeck Kitchen, Victoria Island',
        dropoffAddress: '15 Admiralty Way, Lekki Phase 1',
        orderItems: [
          { name: 'Jollof Rice & Chicken', quantity: 2, price: '4,500' },
          { name: 'Plantain', quantity: 1, price: '800' },
          { name: 'Coke 35cl', quantity: 2, price: '600' }
        ]
      },
      rider: {
        name: 'Adebayo Michael',
        phone: '+234 801 234 5678',
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=56&h=56&fit=crop&crop=face',
        rating: '4.9',
        deliveries: '247'
      }
    },
    
    preparing: {
      delivery: {
        id: 'DEMO_002',
        status: 'preparing',
        eta: '25 min',
        pickupAddress: 'Mama Cass, Ikeja',
        dropoffAddress: '45 Allen Avenue, Ikeja',
        orderItems: [
          { name: 'Pepper Soup (Catfish)', quantity: 1, price: '3,200' },
          { name: 'White Rice', quantity: 1, price: '1,500' },
          { name: 'Malt', quantity: 1, price: '500' }
        ]
      },
      rider: null
    },
    
    delivered: {
      delivery: {
        id: 'DEMO_003',
        status: 'delivered',
        eta: 'Delivered',
        pickupAddress: 'KFC Surulere',
        dropoffAddress: '12 Bode Thomas Street, Surulere',
        orderItems: [
          { name: 'Zinger Burger Meal', quantity: 1, price: '2,800' },
          { name: 'Hot Wings (6 pieces)', quantity: 1, price: '1,200' },
          { name: 'Coleslaw', quantity: 1, price: '600' }
        ]
      },
      rider: {
        name: 'Fatima Ibrahim',
        phone: '+234 802 987 6543',
        photoURL: 'https://images.unsplash.com/photo-1494790108755-2616b332c886?w=56&h=56&fit=crop&crop=face',
        rating: '4.8',
        deliveries: '189'
      }
    }
  };

  const handleMapZoomChange = (sheetState) => {
    setMapZoom(sheetState);
    console.log('🗺️ Map would zoom for sheet state:', sheetState);
  };

  const currentScenario = demoScenarios[currentDemo];

  return (
    <>
      <Helmet>
        <title>DeliverySheet Demo | GO7</title>
        <meta name="description" content="Interactive demo of GO7's modern bottom sheet component" />
      </Helmet>

      <div style={{ 
        position: 'relative',
        height: '100vh', 
        width: '100vw',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        {/* Demo Controls */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          zIndex: 1001,
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setCurrentDemo('preparing')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: currentDemo === 'preparing' ? '#ffffff' : 'rgba(255,255,255,0.2)',
              color: currentDemo === 'preparing' ? '#333' : '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📋 Preparing
          </button>
          
          <button
            onClick={() => setCurrentDemo('enroute')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: currentDemo === 'enroute' ? '#ffffff' : 'rgba(255,255,255,0.2)',
              color: currentDemo === 'enroute' ? '#333' : '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🏍️ En Route
          </button>
          
          <button
            onClick={() => setCurrentDemo('delivered')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: currentDemo === 'delivered' ? '#ffffff' : 'rgba(255,255,255,0.2)',
              color: currentDemo === 'delivered' ? '#333' : '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🎉 Delivered
          </button>
        </div>

        {/* Demo Title */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          zIndex: 1
        }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: '700',
            margin: '0 0 16px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            DeliverySheet
          </h1>
          <p style={{ 
            fontSize: '18px', 
            opacity: 0.9,
            margin: '0',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            Modern Uber-style bottom sheet component
          </p>
          <div style={{
            marginTop: '24px',
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '25px',
            display: 'inline-block',
            backdropFilter: 'blur(10px)',
            fontSize: '14px'
          }}>
            Map Zoom: <strong>{mapZoom}</strong>
          </div>
        </div>

        {/* Demo Instructions */}
        <div style={{
          position: 'absolute',
          bottom: '200px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          color: 'white',
          zIndex: 1,
          background: 'rgba(0,0,0,0.3)',
          padding: '16px 24px',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>
            👆 Drag the sheet up/down • 📱 Try different scenarios • 🖱️ Click handle to toggle
          </p>
        </div>

        {/* DeliverySheet Component */}
        <DeliverySheet 
          delivery={currentScenario.delivery}
          rider={currentScenario.rider}
          onMapZoomChange={handleMapZoomChange}
        />
      </div>
    </>
  );
};

export default DeliverySheetDemo;