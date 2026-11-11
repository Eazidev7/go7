// ==========================================================
// GO7 ADDRESS FIELD – Premium Chowdeck-style Input
// ==========================================================

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Check, Loader } from 'lucide-react';
import '../styles/go7AddressField.css';

const Go7AddressField = ({
    type = 'pickup',
    value = '',
    onSelect,
    onInputChange,
    suggestions = [],
    loading = false,
    confirmed = false
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef(null);

    const title = type === 'pickup' ? 'Pickup Address' : 'Drop-off Address';
    const placeholder = 'Search or use current location';
    const iconColor = type === 'pickup' ? '#E60023' : '#10B981';

    useEffect(() => {
        setShowDropdown(suggestions.length > 0 && isFocused);
    }, [suggestions, isFocused]);

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        // Delay to allow suggestion click
        setTimeout(() => setIsFocused(false), 200);
    };

    const handleSuggestionClick = (suggestion) => {
        onSelect(suggestion);
        setShowDropdown(false);
        inputRef.current?.blur();
    };

    const handleLocationClick = () => {
        if (!navigator.geolocation) {
            alert('📍 Your browser doesn\'t support location services');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onSelect({
                    lat: latitude,
                    lng: longitude,
                    text: 'Current Location',
                    source: 'gps'
                });
            },
            (error) => {
                alert('📍 Please enable location for faster pickup detection!');
            }
        );
    };

    const getSourceIcon = (source) => {
        switch (source) {
            case 'google': return '🔵';
            case 'osm': return '🟢';
            case 'local': return '🔴';
            case 'gps': return '📍';
            default: return '🔵';
        }
    };

    return (
        <div className={`go7-address-field ${isFocused ? 'focused' : ''} ${confirmed ? 'confirmed' : ''}`}>
            <label className="go7-field-label">{title}</label>

            <div className="go7-input-container">
                <MapPin
                    className="go7-input-icon"
                    style={{ color: iconColor }}
                    size={20}
                />

                <input
                    ref={inputRef}
                    type="text"
                    className="go7-input"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onInputChange(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />

                {loading && (
                    <Loader className="go7-spinner" size={18} />
                )}

                {confirmed && !loading && (
                    <div className="go7-confirmed-badge">
                        <Check size={14} />
                        <span>Set</span>
                    </div>
                )}

                <button
                    type="button"
                    className="go7-location-btn"
                    onClick={handleLocationClick}
                    title="Use current location"
                >
                    <Navigation size={18} />
                </button>
            </div>

            {showDropdown && (
                <div className="go7-suggestions-dropdown">
                    {suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className="go7-suggestion-item"
                                onClick={() => handleSuggestionClick(suggestion)}
                            >
                                <span className="go7-suggestion-icon">
                                    {getSourceIcon(suggestion.source)}
                                </span>
                                <span className="go7-suggestion-text">
                                    {suggestion.text}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="go7-no-results">
                            Hmm... can't find this spot 😅<br />
                            <small>Try adding a nearby landmark.</small>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Go7AddressField;
