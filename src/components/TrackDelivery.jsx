import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Helper function to get current status index for timeline
const getCurrentStatusIndex = (status) => {
  const statusMap = {
    'order_placed': 0,
    'rider_assigned': 1, 
    'picked_up': 2,
    'delivered': 3
  };
  return statusMap[status] || 0;
};

// Generate a sample route path for demonstration
const generateSampleRoute = (pickup, dropoff) => {
  const points = [];
  const steps = 20;
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    
    // Create a curved path by adding some variation
    let lat = pickup.latitude + (dropoff.latitude - pickup.latitude) * ratio;
    let lng = pickup.longitude + (dropoff.longitude - pickup.longitude) * ratio;
    
    // Add some curve to make it look like a real route
    if (i > 2 && i < steps - 2) {
      lat += Math.sin(ratio * Math.PI) * 0.002; // Small curve
      lng += Math.cos(ratio * Math.PI * 2) * 0.001;
    }
    
    points.push({ lat, lng });
  }
  
  return points;
};

const TrackDelivery = ({ deliveryId }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [riderPosition, setRiderPosition] = useState(null);
  const [lastRiderPosition, setLastRiderPosition] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);

  // 🔥 REAL-TIME FIREBASE TRACKING - Production Ready
  useEffect(() => {
    if (!deliveryId) return;

    console.log('🚀 Starting real-time tracking for delivery:', deliveryId);
    
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const unsubscribe = onSnapshot(deliveryRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('📍 LIVE UPDATE:', {
          status: data.status,
          rider: data.riderLocation ? 
            `${data.riderLocation.latitude.toFixed(6)}, ${data.riderLocation.longitude.toFixed(6)}` : 
            'No location',
          timestamp: new Date().toLocaleTimeString()
        });
        
        setDelivery(data);
        
        // 🏍️ Handle rider position updates with smooth animation
        if (data.riderLocation && JSON.stringify(data.riderLocation) !== JSON.stringify(lastRiderPosition)) {
          animateRiderMovement(data.riderLocation);
        }
      }
    });

    return () => unsubscribe();
  }, [deliveryId, lastRiderPosition]);

  // Smooth rider animation between positions
  const animateRiderMovement = (newPosition) => {
    if (!lastRiderPosition) {
      setRiderPosition(newPosition);
      setLastRiderPosition(newPosition);
      return;
    }

    setIsAnimating(true);
    const steps = 30; // Animation steps
    const latDiff = (newPosition.latitude - lastRiderPosition.latitude) / steps;
    const lngDiff = (newPosition.longitude - lastRiderPosition.longitude) / steps;
    let currentStep = 0;

    const animate = () => {
      if (currentStep <= steps) {
        const interpolatedPosition = {
          latitude: lastRiderPosition.latitude + (latDiff * currentStep),
          longitude: lastRiderPosition.longitude + (lngDiff * currentStep)
        };
        
        setRiderPosition(interpolatedPosition);
        
        // Center map on rider with smooth pan
        if (map) {
          map.panTo({ 
            lat: interpolatedPosition.latitude, 
            lng: interpolatedPosition.longitude 
          });
        }
        
        currentStep++;
        setTimeout(animate, 50); // 1.5s total animation
      } else {
        setIsAnimating(false);
        setLastRiderPosition(newPosition);
      }
    };

    animate();
  };

  // Google Maps styling (light theme)
  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    scrollwheel: true,
    draggable: true,
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] }
    ]
  };

  // Route polyline options - matching the red route in design
  const polylineOptions = {
    strokeColor: '#E53E3E', // Bright red matching the UI
    strokeOpacity: 1.0,
    strokeWeight: 6, // Thicker line for better visibility
    geodesic: true,
    zIndex: 10 // Ensure route appears above other map elements
  };

  // Marker icons
  const pickupIcon = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 12,
    fillColor: '#ffffff',
    fillOpacity: 1,
    strokeColor: '#000000',
    strokeWeight: 2,
    labelOrigin: new window.google.maps.Point(0, -35)
  } : undefined;

  const dropoffIcon = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 12,
    fillColor: '#000000',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    labelOrigin: new window.google.maps.Point(0, -35)
  } : undefined;

  const riderIcon = {
    url: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="25" r="22" fill="#E0001B" stroke="#ffffff" stroke-width="4"/>
        <text x="25" y="32" text-anchor="middle" font-size="20" fill="white">🏍️</text>
      </svg>
    `),
    scaledSize: isLoaded && window.google && window.google.maps ? new window.google.maps.Size(50, 50) : undefined,
    anchor: isLoaded && window.google && window.google.maps ? new window.google.maps.Point(25, 25) : undefined
  };

  const onLoad = useCallback((map) => {
    setMap(map);
    
    // Fit bounds if we have pickup and dropoff
    if (delivery?.pickup && delivery?.dropoff) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: delivery.pickup.latitude, lng: delivery.pickup.longitude });
      bounds.extend({ lat: delivery.dropoff.latitude, lng: delivery.dropoff.longitude });
      map.fitBounds(bounds);
    }
  }, [delivery]);

  // Status timeline
  const getStatusProgress = (status) => {
    const statuses = ['requested', 'assigned', 'en_route', 'picked_up', 'delivered'];
    return statuses.indexOf(status) + 1;
  };

  const formatETA = (eta) => {
    if (!eta) return 'Calculating...';
    return new Date(eta.seconds * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isLoaded) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>🗺️</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading Go7 Tracking...</div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>📦</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading delivery details...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '104px',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        zIndex: 1000,
        borderBottom: '1px solid #f0f0f0',
        paddingTop: '44px' // Account for iPhone notch
      }}>
        <button 
          onClick={() => window.history.back()}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            padding: '8px',
            cursor: 'pointer',
            color: '#000'
          }}
        >
          ←
        </button>
        <h1 style={{
          fontSize: '20px',
          fontWeight: '600',
          margin: '0',
          color: '#000',
          textAlign: 'center',
          flex: 1,
          marginLeft: '-40px' // Center accounting for back button
        }}>
          Track Delivery
        </h1>
      </div>

      {/* Location Label */}
      <div style={{
        position: 'absolute',
        top: '120px',
        left: '16px',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '12px 16px',
        borderRadius: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: '#333',
          borderRadius: '50%'
        }}></div>
        <span style={{
          fontSize: '16px',
          fontWeight: '500',
          color: '#333'
        }}>
          {delivery?.dropoff?.address?.split(',')[0] || 'Delivery Location'}
        </span>
      </div>

      {/* Rider Badge */}
      <div style={{
        position: 'absolute',
        bottom: '60%',
        right: '16px',
        zIndex: 1000,
        backgroundColor: '#000',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        {delivery?.rider?.name || 'Rider Name'}
      </div>

      <GoogleMap
        mapContainerStyle={{ 
          width: '100%', 
          height: '50%',
          marginTop: '104px'
        }}
        center={riderPosition ? { lat: riderPosition.latitude, lng: riderPosition.longitude } : 
                { lat: delivery.pickup.coordinates.latitude, lng: delivery.pickup.coordinates.longitude }}
        zoom={14}
        onLoad={onLoad}
        options={{
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          disableDefaultUI: true,
          styles: [
            {
              "featureType": "poi",
              "elementType": "labels",
              "stylers": [{"visibility": "off"}]
            }
          ]
        }}
      >
        {/* Route polyline */}
        {delivery.route && (
          <Polyline
            path={delivery.route.map(point => ({ lat: point.latitude, lng: point.longitude }))}
            options={polylineOptions}
          />
        )}
        
        {/* Pickup marker */}
        <Marker
          position={{ lat: delivery.pickup.latitude, lng: delivery.pickup.longitude }}
          icon={pickupIcon}
          label={{
            text: delivery.pickup.address || 'Pickup Location',
            color: '#000000',
            fontWeight: 'bold',
            fontSize: '12px'
          }}
          title="Pickup Location"
        />
        
        {/* Dropoff marker */}
        <Marker
          position={{ lat: delivery.dropoff.latitude, lng: delivery.dropoff.longitude }}
          icon={dropoffIcon}
          label={{
            text: delivery.dropoff.address || 'Dropoff Location',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '12px'
          }}
          title="Dropoff Location"
        />
        
        {/* Rider marker */}
        {riderPosition && (
          <Marker
            position={{ lat: riderPosition.latitude, lng: riderPosition.longitude }}
            icon={riderIcon}
            title="Go7 Rider - Live Location"
            animation={isAnimating && window.google ? window.google.maps.Animation.BOUNCE : undefined}
          />
        )}
      </GoogleMap>

      {/* Bottom Panel - Mobile UI Design */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'white',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          zIndex: 1000,
          padding: '20px',
          minHeight: '50%'
        }}
      >
        {/* ETA Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Estimated Arrival
          </div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#000',
            lineHeight: '1.2'
          }}>
            {delivery.estimatedDeliveryTime ? 
              new Date(delivery.estimatedDeliveryTime).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit' 
              }) : 
              '6:25 PM'
            }
          </div>
        </div>

        {/* Status */}
        <div style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#000',
          marginBottom: '20px'
        }}>
          {delivery.status === 'picked_up' ? 'Rider en route to you' : 
           delivery.status === 'delivered' ? 'Order delivered!' :
           delivery.status === 'rider_assigned' ? 'Rider assigned' :
           'Preparing your order'}
        </div>

        {/* Rider Card */}
        {delivery.rider && (
          <div style={{
            backgroundColor: '#E53E3E',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#fff',
                backgroundImage: delivery.rider.avatar ? `url(${delivery.rider.avatar})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                overflow: 'hidden'
              }}>
                {!delivery.rider.avatar && '👨‍🦱'}
              </div>
              <div>
                <div style={{ 
                  color: 'white', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  marginBottom: '2px'
                }}>
                  {delivery.rider.name || 'Tunde'}
                </div>
                <div style={{ 
                  color: 'white', 
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ⭐ {delivery.rider.rating || '4.9'}
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                const phone = delivery.rider?.phone || '+2348123456789';
                console.log('📞 Calling rider:', phone);
                window.open(`tel:${phone}`, '_self');
              }}
              style={{
                backgroundColor: 'transparent',
                border: '2px solid white',
                borderRadius: '24px',
                color: 'white',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Call Rider
            </button>
          </div>
        )}

        {/* Delivery Points */}
        <div style={{ marginBottom: '24px' }}>
          {/* Pickup */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#E53E3E',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 0 0 2px #E53E3E'
            }}></div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#000' }}>
                Pickup: {delivery.pickup?.address?.split(',').slice(0, 2).join(', ') || 'Chicken Republic, Oke-Ilewo'}
              </div>
            </div>
          </div>
          
          {/* Dropoff */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#E53E3E',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 0 0 2px #E53E3E'
            }}></div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#000' }}>
                Dropoff: {delivery.dropoff?.address?.split(',').slice(0, 2).join(', ') || 'Abeokuta DC'}
              </div>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '24px',
          paddingLeft: '4px'
        }}>
          {['Requested', 'Assigned', 'En Route', 'Delivered'].map((status, index) => {
            const isActive = index <= getCurrentStatusIndex(delivery.status);
            const isCurrent = index === getCurrentStatusIndex(delivery.status);
            
            return (
              <React.Fragment key={status}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: isActive ? '#E53E3E' : '#E5E7EB',
                  border: isCurrent ? '3px solid #E53E3E' : 'none',
                  boxSizing: 'border-box'
                }}></div>
                {index < 3 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    backgroundColor: isActive ? '#E53E3E' : '#E5E7EB',
                    maxWidth: '40px'
                  }}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          paddingTop: '8px'
        }}>
          <button 
            onClick={() => {
              console.log('🚨 Reporting issue for delivery:', deliveryId);
              alert('Issue reporting feature will open support chat or form');
              // In production: navigate to support page or open chat
            }}
            style={{
              flex: 1,
              backgroundColor: 'white',
              border: '2px solid #E53E3E',
              borderRadius: '8px',
              color: '#E53E3E',
              padding: '14px 20px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Report an Issue
          </button>
          <button 
            onClick={() => {
              console.log('🧾 Viewing receipt for delivery:', deliveryId);
              // In production: open receipt modal or navigate to receipt page
              window.open(`/#/receipt/${deliveryId}`, '_blank');
            }}
            style={{
              flex: 1,
              backgroundColor: '#E53E3E',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '14px 20px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            View Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackDelivery;