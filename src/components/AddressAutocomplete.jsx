// src/components/AddressAutocomplete.jsx
import React, { useState, useEffect, useRef } from 'react';
import { debouncedSearchAbeokutaPlaces } from '../services/abeokutaGeocodingService';

/**
 * Address Autocomplete component
 * Shows suggestions as user types and returns the selected location with coordinates
 */
const AddressAutocomplete = ({
  id,
  label,
  placeholder,
  error,
  value,
  onChange,
  onLocationSelect,
  onFocus,
  className,
  autoFocus = false,
  required = false,
  disabled = false,
  type = "pickup" // pickup or dropoff
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Initialize query from value if provided
  useEffect(() => {
    if (value && typeof value === 'string') {
      setQuery(value);
    }
  }, [value]);

  // Handle clicks outside the component to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setQuery(inputValue);
    
    // Call the onChange prop if provided
    if (onChange) {
      onChange(e);
    }
    
    if (inputValue.length >= 2) {
      setIsLoading(true);
      
      // Fetch suggestions with a debounced function
      debouncedSearchAbeokutaPlaces(inputValue, (results) => {
        setSuggestions(results);
        setIsLoading(false);
      });
    } else {
      setSuggestions([]);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    // Update the input value
    setQuery(suggestion.display_name);
    
    // Close the suggestions
    setSuggestions([]);
    
    // Extract the area name from the suggestion
    const areaName = suggestion.address.area || 
                    suggestion.address.suburb || 
                    suggestion.address.neighbourhood || 
                    'Abeokuta';
    
    // Call the onLocationSelect callback with the selected location
    if (onLocationSelect) {
      onLocationSelect({
        area: areaName,
        address: suggestion.display_name,
        coordinates: {
          lat: suggestion.lat,
          lng: suggestion.lng
        }
      });
    }
  };

  // Handle input focus
  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(e);
    }
    
    // If the input already has a value, show suggestions for it
    if (query.length >= 2) {
      setIsLoading(true);
      debouncedSearchAbeokutaPlaces(query, (results) => {
        setSuggestions(results);
        setIsLoading(false);
      });
    }
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  };

  // Generate unique ID for the suggestions list
  const suggestionsListId = `${id}-suggestions`;

  return (
    <div className="relative w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && '*'}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder || "Start typing for suggestions..."}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-owns={suggestionsListId}
          aria-activedescendant=""
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
            type === 'pickup' 
              ? 'focus:ring-green-500 focus:border-green-500' 
              : 'focus:ring-red-500 focus:border-red-500'
          } ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${
            isFocused && type === 'pickup' ? 'ring-2 ring-green-500 border-green-500' : ''
          } ${
            isFocused && type === 'dropoff' ? 'ring-2 ring-red-500 border-red-500' : ''
          } ${className || ''}`}
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <ul
          ref={suggestionsRef}
          id={suggestionsListId}
          className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          role="listbox"
        >
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id || `${suggestion.lat}-${suggestion.lng}`}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="cursor-pointer select-none relative py-2 px-3 hover:bg-gray-100 transition-colors"
              role="option"
            >
              <div className="flex items-start">
                <div className="mr-2 mt-0.5 flex-shrink-0">
                  {suggestion.source === 'local' ? (
                    <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-medium">{suggestion.address.area || 'Abeokuta'}</div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">{suggestion.display_name}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;