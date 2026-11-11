/**
 * 📏 MEASUREMENT INPUT COMPONENT
 * 
 * Smart input component that adapts based on measurement type:
 * - Shows appropriate input type (number/select)
 * - Validates input based on measurement rules
 * - Provides helpful UI hints and examples
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Info, AlertCircle } from 'lucide-react';
import { 
  MeasurementType, 
  MEASUREMENT_CONFIGS, 
  validateQuantity, 
  formatQuantity,
  getQuantityInputProps 
} from '../utils/measurementUtils';

interface MeasurementInputProps {
  measurementType: MeasurementType;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  showHint?: boolean;
}

const MeasurementInput: React.FC<MeasurementInputProps> = ({
  measurementType,
  value,
  onChange,
  label,
  error,
  disabled = false,
  className = '',
  showHint = true
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const config = MEASUREMENT_CONFIGS[measurementType];
  const inputProps = getQuantityInputProps(measurementType);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const numericValue = parseFloat(newValue);
    
    if (isNaN(numericValue)) {
      setValidationError('Please enter a valid number');
      return;
    }
    
    // Validate the quantity
    const validation = validateQuantity(numericValue, measurementType);
    
    if (validation.isValid) {
      setValidationError(null);
      onChange(numericValue);
    } else {
      setValidationError(validation.error || null);
    }
  };

  const handleBlur = () => {
    // Format the value on blur if valid
    const numericValue = parseFloat(inputValue);
    if (!isNaN(numericValue) && !validationError) {
      const formatted = config.allowDecimals 
        ? numericValue.toString() 
        : Math.floor(numericValue).toString();
      setInputValue(formatted);
    }
  };

  const increment = () => {
    const currentValue = parseFloat(inputValue) || 0;
    const newValue = Math.min(currentValue + config.step, config.maxValue);
    setInputValue(newValue.toString());
    onChange(newValue);
    setValidationError(null);
  };

  const decrement = () => {
    const currentValue = parseFloat(inputValue) || 0;
    const newValue = Math.max(currentValue - config.step, config.minValue);
    setInputValue(newValue.toString());
    onChange(newValue);
    setValidationError(null);
  };

  const displayError = error || validationError;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          <span className="text-gray-500 ml-1">({config.unit})</span>
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <div className="flex">
          {/* Decrement Button */}
          <button
            type="button"
            onClick={decrement}
            disabled={disabled || parseFloat(inputValue) <= config.minValue}
            className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            -
          </button>

          {/* Input Field */}
          <input
            type={inputProps.type}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            min={inputProps.min}
            max={inputProps.max}
            step={inputProps.step}
            placeholder={inputProps.placeholder}
            disabled={disabled}
            className={`flex-1 px-3 py-2 border text-center focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
              displayError 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />

          {/* Increment Button */}
          <button
            type="button"
            onClick={increment}
            disabled={disabled || parseFloat(inputValue) >= config.maxValue}
            className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            +
          </button>
        </div>

        {/* Unit Label Overlay */}
        <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
          {config.label.toLowerCase()}
        </div>
      </div>

      {/* Error Message */}
      {displayError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-red-600"
        >
          <AlertCircle size={14} />
          <span>{displayError}</span>
        </motion.div>
      )}

      {/* Hint */}
      {showHint && !displayError && (
        <div className="flex items-start gap-2 text-sm text-gray-500">
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">{config.description}</div>
            <div className="text-xs mt-1">
              Range: {config.minValue} - {config.maxValue} {config.unit}
              {config.examples.length > 0 && (
                <span className="ml-2">
                  Examples: {config.examples.slice(0, 2).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formatted Display */}
      {value > 0 && !displayError && (
        <div className="text-sm text-green-600 font-medium">
          Selected: {formatQuantity(value, measurementType)}
        </div>
      )}
    </div>
  );
};

export default MeasurementInput;