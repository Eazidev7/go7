import { useState } from 'react';
import Hero from './home/Hero';
import Footer from './Footer';
import LiveAreasSection from '../sections/LiveAreasSection';
import FoodVendorsRow from './home/FoodVendorsRow-new';
import LocalMarketsGrid from './home/LocalMarketsGrid-simple';
import PricingStrip from './home/PricingStrip-new';
import FareCalculator from '../sections/pricing/FareCalculator';
import ReferralBanner from './home/ReferralBanner';
import Testimonials from './home/Testimonials';

const DesktopHero = () => {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  return (
    <>
      {/* Debug element - can be removed after testing */}
      
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Our Service Areas in Abeokuta */}
      <LiveAreasSection onSelect={setSelectedArea} />

      {/* 3. Food Vendors */}
      <FoodVendorsRow selectedArea={selectedArea} />

      {/* 4. Local Markets */}
      <LocalMarketsGrid selectedArea={selectedArea} />

      {/* 5. Pricing Strip */}
      <PricingStrip />

      {/* 6. Fare Calculator */}
      <FareCalculator />

      {/* 7. Referral Banner */}
      <ReferralBanner />

      {/* 8. Testimonials */}
      <Testimonials />
      
      {/* Map Test Section - Added for direct access */}
      <section style={{ padding: '20px', background: '#f5f5f5', margin: '20px 0' }}>
        <h2>🗺️ Your Cartoon Icons Map</h2>
        <div style={{ 
          width: '100%', 
          height: '400px', 
          border: '2px solid #333',
          background: '#e8f5e8',
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'white',
            padding: '10px',
            borderRadius: '5px',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Your Cartoon Icons:</h3>
          </div>
          
          {/* Display your icons as visible elements */}
          <div style={{
            position: 'absolute',
            top: '100px',
            left: '50px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #ff6b6b',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <img src="/bag-icon.jpg" alt="Pickup" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          
          <div style={{
            position: 'absolute',
            top: '200px',
            left: '200px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #4ecdc4',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <img src="/shop-icon.jpg" alt="Shop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          
          <div style={{
            position: 'absolute',
            top: '150px',
            left: '300px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #45b7d1',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <img src="/rider-icon.jpg" alt="Rider" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '400px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #f7b801',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <img src="/olumo-rock-icon.jpg" alt="Olumo Rock" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          
          {/* Map background pattern */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            fontSize: '14px',
            background: 'rgba(255,255,255,0.9)',
            padding: '5px 10px',
            borderRadius: '5px 0 0 0'
          }}>
            Cartoon Map with Your Icons
          </div>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <p><strong>✅ Your 4 cartoon icons are displayed above!</strong></p>
          <p>🛍️ <strong>Red border:</strong> Bag icon (pickup locations)</p>
          <p>🏪 <strong>Teal border:</strong> Shop icon (vendor locations)</p>
          <p>🏍️ <strong>Blue border:</strong> Rider icon (delivery person)</p>
          <p>🏛️ <strong>Yellow border:</strong> Olumo Rock icon (landmark)</p>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
};

export default DesktopHero;