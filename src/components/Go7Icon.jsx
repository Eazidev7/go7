import React from 'react';

const Go7Icon = ({ 
  type, 
  active = false, 
  size = 24, 
  className = '',
  onClick,
  alt = ''
}) => {
  const baseClass = `go7-icon ${className}`;
  
  // Go7 brand colors
  const colors = {
    primary: '#e60023',
    primaryLight: '#ff4d6d',
    white: '#ffffff',
    gray: '#9ca3af',
    darkGray: '#374151',
    lightGray: '#f9fafb'
  };

  // Professional category icons - minimalist stroke-based design
  const categoryIcons = {
    burger: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <circle 
          cx="12" 
          cy="12" 
          r="11" 
          fill={colors.white} 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="1.5"
        />
        {/* Realistic burger with layers */}
        <path 
          d="M5 8c0-1 1-2 3-2h8c2 0 3 1 3 2v1H5V8z" 
          fill="#8B4513" 
          stroke={active ? colors.primary : '#8B4513'} 
          strokeWidth="1"
        />
        <rect x="5" y="9" width="14" height="1.5" fill="#228B22" stroke="none" rx="0.5"/>
        <rect x="5" y="10.5" width="14" height="2" fill="#8B4513" stroke="none" rx="0.5"/>
        <rect x="5" y="12.5" width="14" height="1" fill="#FF6347" stroke="none" rx="0.5"/>
        <rect x="5" y="13.5" width="14" height="1" fill="#FFD700" stroke="none" rx="0.5"/>
        <path 
          d="M5 14.5c0 1 1 2 3 2h8c2 0 3-1 3-2v-1H5v1z" 
          fill="#8B4513" 
          stroke={active ? colors.primary : '#8B4513'} 
          strokeWidth="1"
        />
      </svg>
    ),

    pizza: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <circle 
          cx="12" 
          cy="12" 
          r="11" 
          fill={colors.white} 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="1.5"
        />
        {/* Realistic pizza slice */}
        <path 
          d="M12 5L6 18h12L12 5z" 
          fill="#FFD700" 
          stroke={active ? colors.primary : '#DAA520'} 
          strokeWidth="1"
        />
        <path 
          d="M12 5L6 18h12L12 5z" 
          fill="#FF6347" 
          stroke="none"
          opacity="0.6"
        />
        <circle cx="10" cy="12" r="0.8" fill="#8B0000"/>
        <circle cx="14" cy="10" r="0.8" fill="#8B0000"/>
        <circle cx="11" cy="15" r="0.8" fill="#8B0000"/>
        <circle cx="13" cy="14" r="0.6" fill="#FFFFFF"/>
        <circle cx="9" cy="14" r="0.6" fill="#FFFFFF"/>
      </svg>
    ),

    salad: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <circle 
          cx="12" 
          cy="12" 
          r="11" 
          fill={colors.white} 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="1.5"
        />
        {/* Realistic salad bowl */}
        <path 
          d="M7 14v2c0 1 1 1.5 2 1.5h6c1 0 2-0.5 2-1.5v-2" 
          fill="#F5F5F5" 
          stroke={active ? colors.primary : '#D3D3D3'} 
          strokeWidth="1"
        />
        <ellipse cx="9" cy="11" rx="2" ry="1.5" fill="#228B22" transform="rotate(-20 9 11)"/>
        <ellipse cx="13" cy="10" rx="1.5" ry="1" fill="#32CD32" transform="rotate(15 13 10)"/>
        <ellipse cx="11" cy="12" rx="1.8" ry="1.2" fill="#90EE90" transform="rotate(-10 11 12)"/>
        <ellipse cx="15" cy="12" rx="1.2" ry="0.8" fill="#228B22" transform="rotate(25 15 12)"/>
        <circle cx="10" cy="13" r="0.4" fill="#FF6347"/>
        <circle cx="14" cy="13" r="0.4" fill="#FF6347"/>
      </svg>
    ),

    sushi: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <circle 
          cx="12" 
          cy="12" 
          r="11" 
          fill={colors.white} 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="1.5"
        />
        {/* Realistic sushi nigiri */}
        <ellipse 
          cx="12" 
          cy="14" 
          rx="5" 
          ry="2" 
          fill="#FFFFFF" 
          stroke={active ? colors.primary : '#D3D3D3'} 
          strokeWidth="1"
        />
        <ellipse 
          cx="12" 
          cy="10" 
          rx="4" 
          ry="1.5" 
          fill="#FF6B6B" 
          stroke={active ? colors.primary : '#FF4444'} 
          strokeWidth="1"
        />
        <rect x="7" y="12" width="10" height="0.5" fill="#2D5016" rx="0.2"/>
        <circle cx="9" cy="10" r="0.3" fill="#FFFFFF" opacity="0.8"/>
        <circle cx="15" cy="10" r="0.3" fill="#FFFFFF" opacity="0.8"/>
      </svg>
    ),

    market: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <circle 
          cx="12" 
          cy="12" 
          r="11" 
          fill={colors.white} 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="1.5"
        />
        {/* Shopping basket */}
        <path 
          d="M7 10l1 8h8l1-8" 
          stroke={active ? colors.primary : colors.darkGray} 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M7 10h10l-1-3H8l-1 3z" 
          stroke={active ? colors.primary : colors.darkGray} 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <circle cx="10" cy="8" r="0.5" fill={active ? colors.primary : colors.darkGray}/>
        <circle cx="14" cy="8" r="0.5" fill={active ? colors.primary : colors.darkGray}/>
      </svg>
    ),

    pharmacy: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <circle 
          cx="12" 
          cy="12" 
          r="11" 
          fill={colors.white} 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="1.5"
        />
        {/* Medical cross */}
        <path 
          d="M12 8v8M8 12h8" 
          stroke={active ? colors.primary : colors.darkGray} 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        <rect 
          x="10" 
          y="6" 
          width="4" 
          height="2" 
          rx="0.5" 
          stroke={active ? colors.primary : colors.darkGray} 
          strokeWidth="1.5"
        />
      </svg>
    ),

    delivery: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <circle 
          cx="12" 
          cy="12" 
          r="11" 
          fill={colors.white} 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="1.5"
        />
        {/* Realistic delivery truck */}
        <rect x="6" y="10" width="8" height="4" fill="#4169E1" stroke={active ? colors.primary : '#4169E1'} strokeWidth="1" rx="0.5"/>
        <rect x="14" y="12" width="3" height="2" fill="#4169E1" stroke={active ? colors.primary : '#4169E1'} strokeWidth="1" rx="0.5"/>
        <path d="M14 12L16 10h1v2" fill="#4169E1" stroke="none"/>
        <circle cx="8" cy="16" r="1.5" fill="#2F2F2F" stroke={active ? colors.primary : '#2F2F2F'} strokeWidth="1"/>
        <circle cx="15" cy="16" r="1.5" fill="#2F2F2F" stroke={active ? colors.primary : '#2F2F2F'} strokeWidth="1"/>
        <circle cx="8" cy="16" r="0.8" fill="#C0C0C0"/>
        <circle cx="15" cy="16" r="0.8" fill="#C0C0C0"/>
        <rect x="7" y="11" width="2" height="1.5" fill="#87CEEB" stroke="none" rx="0.2"/>
        <rect x="10" y="11" width="2" height="1.5" fill="#87CEEB" stroke="none" rx="0.2"/>
      </svg>
    )
  };

  // Professional navigation icons - consistent with system icons
  const navIcons = {
    home: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <path 
          d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M9 22V12h6v10" 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    ),

    orders: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <path 
          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M14 2v6h6M16 13H8M16 17H8M10 9H8" 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    ),

    track: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <path 
          d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" 
          fill={colors.primary}
          stroke={colors.primary} 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <circle 
          cx="12" 
          cy="10" 
          r="3" 
          fill={colors.white}
          stroke={colors.white} 
          strokeWidth="1"
        />
        <circle 
          cx="12" 
          cy="10" 
          r="1.5" 
          fill={colors.primary}
        />
        {active && (
          <circle cx="12" cy="10" r="8" fill="none" stroke={colors.primaryLight} strokeWidth="1" opacity="0.5">
            <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite"/>
          </circle>
        )}
      </svg>
    ),

    chat: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <path 
          d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M8 9h8M8 13h6" 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        {/* Notification badge */}
        <circle cx="18" cy="6" r="3" fill={colors.primary}/>
        <text x="18" y="7" textAnchor="middle" fill={colors.white} fontSize="8" fontWeight="bold">3</text>
      </svg>
    ),

    profile: (
      <svg width={size} height={size} viewBox="0 0 24 24" className={baseClass} fill="none">
        <path 
          d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <circle 
          cx="12" 
          cy="7" 
          r="4" 
          stroke={active ? colors.primary : colors.gray} 
          strokeWidth="2"
        />
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
      className={`${baseClass} ${active ? 'active' : 'inactive'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={alt || `${type} icon`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'inline-block'
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {IconComponent}
    </div>
  );
};

export default Go7Icon;