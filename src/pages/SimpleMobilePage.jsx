import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BurgerIcon, PizzaIcon, SaladIcon, SushiIcon, MarketIcon, PharmacyIcon, PackageIcon } from '../components/CategoryIcons';

const SimpleMobilePage = () => {
  const navigate = useNavigate();

  const handleNavigation = (navItem) => {
    switch (navItem) {
      case 'Explore':
        navigate('/');
        break;
      case 'Orders':
        navigate('/orders');
        break;
      case 'Track':
        navigate('/track');
        break;
      case 'Chat':
        navigate('/go7-chat');
        break;
      case 'Profile':
        navigate('/profile');
        break;
      default:
        break;
    }
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      color: '#333333'
    }}>
      {/* Test Banner */}
      <div style={{
        backgroundColor: '#E30613',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '18px'
      }}>
        🧪 SIMPLE MOBILE TEST PAGE
      </div>

      {/* Location Header */}
      <div style={{
        padding: '15px',
        backgroundColor: 'white',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '20px' }}>📍</span>
          <span style={{ fontSize: '16px', fontWeight: '500' }}>Abeokuta, NG</span>
        </div>
        <div style={{
          width: '30px',
          height: '30px',
          backgroundColor: '#E30613',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          🔔
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '15px' }}>
        <input
          type="text"
          placeholder="Search Go7..."
          style={{
            width: '100%',
            padding: '12px 15px',
            borderRadius: '10px',
            border: '1px solid #ddd',
            fontSize: '16px',
            backgroundColor: '#f5f5f5'
          }}
        />
      </div>

      {/* Promo Banner */}
      <div style={{
        margin: '10px 15px',
        padding: '20px',
        backgroundColor: '#E30613',
        color: 'white',
        borderRadius: '10px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Get ₦200 Off Your First Order</h3>
        <p style={{ margin: '0 0 15px 0', fontSize: '14px', opacity: '0.9' }}>Use code GOFIRST at checkout</p>
        <button style={{
          backgroundColor: 'black',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Order Now
        </button>
      </div>

      {/* Categories */}
      <div style={{ padding: '15px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '700' }}>Categories</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '12px',
          padding: '5px 0 15px 0'
        }}>
          {[
            { icon: BurgerIcon, name: 'Burger', color: '#E60023' },
            { icon: PizzaIcon, name: 'Pizza', color: '#E60023' },
            { icon: SaladIcon, name: 'Salad', color: '#10B981' },
            { icon: SushiIcon, name: 'Sushi', color: '#E60023' },
            { icon: MarketIcon, name: 'Market', color: '#F59E0B' },
            { icon: PharmacyIcon, name: 'Pharmacy', color: '#EF4444' },
            { icon: PackageIcon, name: 'Delivery', color: '#E60023' }
          ].map(({ icon: Icon, name, color }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '15px 10px',
                backgroundColor: name === 'Market' ? '#FEF3F2' : '#FFFFFF',
                border: name === 'Market' ? '2px solid #E60023' : '2px solid #F3F4F6',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: name === 'Market' ? '0 4px 12px rgba(230, 0, 35, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(230, 0, 35, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = name === 'Market' ? '0 4px 12px rgba(230, 0, 35, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.05)';
              }}
            >
              <Icon size={40} color={color} />
              <span style={{
                fontSize: '13px',
                fontWeight: '600',
                color: name === 'Market' ? '#E60023' : '#374151',
                textAlign: 'center'
              }}>
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Vendors */}
      <div style={{ padding: '15px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Popular Near You</h3>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            display: 'flex',
            gap: '15px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '10px',
            marginBottom: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              backgroundColor: '#eee',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px'
            }}>
              🏪
            </div>
            <div>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
                {i === 1 ? 'Burger Haven' : i === 2 ? 'Ibara Market' : 'MediPlus Pharmacy'}
              </h4>
              <div style={{ fontSize: '14px', color: '#666' }}>
                <span>⭐ 4.{7 + i}</span> • <span>🕒 15-25 min</span> • <span>🚚 ₦200</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: 'white',
        borderTop: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 15px'
      }}>
        {[
          { icon: '🏠', name: 'Explore' },
          { icon: '📦', name: 'Orders' },
          { icon: '📍', name: 'Track' },
          { icon: '💬', name: 'Chat' },
          { icon: '👤', name: 'Profile' }
        ].map((item, i) => (
          <div
            key={i}
            onClick={() => handleNavigation(item.name)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: i === 0 ? '#E30613' : '#666',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ fontSize: '20px' }}>{item.icon}</div>
            <div style={{ fontSize: '12px' }}>{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleMobilePage;