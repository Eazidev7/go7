import React, { useState } from 'react';
import { UnitType, MeasurementVariant, getUnitDisplayLabel } from '../types/measurementTypes';
import './MeasurementUnitConfig.css';

interface MeasurementUnitConfigProps {
  initialUnitType?: UnitType;
  initialUnitLabel?: string;
  initialVariants?: MeasurementVariant[];
  initialMaxQty?: number;
  initialMinQty?: number;
  initialCustomLabel?: string;
  onSave: (config: MeasurementUnitConfig) => void;
  onCancel?: () => void;
}

export interface MeasurementUnitConfig {
  unitType: UnitType;
  unitLabel: string;
  variants: MeasurementVariant[];
  maxQty: number;
  minQty: number;
  customLabel?: string;
}

export const MeasurementUnitConfig: React.FC<MeasurementUnitConfigProps> = ({
  initialUnitType = 'piece',
  initialUnitLabel = '',
  initialVariants = [],
  initialMaxQty = 50,
  initialMinQty = 1,
  initialCustomLabel = '',
  onSave,
  onCancel
}) => {
  const [unitType, setUnitType] = useState<UnitType>(initialUnitType);
  const [unitLabel, setUnitLabel] = useState(initialUnitLabel || getUnitDisplayLabel(initialUnitType));
  const [variants, setVariants] = useState<MeasurementVariant[]>(initialVariants);
  const [maxQty, setMaxQty] = useState(initialMaxQty);
  const [minQty, setMinQty] = useState(initialMinQty);
  const [customLabel, setCustomLabel] = useState(initialCustomLabel);
  
  // Variant form state
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<MeasurementVariant | null>(null);
  const [variantForm, setVariantForm] = useState({
    label: '',
    price: '',
    imageUrl: '',
    description: ''
  });

  const unitTypeOptions: { value: UnitType; label: string; description: string }[] = [
    { value: 'tuber', label: 'Tuber', description: 'Sold per tuber (e.g., yam, potato)' },
    { value: 'pack', label: 'Pack', description: 'Fixed pack sizes (e.g., 500g pack, 1kg pack)' },
    { value: 'spoon', label: 'Spoon', description: 'Per scoop/spoon (integer quantities)' },
    { value: 'piece', label: 'Piece', description: 'Discrete items (e.g., plantain, apple)' },
    { value: 'kg', label: 'Weight (kg)', description: 'Sold by weight in kilograms' },
    { value: 'custom', label: 'Custom Unit', description: 'Define your own unit label' }
  ];

  const handleUnitTypeChange = (newUnitType: UnitType) => {
    setUnitType(newUnitType);
    setUnitLabel(getUnitDisplayLabel(newUnitType));
    setVariants([]); // Clear variants when changing unit type
  };

  const handleAddVariant = () => {
    setShowVariantForm(true);
    setEditingVariant(null);
    setVariantForm({ label: '', price: '', imageUrl: '', description: '' });
  };

  const handleEditVariant = (variant: MeasurementVariant) => {
    setShowVariantForm(true);
    setEditingVariant(variant);
    setVariantForm({
      label: variant.label,
      price: variant.price.toString(),
      imageUrl: variant.imageUrl || '',
      description: variant.description || ''
    });
  };

  const handleSaveVariant = () => {
    if (!variantForm.label || !variantForm.price) return;

    const variant: MeasurementVariant = {
      id: editingVariant?.id || `variant_${Date.now()}`,
      label: variantForm.label,
      price: parseFloat(variantForm.price),
      imageUrl: variantForm.imageUrl || undefined,
      description: variantForm.description || undefined
    };

    if (editingVariant) {
      setVariants(prev => prev.map(v => v.id === editingVariant.id ? variant : v));
    } else {
      setVariants(prev => [...prev, variant]);
    }

    setShowVariantForm(false);
    setEditingVariant(null);
  };

  const handleDeleteVariant = (variantId: string) => {
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const handleSave = () => {
    const config: MeasurementUnitConfig = {
      unitType,
      unitLabel: unitType === 'custom' ? customLabel : unitLabel,
      variants,
      maxQty,
      minQty,
      customLabel: unitType === 'custom' ? customLabel : undefined
    };
    onSave(config);
  };

  const requiresVariants = ['tuber', 'pack'].includes(unitType);

  return (
    <div className="measurement-unit-config">
      <div className="config-header">
        <h3>Configure Measurement Unit</h3>
        <p>Set up how customers will select quantities for this product/addon</p>
      </div>

      {/* Unit Type Selection */}
      <div className="config-section">
        <label className="section-label">Unit Type</label>
        <div className="unit-type-grid">
          {unitTypeOptions.map(option => (
            <div
              key={option.value}
              className={`unit-type-card ${unitType === option.value ? 'selected' : ''}`}
              onClick={() => handleUnitTypeChange(option.value)}
            >
              <div className="unit-type-header">
                <h4>{option.label}</h4>
              </div>
              <p>{option.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Label (for custom unit type) */}
      {unitType === 'custom' && (
        <div className="config-section">
          <label className="section-label">Custom Unit Label</label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g., Bundle, Sachet, Container"
            className="form-input"
          />
        </div>
      )}

      {/* Unit Label */}
      <div className="config-section">
        <label className="section-label">Display Label</label>
        <input
          type="text"
          value={unitLabel}
          onChange={(e) => setUnitLabel(e.target.value)}
          placeholder="e.g., Per Tuber, Per Pack"
          className="form-input"
        />
      </div>

      {/* Quantity Limits */}
      <div className="config-section">
        <label className="section-label">Quantity Limits</label>
        <div className="quantity-limits">
          <div className="limit-field">
            <label>Minimum</label>
            <input
              type="number"
              value={minQty}
              onChange={(e) => setMinQty(parseInt(e.target.value) || 1)}
              min="1"
              className="form-input small"
            />
          </div>
          <div className="limit-field">
            <label>Maximum</label>
            <input
              type="number"
              value={maxQty}
              onChange={(e) => setMaxQty(parseInt(e.target.value) || 50)}
              min="1"
              className="form-input small"
            />
          </div>
        </div>
      </div>

      {/* Variants Section */}
      <div className="config-section">
        <div className="variants-header">
          <label className="section-label">
            Variants {requiresVariants ? <span className="required">*</span> : <span className="optional">(Optional)</span>}
          </label>
          <button
            type="button"
            onClick={handleAddVariant}
            className="add-variant-btn"
          >
            + Add Variant
          </button>
        </div>

        {variants.length > 0 && (
          <div className="variants-list">
            {variants.map(variant => (
              <div key={variant.id} className="variant-item">
                <div className="variant-info">
                  <h4>{variant.label}</h4>
                  <p>₦{variant.price.toLocaleString()}</p>
                  {variant.description && (
                    <span className="variant-description">{variant.description}</span>
                  )}
                </div>
                <div className="variant-actions">
                  <button
                    type="button"
                    onClick={() => handleEditVariant(variant)}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteVariant(variant.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {requiresVariants && variants.length === 0 && (
          <div className="variants-required-notice">
            <p>This unit type requires at least one variant (e.g., Small, Medium, Large)</p>
          </div>
        )}
      </div>

      {/* Variant Form Modal */}
      {showVariantForm && (
        <div className="variant-form-modal">
          <div className="variant-form">
            <h4>{editingVariant ? 'Edit Variant' : 'Add Variant'}</h4>
            
            <div className="form-field">
              <label>Variant Label</label>
              <input
                type="text"
                value={variantForm.label}
                onChange={(e) => setVariantForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Small Tuber, 500g Pack"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label>Price (₦)</label>
              <input
                type="number"
                value={variantForm.price}
                onChange={(e) => setVariantForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0"
                className="form-input"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-field">
              <label>Image URL (Optional)</label>
              <input
                type="url"
                value={variantForm.imageUrl}
                onChange={(e) => setVariantForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label>Description (Optional)</label>
              <textarea
                value={variantForm.description}
                onChange={(e) => setVariantForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details about this variant"
                className="form-textarea"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowVariantForm(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVariant}
                className="save-btn"
                disabled={!variantForm.label || !variantForm.price}
              >
                Save Variant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="config-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="save-btn"
          disabled={requiresVariants && variants.length === 0}
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
};