import React from 'react';

const Go7Icon = ({ 
  type, 
  active = false, 
  size = 32, 
  className = '',
  onClick,
  alt = ''
}) => {
  const baseClass = `go7-icon ${className}`;
  const activeClass = active ? 'active' : 'inactive';
  
  // Ensure proper sizing for mobile
  const iconSize = size <= 32 ? 32 : size;
  
  // Go7 brand colors
  const colors = {
    primary: '#e60023',
    primaryGradient: 'url(#go7-gradient)',
    white: '#ffffff',
    gray: '#b0b0b0',
    lightGray: '#f5f5f5'
  };

  // Category icons with circular white background and red border
  const categoryIcons = {
    burger: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 64 64" className={baseClass} style={{ shapeRendering: 'geometricPrecision' }}>
        <defs>
          <linearGradient id="go7-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e60023"/>
            <stop offset="100%" stopColor="#ff3b30"/>
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill={colors.white} stroke={colors.primary} strokeWidth="2"/>
        {/* Burger layers */}
        <ellipse cx="32" cy="22" rx="12" ry="3" fill="#8B4513"/>
        <ellipse cx="32" cy="26" rx="10" ry="2" fill="#228B22"/>
        <ellipse cx="32" cy="30" rx="11" ry="2.5" fill="#FF6347"/>
        <ellipse cx="32" cy="34" rx="10" ry="2" fill="#FFD700"/>
        <ellipse cx="32" cy="38" rx="12" ry="3" fill="#8B4513"/>
      </svg>
    ),

    pizza: (
      <svg width={size} height={size} viewBox="0 0 64 64" className={baseClass}>
        <circle cx="32" cy="32" r="30" fill={colors.white} stroke={colors.primary} strokeWidth="2"/>
        {/* Pizza slice */}
        <path d="M20 40 L32 20 L44 40 Z" fill="#FFD700"/>
        <path d="M20 40 L32 20 L44 40 Z" fill="#FF6347" opacity="0.8"/>
        {/* Toppings */}
        <circle cx="30" cy="32" r="2" fill={colors.primary}/>
        <circle cx="36" cy="30" r="1.5" fill="#228B22"/>
        <circle cx="34" cy="36" r="1.5" fill="#FF6347"/>
      </svg>
    ),

    salad: (
      <svg width={size} height={size} viewBox="0 0 64 64" className={baseClass}>
        <circle cx="32" cy="32" r="30" fill={colors.white} stroke={colors.primary} strokeWidth="2"/>
        {/* Bowl */}
        <ellipse cx="32" cy="40" rx="14" ry="8" fill={colors.lightGray}/>
        {/* Salad leaves */}
        <ellipse cx="28" cy="32" rx="4" ry="6" fill="#228B22" transform="rotate(-20 28 32)"/>
        <ellipse cx="36" cy="30" rx="4" ry="6" fill="#32CD32" transform="rotate(15 36 30)"/>
        <ellipse cx="32" cy="28" rx="4" ry="6" fill="#90EE90" transform="rotate(-5 32 28)"/>
        {/* Tomato */}
        <circle cx="34" cy="34" r="2" fill="#FF6347"/>
      </svg>
    ),

    sushi: (
      <svg width={size} height={size} viewBox="0 0 64 64" className={baseClass}>
        <circle cx="32" cy="32" r="30" fill={colors.white} stroke={colors.primary} strokeWidth="2"/>
        {/* Sushi roll */}
        <ellipse cx="32" cy="32" rx="12" ry="8" fill="#2F4F4F"/>
        <ellipse cx="32" cy="32" rx="8" ry="5" fill={colors.white}/>
        <ellipse cx="32" cy="32" rx="4" ry="2.5" fill="#FF6347"/>
        {/* Fish topping */}
        <ellipse cx="32" cy="26" rx="6" ry="3" fill={colors.primary}/>
      </svg>
    ),

    market: (
      <svg width={size} height={size} viewBox="0 0 64 64" className={baseClass}>
        <circle cx="32" cy="32" r="30" fill={colors.white} stroke={colors.primary} strokeWidth="2"/>
        {/* Basket */}
        <path d="M20 35 L44 35 L42 45 L22 45 Z" fill="#8B4513"/>
        <path d="M20 35 L44 35" stroke="#654321" strokeWidth="2"/>
        {/* Fruits */}
        <circle cx="28" cy="30" r="3" fill="#FF6347"/>
        <circle cx="36" cy="28" r="3" fill="#32CD32"/>
        <circle cx="32" cy="26" r="2.5" fill="#FFD700"/>
      </svg>
    ),

    pharmacy: (
      <svg width={size} height={size} viewBox="0 0 64 64" className={baseClass}>
        <circle cx="32" cy="32" r="30" fill={colors.white} stroke={colors.primary} strokeWidth="2"/>
        {/* Cross */}
        <rect x="28" y="22" width="8" height="20" fill={colors.primary} rx="2"/>
        <rect x="22" y="28" width="20" height="8" fill={colors.primary} rx="2"/>
        {/* Pill */}
        <ellipse cx="38" cy="24" rx="3" ry="6" fill={colors.white} stroke={colors.primary} strokeWidth="1"/>
      </svg>
    ),

    delivery: (
      <svg width={size} height={size} viewBox="0 0 64 64" className={baseClass}>
        <circle cx="32" cy="32" r="30" fill={colors.white} stroke={colors.primary} strokeWidth="2"/>
        {/* Package */}
        <rect x="24" y="26" width="16" height="12" fill="#8B4513" rx="2"/>
        <path d="M24 32 L40 32" stroke={colors.white} strokeWidth="2"/>
        <path d="M32 26 L32 38" stroke={colors.white} strokeWidth="2"/>
        {/* Speed lines */}
        <path d="M18 20 L22 20" stroke={colors.primary} strokeWidth="2"/>
        <path d="M18 24 L24 24" stroke={colors.primary} strokeWidth="2"/>
        <path d="M18 28 L22 28" stroke={colors.primary} strokeWidth="2"/>
      </svg>
    )
  };

  // Bottom navigation icons
  const navIcons = {
    home: (
      <svg width={size/2} height={size/2} viewBox="0 0 24 24" className={baseClass}>
        <path 
          d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" 
          fill={active ? colors.primaryGradient : colors.gray}
        />
      </svg>
    ),

    orders: (
      <svg width={size/2} height={size/2} viewBox="0 0 24 24" className={baseClass}>
        <path 
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" 
          fill={active ? colors.primaryGradient : colors.gray}
        />
        <path d="M14 2v6h6" fill="none" stroke={colors.white} strokeWidth="2"/>
        <path d="M16 13H8" stroke={colors.white} strokeWidth="2"/>
        <path d="M16 17H8" stroke={colors.white} strokeWidth="2"/>
        <path d="M10 9H8" stroke={colors.white} strokeWidth="2"/>
      </svg>
    ),

    track: (
      <svg width={size/2} height={size/2} viewBox="0 0 24 24" className={baseClass}>
        <defs>
          <linearGradient id="go7-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e60023"/>
            <stop offset="100%" stopColor="#ff3b30"/>
          </linearGradient>
        </defs>
        <path 
          d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" 
          fill={active ? colors.primaryGradient : colors.gray}
        />
        <circle cx="12" cy="10" r="3" fill={colors.white}/>
        {active && (
          <circle cx="12" cy="10" r="8" fill="none" stroke={colors.primary} strokeWidth="2" opacity="0.5">
            <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite"/>
          </circle>
        )}
      </svg>
    ),

    chat: (
      <svg width={size/2} height={size/2} viewBox="0 0 24 24" className={baseClass}>
        <path 
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" 
          fill={active ? colors.primaryGradient : colors.gray}
        />
        {/* Notification badge */}
        <circle cx="18" cy="6" r="3" fill={colors.primary}/>
        <text x="18" y="7" textAnchor="middle" fill={colors.white} fontSize="8" fontWeight="bold">3</text>
      </svg>
    ),

    profile: (
      <svg width={size/2} height={size/2} viewBox="0 0 24 24" className={baseClass}>
        <path 
          d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" 
          fill={active ? colors.primaryGradient : colors.gray}
        />
        <circle cx="12" cy="7" r="4" fill={active ? colors.primaryGradient : colors.gray}/>
      </svg>
    )
  };

  const iconMap = { ...categoryIcons, ...navIcons };
  const IconComponent = iconMap[type];

  if (!IconComponent) {
    console.warn(`Icon type "${type}" not found`);
    return null;
  }

  return (
    <div 
      className={`${baseClass} ${activeClass}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={alt || `${type} icon`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease',
        display: 'inline-block'
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {IconComponent}
    </div>
  );
};

export default Go7Icon;