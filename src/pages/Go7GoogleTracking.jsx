import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Go7TrackingMap from '../components/Go7TrackingMap.jsx';
import DeliverySheet from '../components/DeliverySheet.jsx';

export default function Go7GoogleTracking() {
    const { orderId } = useParams();
    const [mapZoom, setMapZoom] = useState('normal');

    // Mock delivery data (in real app, this would come from props or API)
    const mockDelivery = {
        id: orderId || 'DELIVERY_123',
        status: 'enroute',
        eta: '15 min',
        pickupAddress: 'Oke-Ilewo Market, Abeokuta',
        dropoffAddress: 'Abeokuta DC, Abeokuta South',
        orderItems: [
            { name: 'Jollof Rice & Chicken', quantity: 2, price: '3,500' },
            { name: 'Plantain', quantity: 1, price: '800' },
            { name: 'Coke', quantity: 2, price: '600' }
        ]
    };

    // Mock rider data
    const mockRider = {
        name: 'Adebayo Michael',
        phone: '+234 801 234 5678',
        photoURL: '/api/placeholder/56/56',
        rating: '4.9',
        deliveries: '247'
    };

    // Handle map zoom changes when sheet expands/collapses
    const handleMapZoomChange = useCallback((sheetState) => {
        setMapZoom(sheetState);
        // In a real implementation, you would pass this to the map component
        console.log('📍 Map zoom should adjust for sheet state:', sheetState);
    }, []);

    return (
        <div style={{ 
            position: 'relative',
            height: '100vh', 
            width: '100vw',
            overflow: 'hidden'
        }}>
            {/* Google Maps Component */}
            <Go7TrackingMap 
                orderId={orderId} 
                zoomState={mapZoom}
            />
            
            {/* Modern Draggable Bottom Sheet */}
            <DeliverySheet 
                delivery={mockDelivery}
                rider={mockRider}
                onMapZoomChange={handleMapZoomChange}
            />
        </div>
    );
}