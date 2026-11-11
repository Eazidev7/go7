// ==========================================================
// REPLACEMENT CODE FOR handleAddressInput FUNCTION
// Location: BookDelivery.jsx line ~2325
// ==========================================================

// 🚀 ENHANCED ADDRESS INPUT WITH HYBRID GOOGLE + OSM SYSTEM
// Handle address input with Hybrid Google Places + OSM Nominatim integration
const handleAddressInput = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear previous suggestions
    if (field === 'pickupAddress') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
        setActiveField('pickup');
    } else if (field === 'dropoffAddress') {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
        setActiveField('dropoff');
    }

    // Clear place suggestions when switching between inputs
    setPlaceSuggestions([]);
    setShowPlaceSuggestions(false);

    // Fetch suggestions for queries >= 3 characters
    if (value.length >= 3) {
        const debounceTimer = setTimeout(async () => {
            console.log(`🔍 Searching for "${value}" using HYBRID system (Google + OSM + Landmarks)...`);

            // 1. First priority: Search local landmarks for instant suggestions
            const landmarkResults = searchLandmarks(value);
            console.log(`📍 Found ${landmarkResults.length} local landmarks`);

            const landmarkSuggestions = landmarkResults.map(landmark => ({
                id: `landmark-${landmark.id}`,
                placeId: null,
                description: landmark.name,
                mainText: landmark.shortName,
                secondaryText: landmark.address,
                isLandmark: true,
                landmarkData: landmark,
                icon: '📍', // Red pin for landmarks
                priority: 1 // Highest priority
            }));

            // 2. Second priority: HYBRID Google + OSM suggestions with Abeokuta bias
            let hybridSuggestions = [];
            try {
                console.log('🌐 Fetching HYBRID suggestions (Google + OSM)...');
                const results = await fetchAddressSuggestions(value);

                hybridSuggestions = results.map((result, index) => ({
                    id: `${result.source}-${index}`,
                    placeId: result.place_id || null,
                    description: result.description,
                    mainText: result.description.split(',')[0],
                    secondaryText: result.description.split(',').slice(1).join(','),
                    isLandmark: false,
                    isHybrid: true,
                    source: result.source,
                    sourceIcon: result.icon, // 🔵 Google or 🟢 OSM
                    originalData: result,
                    priority: 2
                }));

                console.log(`✅ HYBRID system returned ${hybridSuggestions.length} suggestions (Google + OSM)`);

            } catch (error) {
                console.error('❌ HYBRID suggestion system error:', error);
                hybridSuggestions = [];
            }

            // Combine all suggestions with priority ordering
            const allSuggestions = [
                ...landmarkSuggestions,
                ...hybridSuggestions
            ].slice(0, 8); // Limit to 8 suggestions

            console.log(`📋 Total suggestions: ${allSuggestions.length} (${landmarkSuggestions.length} landmarks + ${hybridSuggestions.length} hybrid)`);

            // Update appropriate suggestions based on field
            if (field === 'pickupAddress') {
                setPickupSuggestions(allSuggestions);
                setShowPickupSuggestions(allSuggestions.length > 0);
            } else if (field === 'dropoffAddress') {
                setDropoffSuggestions(allSuggestions);
                setShowDropoffSuggestions(allSuggestions.length > 0);
            }

        }, 300); // 300ms debounce

        setInputDebounceTimer(debounceTimer);
    } else {
        // Clear suggestions for short queries
        if (field === 'pickupAddress') {
            setPickupSuggestions([]);
            setShowPickupSuggestions(false);
        } else if (field === 'dropoffAddress') {
            setDropoffSuggestions([]);
            setShowDropoffSuggestions(false);
        }
    }
};

// ==========================================================
// INSTRUCTIONS:
// 1. Find the handleAddressInput function (around line 2325)
// 2. Replace the ENTIRE function with this code
// 3. Make sure the import is added at top:
//    import fetchAddressSuggestions, { getCoordinatesFromSuggestion } from '../utils/fetchAddressSuggestions';
// 4. Test by typing addresses like:
//    - "Ibara Housing"
//    - "FUNAAB Road"
//    - "Omida Market"
//    - "Grace Hostel"
// ==========================================================
