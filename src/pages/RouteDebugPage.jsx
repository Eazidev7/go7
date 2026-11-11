import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function RouteDebugPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const testRoutes = [
        { path: '/', label: 'Home 🏠' },
        { path: '/orders', label: 'Orders 📦' },
        { path: '/track', label: 'Track 🛵' },
        { path: '/go7-modern-chat', label: 'Chat 💬' },
        { path: '/profile', label: 'Profile 👤' },
    ];

    return (
        <div style={{
            minHeight: '100vh',
            padding: '20px',
            paddingBottom: '100px',
            background: '#f5f5f5'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                    🔍 Route Debugger
                </h1>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                    Current Route: <strong>{location.pathname}</strong>
                </p>
            </div>

            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                    Test Navigation:
                </h2>

                {testRoutes.map(route => (
                    <button
                        key={route.path}
                        onClick={() => {
                            console.log(`🚀 Navigating to: ${route.path}`);
                            navigate(route.path);
                        }}
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '15px',
                            marginBottom: '10px',
                            background: location.pathname === route.path ? '#e63946' : '#f0f0f0',
                            color: location.pathname === route.path ? 'white' : '#333',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        {route.label}
                        {location.pathname === route.path && ' ✓'}
                    </button>
                ))}
            </div>

            <div style={{
                background: '#fff3cd',
                border: '2px solid #ffc107',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '20px'
            }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                    📝 Debug Info:
                </h3>
                <pre style={{
                    background: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    overflow: 'auto'
                }}>
                    {JSON.stringify({
                        pathname: location.pathname,
                        search: location.search,
                        hash: location.hash,
                        state: location.state,
                        href: window.location.href
                    }, null, 2)}
                </pre>
            </div>
        </div>
    );
}
