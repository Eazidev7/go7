import React, { useState } from 'react';
import './AddOnSelector.css';

interface AddOn {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  countable: boolean;
  maxQuantity?: number;
}

interface AddOnSelectorProps {
  addon: AddOn;
  isSelected: boolean;
  quantity: number;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
}

export const AddOnSelector: React.FC<AddOnSelectorProps> = ({
  addon,
  isSelected,
  quantity,
  onToggle,
  onQuantityChange
}) => {
  const [tempQuantity, setTempQuantity] = useState(quantity);

  const handleQuantityChange = (newQuantity: number) => {
    const clampedQuantity = Math.max(1, Math.min(addon.maxQuantity || 10, newQuantity));
    setTempQuantity(clampedQuantity);
    onQuantityChange(clampedQuantity);
  };

  const calculateDisplayPrice = () => {
    if (!isSelected) return addon.price;
    return addon.countable ? addon.price * quantity : addon.price;
  };

  return (
    <div className={`addon-selector ${isSelected ? 'selected' : ''} ${!addon.isAvailable ? 'disabled' : ''}`}>
      <div className="addon-main" onClick={addon.isAvailable ? onToggle : undefined}>
        {/* Add-on Image */}
        {addon.imageUrl && (
          <div className="addon-image">
            <img 
              src={addon.imageUrl} 
              alt={addon.name}
              loading="lazy"
            />
          </div>
        )}

        {/* Add-on Info */}
        <div className="addon-info">
          <h4 className="addon-name">{addon.name}</h4>
          <div className="addon-price">
            +₦{calculateDisplayPrice().toLocaleString()}
            {addon.countable && isSelected && quantity > 1 && (
              <span className="price-breakdown">
                (₦{addon.price.toLocaleString()} × {quantity})
              </span>
            )}
          </div>
        </div>

        {/* Selection Checkbox */}
        <div className="addon-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            disabled={!addon.isAvailable}
            aria-label={`${isSelected ? 'Remove' : 'Add'} ${addon.name}`}
          />
          <div className="checkbox-custom">
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path 
                  d="M10.5 3L4.5 9L1.5 6" 
                  stroke="#FFFFFF" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Quantity Controls for Countable Add-ons */}
      {isSelected && addon.countable && addon.isAvailable && (
        <div className="addon-quantity">
          <div className="quantity-controls">
            <button
              className="quantity-btn"
              onClick={() => handleQuantityChange(tempQuantity - 1)}
              disabled={tempQuantity <= 1}
              aria-label="Decrease quantity"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 7H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            
            <div className="quantity-display">
              <span>{tempQuantity}</span>
            </div>
            
            <button
              className="quantity-btn"
              onClick={() => handleQuantityChange(tempQuantity + 1)}
              disabled={tempQuantity >= (addon.maxQuantity || 10)}
              aria-label="Increase quantity"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path 
                  d="M7 3.5V10.5M3.5 7H10.5" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Unavailable State */}
      {!addon.isAvailable && (
        <div className="addon-unavailable">
          <span>Currently unavailable</span>
        </div>
      )}
    </div>
  );
};