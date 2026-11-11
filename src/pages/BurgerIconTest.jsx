import React from 'react';
import { BurgerIcon } from '../components/CategoryIcons';

const BurgerIconTest = () => {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '40px',
                maxWidth: '500px',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                <h1 style={{ color: '#E60023', marginBottom: '30px' }}>
                    🍔 Burger Icon Test
                </h1>

                <div style={{
                    background: '#F9FAFB',
                    padding: '30px',
                    borderRadius: '16px',
                    marginBottom: '20px'
                }}>
                    <p style={{ marginBottom: '20px', color: '#6B7280' }}>
                        If you can see the burger below, it's working!
                    </p>

                    <div style={{ marginBottom: '30px' }}>
                        <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '10px' }}>
                            Large (80px)
                        </p>
                        <BurgerIcon size={80} color="#E60023" />
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '10px' }}>
                            Medium (40px) - Used in mobile page
                        </p>
                        <BurgerIcon size={40} color="#E60023" />
                    </div>

                    <div>
                        <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '10px' }}>
                            Small (32px)
                        </p>
                        <BurgerIcon size={32} color="#E60023" />
                    </div>
                </div>

                <div style={{
                    background: '#FEF3F2',
                    border: '2px solid #E60023',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'left'
                }}>
                    <h3 style={{ color: '#E60023', marginBottom: '10px', fontSize: '16px' }}>
                        ✅ If icons appear above:
                    </h3>
                    <ul style={{ marginLeft: '20px', color: '#6B7280', fontSize: '14px', lineHeight: '1.8' }}>
                        <li>The burger icon component is working</li>
                        <li>Check /mobiletest or /simplehome pages</li>
                        <li>Try hard refresh (Ctrl+Shift+R)</li>
                    </ul>

                    <h3 style={{ color: '#E60023', marginTop: '20px', marginBottom: '10px', fontSize: '16px' }}>
                        ❌ If icons are missing:
                    </h3>
                    <ul style={{ marginLeft: '20px', color: '#6B7280', fontSize: '14px', lineHeight: '1.8' }}>
                        <li>Check browser console for errors (F12)</li>
                        <li>Verify dev server is running</li>
                        <li>Check if CategoryIcons.jsx has syntax errors</li>
                    </ul>
                </div>

                <div style={{ marginTop: '20px', fontSize: '14px', color: '#9CA3AF' }}>
                    <p>Access this test at: <code>/burger-test</code></p>
                </div>
            </div>
        </div>
    );
};

export default BurgerIconTest;
