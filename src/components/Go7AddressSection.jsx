// ==========================================================
// GO7 ADDRESS SECTION – Complete Pickup & Drop-off
// ==========================================================

import React, { useState, useEffect } from 'react';
import Go7AddressField from './Go7AddressField';
import Go7SummaryCard from './Go7SummaryCard';
import '../styles/go7AddressSection.css';

const Go7AddressSection = ({
    onPickupChange,
    onDropoffChange,
    fetchSuggestions,
    calculateRoute
}) => {
    const [pickupValue, setPickupValue] = useState('');
    const [dropoffValue, setDropoffValue] = useState('');
    const [pickupSelected, setPickupSelected] = useState(null);
    const [dropoffSelected, setDropoffSelected] = useState(null);
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
    const [pickupLoading, setPickupLoading] = useState(false);
    const [dropoffLoading, setDropoffLoading] = useState(false);
    const [routeData, setRouteData] = useState(null);

    // Debounce timer
    const [debounceTimer, setDebounceTimer] = useState(null);

    // Handle pickup input
    const handlePickupInput = (value) => {
        setPickupValue(value);
        setPickupSelected(null);

        if (debounceTimer) clearTimeout(debounceTimer);

        if (value.length >= 3) {
            setPickupLoading(true);
            const timer = setTimeout(async () => {
                const suggestions = await fetchSuggestions(value, 'pickup');
                setPickupSuggestions(suggestions);
                setPickupLoading(false);
            }, 500);
            setDebounceTimer(timer);
        } else {
            setPickupSuggestions([]);
            setPickupLoading(false);
        }
    };

    // Handle dropoff input
    const handleDropoffInput = (value) => {
        setDropoffValue(value);
        setDropoffSelected(null);

        if (debounceTimer) clearTimeout(debounceTimer);

        if (value.length >= 3) {
            setDropoffLoading(true);
            const timer = setTimeout(async () => {
                const suggestions = await fetchSuggestions(value, 'dropoff');
                setDropoffSuggestions(suggestions);
                setDropoffLoading(false);
            }, 500);
            setDebounceTimer(timer);
        } else {
            setDropoffSuggestions([]);
            setDropoffLoading(false);
        }
    };

    // Handle pickup selection
    const handlePickupSelect = (suggestion) => {
        setPickupValue(suggestion.text);
        setPickupSelected(suggestion);
        setPickupSuggestions([]);
        onPickupChange(suggestion);
    };

    // Handle dropoff selection
    const handleDropoffSelect = (suggestion) => {
        setDropoffValue(suggestion.text);
        setDropoffSelected(suggestion);
        setDropoffSuggestions([]);
        onDropoffChange(suggestion);
    };

    // Calculate route when both addresses are selected
    useEffect(() => {
        if (pickupSelected && dropoffSelected && calculateRoute) {
            const fetchRoute = async () => {
                const route = await calculateRoute(pickupSelected, dropoffSelected);
                setRouteData(route);
            };
            fetchRoute();
        } else {
            setRouteData(null);
        }
    }, [pickupSelected, dropoffSelected, calculateRoute]);

    return (
        <div className="go7-address-section">
            <h2 className="go7-section-title">📍 Pickup & Drop-off</h2>

            <Go7AddressField
                type="pickup"
                value={pickupValue}
                onInputChange={handlePickupInput}
                onSelect={handlePickupSelect}
                suggestions={pickupSuggestions}
                loading={pickupLoading}
                confirmed={!!pickupSelected}
            />

            <Go7AddressField
                type="dropoff"
                value={dropoffValue}
                onInputChange={handleDropoffInput}
                onSelect={handleDropoffSelect}
                suggestions={dropoffSuggestions}
                loading={dropoffLoading}
                confirmed={!!dropoffSelected}
            />

            {routeData && (
                <Go7SummaryCard
                    distance={routeData.distance}
                    eta={routeData.eta}
                    fare={routeData.fare}
                />
            )}
        </div>
    );
};

export default Go7AddressSection;
