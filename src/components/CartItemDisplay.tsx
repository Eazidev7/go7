import React from 'react';
import { CartItem } from '../services/cartService';
import { getUnitDisplayLabel } from '../types/measurementTypes';
import './CartItemDisplay.css';

interface CartItemDisplayProps {
  item: CartItem;
  onQuantityChange?: (itemId: string, newQuantity: number) => void;
  onRemove?: (itemId: string) => void;
  isEditable?: boolean;
}

export const CartItemDisplay: React.FC<CartItemDisplayProps> = ({
  item,
  onQuantityChange,
  onRemove,
  isEditable = true
}) => {
  const formatQuantityDisplay = () => {
    if (item.unitType) {
      const unitLabel = getUnitDisplayLabel(item.unitType, item.unitLabel);
      
      // Handle different unit types for display
      switch (item.unitType) {
        case 'kg':
          return `${item.qty}kg`;
        case 'spoon':
          return `${item.qty} spoon${item.qty > 1 ? 's' : ''}`;
        case 'tuber':
          return `${item.qty} tuber${item.qty > 1 ? 's' : ''}`;
        case 'piece':
          return `${item.qty} piece${item.qty > 1 ? 's' : ''}`;
        case 'pack':
          return `${item.qty} pack${item.qty > 1 ? 's' : ''}`;
        case 'custom':
          return `${item.qty} ${item.unitLabel || 'unit'}${item.qty > 1 ? 's' : ''}`;
        default:
          return `${item.qty}`;
      }
    }
    
    // Traditional quantity display
    return `Qty: ${item.qty}`;
  };

  const formatVariantDisplay = () => {
    if (item.selectedMeasurementVariant) {
      return item.selectedMeasurementVariant.label;
    }
    return null;
  };

  const formatAddonDisplay = () => {
    if (!item.addonMeasurements) return null;

    return Object.entries(item.addonMeasurements).map(([addonId, measurement]) => {
      let displayText = `${measurement.qty}`;
      
      if (measurement.unitType) {
        const unitLabel = getUnitDisplayLabel(measurement.unitType, measurement.unitLabel);
        switch (measurement.unitType) {
          case 'kg':
            displayText = `${measurement.qty}kg`;
            break;
          case 'spoon':
            displayText = `${measurement.qty} spoon${measurement.qty > 1 ? 's' : ''}`;
            break;
          case 'tuber':
            displayText = `${measurement.qty} tuber${measurement.qty > 1 ? 's' : ''}`;
            break;
          case 'piece':
            displayText = `${measurement.qty} piece${measurement.qty > 1 ? 's' : ''}`;
            break;
          case 'pack':
            displayText = `${measurement.qty} pack${measurement.qty > 1 ? 's' : ''}`;
            break;
          default:
            displayText = `${measurement.qty} ${measurement.unitLabel || 'unit'}${measurement.qty > 1 ? 's' : ''}`;
        }
      }

      return (
        <div key={addonId} className="addon-measurement">
          {measurement.variant ? (
            <span>{measurement.variant.label} - {displayText}</span>
          ) : (
            <span>{displayText}</span>
          )}
        </div>
      );
    });
  };

  return (
    <div className="cart-item-display">
      <div className="cart-item-image">
        <img 
          src={item.productImageUrl || '/placeholder-product.jpg'} 
          alt={item.productName}
          onError={(e) => {
            e.currentTarget.src = '/placeholder-product.jpg';
          }}
        />
      </div>
      
      <div className="cart-item-details">
        <h4 className="cart-item-name">{item.productName}</h4>
        
        {/* Variant Display */}
        {formatVariantDisplay() && (
          <div className="cart-item-variant">
            <span className="variant-label">{formatVariantDisplay()}</span>
          </div>
        )}
        
        {/* Quantity with Unit Label */}
        <div className="cart-item-quantity">
          <span className="quantity-label">{formatQuantityDisplay()}</span>
        </div>
        
        {/* Addon Measurements */}
        {item.addonMeasurements && Object.keys(item.addonMeasurements).length > 0 && (
          <div className="cart-item-addons">
            <span className="addons-label">Add-ons:</span>
            {formatAddonDisplay()}
          </div>
        )}
        
        {/* Price */}
        <div className="cart-item-price">
          <span className="price">₦{item.priceAtAdd.toLocaleString()}</span>
        </div>
      </div>
      
      {/* Quantity Controls (if editable) */}
      {isEditable && onQuantityChange && (
        <div className="cart-item-controls">
          <button
            className="quantity-btn decrease"
            onClick={() => onQuantityChange(item.id!, Math.max(1, item.qty - 1))}
            disabled={item.qty <= 1}
            aria-label="Decrease quantity"
          >
            -
          </button>
          <button
            className="quantity-btn increase"
            onClick={() => onQuantityChange(item.id!, item.qty + 1)}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      )}
      
      {/* Remove Button */}
      {isEditable && onRemove && (
        <button
          className="remove-btn"
          onClick={() => onRemove(item.id!)}
          aria-label="Remove item"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
};