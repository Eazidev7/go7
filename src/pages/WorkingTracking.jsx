import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function WorkingTracking() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        console.log('WorkingTracking component loaded!');
    }, []);

    return (
        <div style={{ 
            height: '100vh', 
            width: '100vw', 
            position: 'relative',
            background: '#f5f5f5',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
        }}>
            {/* Top status bar */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                borderRadius: '20px',
                padding: '8px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 1000
            }}>
                🔴 Finding rider...
            </div>

            {/* Map area with street pattern */}
            <div style={{
                height: '60%',
                width: '100%',
                background: `
                    linear-gradient(45deg, #e8e8e8 25%, transparent 25%), 
                    linear-gradient(-45deg, #e8e8e8 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #e8e8e8 75%), 
                    linear-gradient(-45deg, transparent 75%, #e8e8e8 75%)
                `,
                backgroundSize: '40px 40px',
                backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
                backgroundColor: '#f0f0f0',
                position: 'relative'
            }}>
                {/* Street labels */}
                <div style={{
                    position: 'absolute',
                    top: '20%',
                    left: '10%',
                    background: 'rgba(255,255,255,0.9)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                }}>Ikeja St</div>

                <div style={{
                    position: 'absolute',
                    top: '70%',
                    right: '15%',
                    background: 'rgba(255,255,255,0.9)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                }}>Solul St</div>

                {/* Pickup marker */}
                <div style={{
                    position: 'absolute',
                    top: '30%',
                    left: '40%',
                    width: '12px',
                    height: '12px',
                    background: '#ff0000',
                    borderRadius: '50%',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}></div>

                {/* Dropoff marker */}
                <div style={{
                    position: 'absolute',
                    top: '60%',
                    left: '60%',
                    width: '12px',
                    height: '12px',
                    background: '#00ff00',
                    borderRadius: '50%',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}></div>

                {/* Route line */}
                <svg style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                }}>
                    <path 
                        d="M 40% 30% Q 50% 45% 60% 60%" 
                        stroke="#ff4444" 
                        strokeWidth="3" 
                        fill="none" 
                        strokeDasharray="8,4"
                    />
                </svg>
            </div>

            {/* Bottom sheet */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'white',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                padding: '20px',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
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
                        marginRight: '12px',
                        fontSize: '24px'
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
                        cursor: 'pointer'
                    }}>
                        📞 Call Rider
                    </button>
                    <button 
                        onClick={() => navigate(`/go7-chat/${orderId || 'default'}`)}
                        style={{
                            width: '56px',
                            height: '56px',
                            background: 'white',
                            border: '2px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '20px',
                            cursor: 'pointer'
                        }}>
                        💬
                    </button>
                </div>
            </div>
        </div>
    );
}