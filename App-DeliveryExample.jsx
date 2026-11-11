import React from 'react';
import DeliveryMapTracker from './DeliveryMapTracker';

const App = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ color: '#E30613', marginBottom: '20px' }}>Go7 Delivery Tracker</h1>
            
            {/* Example 1: Default props */}
            <div style={{ marginBottom: '30px' }}>
                <h2>Default Delivery</h2>
                <DeliveryMapTracker />
            </div>
            
            {/* Example 2: Custom props */}
            <div style={{ marginBottom: '30px' }}>
                <h2>Custom Delivery Route</h2>
                <DeliveryMapTracker 
                    pickup={[3.3600, 7.1450]} 
                    dropoff={[3.3750, 7.1550]} 
                    fee="₦2000" 
                />
            </div>
            
            {/* Example 3: Another custom route */}
            <div style={{ marginBottom: '30px' }}>
                <h2>Express Delivery</h2>
                <DeliveryMapTracker 
                    pickup={[3.3580, 7.1420]} 
                    dropoff={[3.3680, 7.1500]} 
                    fee="₦1800" 
                />
            </div>
        </div>
    );
};

export default App;