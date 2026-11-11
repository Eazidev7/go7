import React from 'react';

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  as?: 'input' | 'textarea' | 'select';
  children?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
  helpText?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  className?: string;
  min?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  as = 'input',
  children,
  suffix,
  error,
  helpText,
  value,
  onChange,
  onBlur,
  onFocus,
  required,
  maxLength,
  rows = 3,
  className = '',
  min
}) => {
  const hasError = !!error;
  const errorId = `${name}-error`;
  const helpId = `${name}-help`;

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-lg shadow-sm
    placeholder-gray-400 text-gray-900
    focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
    transition-colors duration-200
    ${hasError 
      ? 'border-red-300 bg-red-50' 
      : 'border-gray-300 bg-white hover:border-gray-400'
    }
  `.trim();

  const renderControl = () => {
    const commonProps = {
      id: name,
      name,
      value: value || '',
      onChange,
      onBlur,
      onFocus,
      className: `${baseInputClasses} ${className}`,
      'aria-invalid': hasError,
      'aria-describedby': hasError ? errorId : undefined,
      required
    };

    switch (as) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={rows}
          />
        );
      
      case 'select':
        return (
          <select {...commonProps}>
            {children}
          </select>
        );
      
      default:
        return (
          <input
            {...commonProps}
            type={type}
            placeholder={placeholder}
            maxLength={maxLength}
            min={min}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      <label 
        htmlFor={name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {renderControl()}
        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
      
      {hasError && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {helpText && !hasError && (
        <p id={helpId} className="text-xs text-gray-500">
          {helpText}
        </p>
      )}
      
      {maxLength && as === 'textarea' && (
        <p id={helpId} className="text-xs text-gray-500">
          {value?.length || 0}/{maxLength} characters
        </p>
      )}
    </div>
  );
};

export default Field;
