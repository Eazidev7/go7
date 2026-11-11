import React from 'react';
import { Button } from './button';

export interface EmptyStateProps {
  /**
   * The icon to display
   */
  icon?: React.ReactNode;
  
  /**
   * The title of the empty state
   */
  title: string;
  
  /**
   * The description text
   */
  description: string;
  
  /**
   * Action button text
   */
  actionText?: string;
  
  /**
   * Action button handler
   */
  onAction?: () => void;
  
  /**
   * Action button href (alternative to onAction)
   */
  actionHref?: string;
  
  /**
   * Custom illustration component
   */
  illustration?: React.ReactNode;
  
  /**
   * Size variant
   * @default "default"
   */
  size?: 'small' | 'default' | 'large';
  
  /**
   * Custom className
   */
  className?: string;
}

/**
 * Default empty state icons
 */
const DefaultIcons = {
  vendors: (
    <svg 
      className="mx-auto h-24 w-24 text-gray-300" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1} 
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
      />
    </svg>
  ),
  markets: (
    <svg 
      className="mx-auto h-24 w-24 text-gray-300" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1} 
        d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0L17 21m-7.5-3h7.5M9 9h1m4 0h1m-6 4h1m4 0h1" 
      />
    </svg>
  ),
  orders: (
    <svg 
      className="mx-auto h-24 w-24 text-gray-300" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1} 
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
      />
    </svg>
  ),
  search: (
    <svg 
      className="mx-auto h-24 w-24 text-gray-300" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1} 
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
      />
    </svg>
  ),
  generic: (
    <svg 
      className="mx-auto h-24 w-24 text-gray-300" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1} 
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
      />
    </svg>
  )
};

/**
 * Friendly illustration component
 */
const FriendlyIllustration: React.FC<{ type: 'vendors' | 'markets' | 'orders' | 'search' | 'generic' }> = ({ type }) => {
  const illustrations = {
    vendors: (
      <div className="mb-6">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center">
          <span className="text-4xl">🍔</span>
        </div>
      </div>
    ),
    markets: (
      <div className="mb-6">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
          <span className="text-4xl">🛒</span>
        </div>
      </div>
    ),
    orders: (
      <div className="mb-6">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
          <span className="text-4xl">📦</span>
        </div>
      </div>
    ),
    search: (
      <div className="mb-6">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
          <span className="text-4xl">🔍</span>
        </div>
      </div>
    ),
    generic: (
      <div className="mb-6">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
          <span className="text-4xl">📋</span>
        </div>
      </div>
    )
  };

  return illustrations[type] || illustrations.generic;
};

/**
 * Empty state component with friendly illustrations and clear CTAs
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionHref,
  illustration,
  size = 'default',
  className = ''
}) => {
  const sizeClasses = {
    small: 'py-8 max-w-sm',
    default: 'py-12 max-w-md',
    large: 'py-16 max-w-lg'
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionHref) {
      window.location.href = actionHref;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} ${className}`}>
      <div className="text-center">
        {illustration || icon || DefaultIcons.generic}
        
        <h3 className={`font-medium text-gray-900 mb-2 ${
          size === 'small' ? 'text-base' : size === 'large' ? 'text-xl' : 'text-lg'
        }`}>
          {title}
        </h3>
        
        <p className={`text-gray-500 mb-6 ${
          size === 'small' ? 'text-sm' : 'text-base'
        }`}>
          {description}
        </p>
        
        {(actionText && (onAction || actionHref)) && (
          <Button
            variant="primary"
            size={size === 'small' ? 'md' : 'lg'}
            onClick={handleAction}
            className="inline-flex items-center"
          >
            {actionText}
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Pre-configured empty state components for common scenarios
 */
export const VendorsEmptyState: React.FC<{
  selectedArea?: string;
  onViewAllAreas?: () => void;
}> = ({ selectedArea, onViewAllAreas }) => (
  <EmptyState
    illustration={<FriendlyIllustration type="vendors" />}
    title="No vendors open right now"
    description={
      selectedArea 
        ? `No food vendors are currently available in ${selectedArea}.` 
        : 'All food vendors are currently closed. Check back later!'
    }
    actionText="See all areas"
    onAction={onViewAllAreas || (() => window.location.href = '/areas')}
  />
);

export const MarketsEmptyState: React.FC<{
  selectedArea?: string;
  onViewAllAreas?: () => void;
}> = ({ selectedArea, onViewAllAreas }) => (
  <EmptyState
    illustration={<FriendlyIllustration type="markets" />}
    title="No markets available right now"
    description={
      selectedArea 
        ? `No local markets are currently operating in ${selectedArea}.` 
        : 'All markets are currently closed. Check back during business hours!'
    }
    actionText="See all areas"
    onAction={onViewAllAreas || (() => window.location.href = '/areas')}
  />
);

export const OrdersEmptyState: React.FC<{
  onStartOrder?: () => void;
}> = ({ onStartOrder }) => (
  <EmptyState
    illustration={<FriendlyIllustration type="orders" />}
    title="No orders yet"
    description="Start your first delivery and we'll show your order history here."
    actionText="Book a delivery"
    onAction={onStartOrder || (() => window.location.href = '/book')}
  />
);

export const SearchEmptyState: React.FC<{
  searchTerm?: string;
  onClearSearch?: () => void;
}> = ({ searchTerm, onClearSearch }) => (
  <EmptyState
    illustration={<FriendlyIllustration type="search" />}
    title="No results found"
    description={
      searchTerm 
        ? `We couldn't find anything matching "${searchTerm}". Try different keywords.`
        : 'Try adjusting your search criteria.'
    }
    actionText={searchTerm ? "Clear search" : "Browse all"}
    onAction={onClearSearch}
  />
);

export default EmptyState;