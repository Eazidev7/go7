import React from 'react';
import DeliveryMap from './components/DeliveryMap';

/**
 * Example usage of the DeliveryMap component for Next.js
 * 
 * This demonstrates how to use the reusable DeliveryMap component
 * with different pickup/dropoff locations and fees.
 */

const DeliveryMapExample: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {/* Go7 Delivery Map with example props */}
      <DeliveryMap 
        pickup={[3.3619, 7.1475]}
        dropoff={[3.3700, 7.1530]}
        fee="₦1450"
        riderId="AKEEM01"
      />
    </div>
  );
};

// Alternative examples for different scenarios
export const MultipleDeliveryExamples = () => {
  const [currentExample, setCurrentExample] = React.useState(0);
  
  const examples = [
    {
      name: "Central Abeokuta Delivery",
      pickup: [3.3619, 7.1475] as [number, number],
      dropoff: [3.3700, 7.1530] as [number, number],
      fee: "₦1450",
      riderId: "AKEEM01"
    },
    {
      name: "University Area Delivery", 
      pickup: [3.3580, 7.1450] as [number, number],
      dropoff: [3.3650, 7.1500] as [number, number],
      fee: "₦1200",
      riderId: "MUSA22"
    },
    {
      name: "Olumo Rock Area Delivery",
      pickup: [3.3480, 7.1600] as [number, number],
      dropoff: [3.3550, 7.1550] as [number, number],
      fee: "₦1600",
      riderId: "KEMI45"
    }
  ];
  
  const currentDelivery = examples[currentExample];
  
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Example Selector */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 2000,
        background: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <select 
          value={currentExample}
          onChange={(e) => setCurrentExample(Number(e.target.value))}
          style={{ padding: '5px', fontSize: '14px' }}
        >
          {examples.map((example, index) => (
            <option key={index} value={index}>
              {example.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Delivery Map */}
      <DeliveryMap 
        pickup={currentDelivery.pickup}
        dropoff={currentDelivery.dropoff}
        fee={currentDelivery.fee}
        riderId={currentDelivery.riderId}
      />
    </div>
  );
};

export default DeliveryMapExample;