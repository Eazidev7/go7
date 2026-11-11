import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../Navbar.jsx';
import { Button } from '../ui/button';
import '../../styles/hero.css';
import '../../styles/motion.css';

const Hero: React.FC = () => {
  // Force refresh - debugging burger position
  return (
    <>
      {/* Preload images for better performance */}
      <link rel="preload" as="image" href="/burger-hero.png" />
      <link rel="preload" as="image" href="/scooter.png" />
      <link rel="preload" as="image" href="/hero-map.svg" />
      
      {/* Navigation Bar */}
      <Navbar />
      
      <section className="hero" role="banner" style={{ position: 'relative' }}>
        <div className="hero-inner">
          <div className="hero-left" style={{ marginLeft: '180px' }}>
            <h1 id="hero-heading">From Burgers to Parcels,<br/>We Deliver Fast</h1>
            <p>Fresh meals, groceries, and packages delivered</p>
            <nav className="hero-cta-wrap" role="navigation" aria-labelledby="hero-heading">
              <Link to="/book" aria-describedby="book-delivery-desc">
                <Button variant="primary" size="md" startIcon="🛵">
                  Book a Delivery
                </Button>
                <span id="book-delivery-desc" className="sr-only">Start a new delivery order</span>
              </Link>
              <Link to="/track" aria-describedby="track-package-desc">
                <Button variant="ghost" size="md" startIcon="📦">
                  Track Package
                </Button>
                <span id="track-package-desc" className="sr-only">Check the status of your delivery</span>
              </Link>
              <Link to="/shop/food" aria-describedby="order-food-desc">
                <Button variant="secondary" size="md" startIcon="🍔">
                  Order Food
                </Button>
                <span id="order-food-desc" className="sr-only">Browse restaurants and order meals</span>
              </Link>
            </nav>
          </div>
          <div className="hero-right stagger-fade-in" aria-hidden="true">
            {/* Map tiles background with reduced opacity */}
            <img
              src="/hero-map.svg"
              alt=""
              role="presentation"
              style={{
                position: 'absolute',
                right: '0',
                bottom: '0',
                width: '600px',
                height: '400px',
                opacity: 0.3,
                zIndex: 1,
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
        
        {/* Images positioned relative to hero section */}
        <img
          src="/burger-hero.png"
          alt=""
          role="presentation" 
          style={{ 
            position: 'absolute',
            left: '-20px',
            bottom: '100px', 
            height: '320px',
            zIndex: 2,
            objectFit: 'contain'
          }}
        />
        
        <img
          src="/scooter.png"
          alt=""
          role="presentation"
          style={{
            position: 'absolute',
            right: '20px',
            bottom: '100px',
            width: '380px',
            zIndex: 2,
            objectFit: 'contain'
          }}
        />
      </section>
    </>
  );
};

export default Hero;
