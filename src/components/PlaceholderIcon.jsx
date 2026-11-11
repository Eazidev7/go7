import React from 'react';

const PlaceholderIcon = ({ size = 48, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 48 48" 
    className={`inline-block ${className}`}
    style={{ background: '#f3f4f6', borderRadius: '12px' }}
  >
    <rect width="48" height="48" rx="12" fill="#f3f4f6"/>
    <circle cx="24" cy="18" r="5" fill="#9ca3af"/>
    <path d="M14 34c0-5.5 4.5-10 10-10s10 4.5 10 10H14z" fill="#9ca3af"/>
    <text x="24" y="40" textAnchor="middle" fontSize="8" fill="#6b7280">Add-on</text>
  </svg>
);

export default PlaceholderIcon;