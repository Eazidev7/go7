import React from 'react';

export default function TestPage() {
    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#00ff00',
            color: 'black',
            fontSize: '24px',
            fontWeight: 'bold'
        }}>
            <h1>✅ TEST PAGE WORKS!</h1>
            <p>If you see this, routing is working.</p>
            <p>URL: {window.location.href}</p>
            <p>Time: {new Date().toLocaleTimeString()}</p>
        </div>
    );
}