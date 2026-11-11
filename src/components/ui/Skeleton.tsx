import React, { HTMLAttributes } from 'react';
import './Skeleton.css';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The variant of skeleton to display
   * @default "text"
   */
  variant?: 'text' | 'card' | 'list' | 'hero' | 'avatar' | 'button' | 'image';
  
  /**
   * Width of the skeleton
   */
  width?: string | number;
  
  /**
   * Height of the skeleton
   */
  height?: string | number;
  
  /**
   * Animation type
   * @default "pulse"
   */
  animation?: 'pulse' | 'wave' | 'none';
  
  /**
   * Disable animation
   * @default false
   */
  disableAnimation?: boolean;
  
  /**
   * Custom className
   */
  className?: string;
}

/**
 * Skeleton component for loading states
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  disableAnimation = false,
  className = '',
  style,
  ...props
}) => {
  const skeletonClasses = [
    'go7-skeleton',
    `go7-skeleton-${variant}`,
    disableAnimation ? '' : `go7-skeleton-${animation}`,
    className
  ].filter(Boolean).join(' ');

  const skeletonStyle = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
    ...style
  };

  return (
    <div 
      className={skeletonClasses}
      style={skeletonStyle}
      aria-hidden="true"
      {...props}
    />
  );
};

/**
 * Card skeleton with multiple elements
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`go7-skeleton-card-container ${className}`}>
    <Skeleton variant="image" height={160} className="go7-skeleton-card-image" />
    <div className="go7-skeleton-card-content">
      <Skeleton variant="text" width="80%" height={20} />
      <Skeleton variant="text" width="60%" height={16} />
      <div className="go7-skeleton-card-meta">
        <Skeleton variant="text" width="40%" height={14} />
        <Skeleton variant="text" width="30%" height={14} />
      </div>
      <Skeleton variant="button" width={100} height={32} />
    </div>
  </div>
);

/**
 * List item skeleton
 */
export const ListSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`go7-skeleton-list-container ${className}`}>
    <Skeleton variant="avatar" width={48} height={48} />
    <div className="go7-skeleton-list-content">
      <Skeleton variant="text" width="70%" height={18} />
      <Skeleton variant="text" width="50%" height={14} />
    </div>
    <Skeleton variant="button" width={80} height={28} />
  </div>
);

/**
 * Hero image skeleton
 */
export const HeroSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`go7-skeleton-hero-container ${className}`}>
    <Skeleton variant="hero" height={300} />
    <div className="go7-skeleton-hero-overlay">
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="text" width="40%" height={18} />
      <div className="go7-skeleton-hero-actions">
        <Skeleton variant="button" width={120} height={40} />
        <Skeleton variant="button" width={100} height={40} />
      </div>
    </div>
  </div>
);

/**
 * Grid skeleton with multiple cards
 */
export const GridSkeleton: React.FC<{ 
  count?: number; 
  columns?: number;
  className?: string;
}> = ({ 
  count = 6, 
  columns = 3,
  className = '' 
}) => (
  <div 
    className={`go7-skeleton-grid ${className}`}
    style={{ 
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '1rem'
    }}
  >
    {Array.from({ length: count }, (_, index) => (
      <CardSkeleton key={index} />
    ))}
  </div>
);

export default Skeleton;