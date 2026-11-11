import React from 'react';
import './VariantSelector.css';

interface Variant {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  isAvailable: boolean;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariant: Variant | null;
  onVariantSelect: (variant: Variant) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariant,
  onVariantSelect
}) => {
  return (
    <div className="variant-selector">
      <h3 className="section-title">Choose Size/Type</h3>
      <div className="variant-grid">
        {variants.map((variant) => (
          <button
            key={variant.id}
            className={`variant-tile ${
              selectedVariant?.id === variant.id ? 'selected' : ''
            } ${!variant.isAvailable ? 'disabled' : ''}`}
            onClick={() => variant.isAvailable && onVariantSelect(variant)}
            disabled={!variant.isAvailable}
            aria-label={`Select ${variant.name} for ₦${variant.price.toLocaleString()}`}
          >
            {/* Variant Image */}
            {variant.imageUrl && (
              <div className="variant-image">
                <img 
                  src={variant.imageUrl} 
                  alt={variant.name}
                  loading="lazy"
                />
              </div>
            )}
            
            {/* Variant Info */}
            <div className="variant-info">
              <h4 className="variant-name">{variant.name}</h4>
              <div className="variant-price">₦{variant.price.toLocaleString()}</div>
              
              {/* Stock Info */}
              {variant.stock !== undefined && variant.stock !== null && (
                <div className="stock-info">
                  {variant.stock > 0 ? (
                    <span className="stock-available">
                      {variant.stock < 10 ? `Only ${variant.stock} left` : 'In stock'}
                    </span>
                  ) : (
                    <span className="stock-out">Out of stock</span>
                  )}
                </div>
              )}
            </div>

            {/* Selection Indicator */}
            {selectedVariant?.id === variant.id && (
              <div className="selection-indicator">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path 
                    d="M13.5 4.5L6 12L2.5 8.5" 
                    stroke="#FFFFFF" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            {/* Unavailable Overlay */}
            {!variant.isAvailable && (
              <div className="unavailable-overlay">
                <span>Unavailable</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};