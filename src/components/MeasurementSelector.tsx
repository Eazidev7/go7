import React from 'react';
import { UnitType, MeasurementVariant, getUnitStepSize, getMaxQuantity, getUnitDisplayLabel } from '../types/measurementTypes';
import './MeasurementSelector.css';

interface MeasurementSelectorProps {
  unitType: UnitType;
  unitLabel?: string;
  customLabel?: string;
  variants?: MeasurementVariant[];
  quantity: number;
  selectedVariant?: MeasurementVariant;
  maxQty?: number;
  minQty?: number;
  onQuantityChange: (quantity: number) => void;
  onVariantChange?: (variant: MeasurementVariant | null) => void;
}

export const MeasurementSelector: React.FC<MeasurementSelectorProps> = ({
  unitType,
  unitLabel,
  customLabel,
  variants,
  quantity,
  selectedVariant,
  maxQty,
  minQty = 1,
  onQuantityChange,
  onVariantChange
}) => {
  const stepSize = getUnitStepSize(unitType);
  const maxQuantity = maxQty || getMaxQuantity(unitType);
  const displayLabel = getUnitDisplayLabel(unitType, unitLabel, customLabel);

  const handleQuantityChange = (newQuantity: number) => {
    const clampedQuantity = Math.max(minQty, Math.min(maxQuantity, newQuantity));
    onQuantityChange(clampedQuantity);
  };

  const renderVariantSelector = () => {
    if (!variants || variants.length === 0) return null;

    return (
      <div className="measurement-variant-selector">
        <label className="measurement-label">Select Size/Type</label>
        <div className="variant-buttons">
          {variants.map((variant) => (
            <button
              key={variant.id}
              className={`variant-btn ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
              onClick={() => onVariantChange?.(variant)}
            >
              <div className="variant-info">
                <span className="variant-label">{variant.label}</span>
                <span className="variant-price">₦{variant.price.toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderQuantitySelector = () => {
    switch (unitType) {
      case 'spoon':
        return (
          <div className="measurement-quantity-selector">
            <label className="measurement-label">Number of Spoons</label>
            <div className="spoon-stepper">
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= minQty}
              >
                -
              </button>
              <span className="quantity-display">{quantity}</span>
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                +
              </button>
            </div>
            <div className="quantity-hint">Max: {maxQuantity} spoons</div>
          </div>
        );

      case 'tuber':
        return (
          <div className="measurement-quantity-selector">
            <label className="measurement-label">Number of Tubers</label>
            <div className="tuber-stepper">
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= minQty}
              >
                -
              </button>
              <span className="quantity-display">{quantity}</span>
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                +
              </button>
            </div>
          </div>
        );

      case 'pack':
        return (
          <div className="measurement-quantity-selector">
            <label className="measurement-label">Number of Packs</label>
            <div className="pack-stepper">
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= minQty}
              >
                -
              </button>
              <span className="quantity-display">{quantity}</span>
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                +
              </button>
            </div>
          </div>
        );

      case 'kg':
        return (
          <div className="measurement-quantity-selector">
            <label className="measurement-label">Weight (kg)</label>
            <div className="kg-input">
              <input
                type="number"
                value={quantity}
                min={minQty}
                max={maxQuantity}
                step={stepSize}
                onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || minQty)}
                className="kg-input-field"
              />
              <span className="unit-suffix">kg</span>
            </div>
          </div>
        );

      case 'piece':
        return (
          <div className="measurement-quantity-selector">
            <label className="measurement-label">Number of Pieces</label>
            <div className="piece-stepper">
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= minQty}
              >
                -
              </button>
              <span className="quantity-display">{quantity}</span>
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                +
              </button>
            </div>
          </div>
        );

      case 'custom':
      default:
        return (
          <div className="measurement-quantity-selector">
            <label className="measurement-label">{displayLabel}</label>
            <div className="custom-stepper">
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity - stepSize)}
                disabled={quantity <= minQty}
              >
                -
              </button>
              <span className="quantity-display">{quantity}</span>
              <button
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity + stepSize)}
                disabled={quantity >= maxQuantity}
              >
                +
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="measurement-selector">
      <div className="measurement-header">
        <h3 className="measurement-title">{displayLabel}</h3>
      </div>
      
      {renderVariantSelector()}
      {renderQuantitySelector()}
    </div>
  );
};