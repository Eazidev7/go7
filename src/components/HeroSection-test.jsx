import React from 'react';

/**
 * Simple Hero Section Component for testing
 */
const HeroSection = () => {
  return (
    <div className="hero-section" style={{
      backgroundColor: '#e53e3e', // Go7 red theme
      padding: '2rem',
      borderRadius: '8px',
      margin: '1rem',
      color: 'white',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        From Burgers to Parcels, We Deliver Fast
      </h1>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <input
          type="text"
          placeholder="Search for vendors or enter delivery address"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: 'none',
            fontSize: '1rem'
          }}
        />
      </div>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '1rem'
      }}>
        <button style={{ 
          backgroundColor: 'white', 
          color: '#e53e3e',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Food
        </button>
        <button style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.2)', 
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Grocery
        </button>
        <button style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.2)', 
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Pharmacy
        </button>
        <button style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.2)', 
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Parcels
        </button>
      </div>
    </div>
  );
};

export default HeroSection;