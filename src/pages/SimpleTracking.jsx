import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

export default function SimpleTracking() {
    const { orderId } = useParams();
    const mapRef = useRef(null);

    useEffect(() => {
        console.log('SimpleTracking component mounted, orderId:', orderId);
        
        // Use static map image that definitely shows streets
        if (mapRef.current) {
            mapRef.current.innerHTML = `
                <div style="
                    width: 100%;
                    height: 100%;
                    background: url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-pickup+ff0000(3.3792,6.5244),pin-s-dropoff+00ff00(3.3892,6.5344)/3.3842,6.5294,12,0/400x600@2x?access_token=YOUR_MAPBOX_TOKEN') center/cover no-repeat;
                    background-size: cover;
                    position: relative;
                ">
                    <!-- Street overlay pattern for Lagos -->
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-image: 
                            linear-gradient(90deg, #f0f0f0 1px, transparent 1px),
                            linear-gradient(180deg, #f0f0f0 1px, transparent 1px);
                        background-size: 50px 50px;
                        opacity: 0.3;
                    "></div>
                    
                    <!-- Pickup marker -->
                    <div style="
                        position: absolute;
                        top: 30%;
                        left: 40%;
                        width: 40px;
                        height: 40px;
                        background: #ff0000;
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">
                        <div style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(45deg);
                            color: white;
                            font-size: 18px;
                        ">📦</div>
                    </div>
                    
                    <!-- Dropoff marker -->
                    <div style="
                        position: absolute;
                        top: 60%;
                        left: 60%;
                        width: 40px;
                        height: 40px;
                        background: #00ff00;
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">
                        <div style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(45deg);
                            color: white;
                            font-size: 18px;
                        ">🏠</div>
                    </div>
                    
                    <!-- Rider marker -->
                    <div style="
                        position: absolute;
                        top: 45%;
                        left: 50%;
                        width: 50px;
                        height: 50px;
                        background: #1e40af;
                        border-radius: 50%;
                        border: 4px solid white;
                        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        animation: pulse 2s infinite;
                    ">🏍️</div>
                    
                    <!-- Route line -->
                    <svg style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                    ">
                        <path d="M 40% 30% Q 50% 40% 60% 60%" 
                              stroke="#ff4444" 
                              stroke-width="4" 
                              fill="none" 
                              stroke-dasharray="10,5"
                              stroke-linecap="round"/>
                    </svg>
                    
                    <!-- Street labels -->
                    <div style="
                        position: absolute;
                        top: 20%;
                        left: 10%;
                        background: rgba(255,255,255,0.9);
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 500;
                        color: #333;
                    ">Ikeja St</div>
                    
                    <div style="
                        position: absolute;
                        top: 70%;
                        right: 15%;
                        background: rgba(255,255,255,0.9);
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 500;
                        color: #333;
                    ">Solul St</div>
                </div>
                
                <style>
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                </style>
            `;
        }
    }, [orderId]);

    return (
        <div style={{ 
            position: 'relative',
            height: '100vh', 
            width: '100vw',
            background: '#f0f0f0'
        }}>
            <div 
                ref={mapRef}
                style={{
                    height: '100%',
                    width: '100%',
                    position: 'relative'
                }}
            />
            
            {/* Mobile UI */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'white',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                padding: '20px',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                zIndex: 1000
            }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#E30000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px'
                    }}>
                        🏍️
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Assigning rider...</h3>
                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                                ⭐ <span style={{ fontSize: '14px', marginLeft: '4px' }}>4.9</span>
                            </div>
                        </div>
                        <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>
                            <strong>ESTIMATED ARRIVAL</strong>
                        </div>
                        <div style={{ color: '#E30000', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                            Today, 1:02 PM
                        </div>
                        <div style={{ color: '#666', fontSize: '14px' }}>
                            📍 4.2 km • Processing
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button style={{
                        flex: 1,
                        padding: '16px',
                        background: '#E30000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        📞 Call Rider
                    </button>
                    <button style={{
                        width: '56px',
                        height: '56px',
                        background: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        💬
                    </button>
                </div>
            </div>
        </div>
    );
}