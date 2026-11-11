import React, { useState, useEffect, useRef } from 'react';
import { MapPinIcon, HomeIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { getAddressSuggestions } from '../services/geocodingService';

/**
 * Address Input component with autocomplete functionality
 */
const AddressInput = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  onAddressSelect,
  icon = 'pin',
  required = false,
  error = null,
  limitToAbeokuta = true
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch suggestions when input value changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const results = await getAddressSuggestions(value, limitToAbeokuta);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounce);
  }, [value, limitToAbeokuta]);

  // Get icon based on type
  const getIcon = () => {
    switch (icon) {
      case 'home':
        return <HomeIcon className="h-5 w-5 text-gray-500" />;
      case 'building':
        return <BuildingStorefrontIcon className="h-5 w-5 text-gray-500" />;
      case 'pin':
      default:
        return <MapPinIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.placeName);
    onAddressSelect && onAddressSelect(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="w-full">
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div className={`flex items-center border rounded-xl overflow-hidden transition-all
          ${isFocused ? 'ring-2 ring-red-500 border-red-500' : 'border-gray-300'}
          ${error ? 'border-red-500 ring-1 ring-red-500' : ''}
        `}>
          <div className="pl-3">
            {getIcon()}
          </div>
          
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (value && value.trim().length >= 2) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="w-full px-3 py-3 focus:outline-none text-gray-700"
          />
          
          {isLoading && (
            <div className="pr-3">
              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div 
            ref={suggestionsRef}
            className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg overflow-hidden z-20 max-h-[250px] overflow-y-auto border border-gray-200"
          >
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <MapPinIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {suggestion.text}
                    </div>
                    <div className="text-sm text-gray-500">
                      {suggestion.placeName}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default AddressInput;