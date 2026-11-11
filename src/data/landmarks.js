// Abeokuta landmarks and popular places with coordinates
export const landmarks = [
    // Government/Administrative Buildings
    {
        id: 'governors-office',
        name: "Governor's Office",
        shortName: "Governor's Office",
        category: 'Government',
        lat: 7.1475,
        lng: 3.3465,
        address: "Governor's Office, Oke-Mosan, Abeokuta, Ogun State"
    },
    {
        id: 'ogun-state-secretariat',
        name: "Ogun State Secretariat",
        shortName: "State Secretariat",
        category: 'Government',
        lat: 7.1480,
        lng: 3.3470,
        address: "Ogun State Secretariat, Oke-Mosan, Abeokuta, Ogun State"
    },
    {
        id: 'local-govt-secretariat',
        name: "Local Government Secretariat",
        shortName: "LGA Secretariat",
        category: 'Government',
        lat: 7.1520,
        lng: 3.3450,
        address: "Local Government Secretariat, Ake, Abeokuta, Ogun State"
    },

    // Educational Institutions
    {
        id: 'funaab',
        name: "Federal University of Agriculture, Abeokuta (FUNAAB)",
        shortName: "FUNAAB",
        category: 'Education',
        lat: 7.2200,
        lng: 3.4400,
        address: "FUNAAB, Alabata Road, Abeokuta, Ogun State"
    },
    {
        id: 'moshood-abiola-polytechnic',
        name: "Moshood Abiola Polytechnic (MAPOLY)",
        shortName: "MAPOLY",
        category: 'Education',
        lat: 7.1650,
        lng: 3.3750,
        address: "MAPOLY, Abeokuta, Ogun State"
    },
    {
        id: 'adeyemi-college',
        name: "Adeyemi College of Education",
        shortName: "Adeyemi College",
        category: 'Education',
        lat: 7.1580,
        lng: 3.3520,
        address: "Adeyemi College, Ondo Road, Abeokuta, Ogun State"
    },

    // Historical/Cultural Sites
    {
        id: 'olumo-rock',
        name: "Olumo Rock",
        shortName: "Olumo Rock",
        category: 'Tourist Attraction',
        lat: 7.1533,
        lng: 3.3450,
        address: "Olumo Rock, Ikija, Abeokuta, Ogun State"
    },
    {
        id: 'centenary-hall',
        name: "Centenary Hall",
        shortName: "Centenary Hall",
        category: 'Event Venue',
        lat: 7.1510,
        lng: 3.3435,
        address: "Centenary Hall, Ake, Abeokuta, Ogun State"
    },
    {
        id: 'alake-palace',
        name: "Alake Palace",
        shortName: "Alake Palace",
        category: 'Cultural',
        lat: 7.1515,
        lng: 3.3440,
        address: "Alake Palace, Ake, Abeokuta, Ogun State"
    },

    // Healthcare
    {
        id: 'federal-medical-centre',
        name: "Federal Medical Centre (FMC) Abeokuta",
        shortName: "FMC Abeokuta",
        category: 'Healthcare',
        lat: 7.1420,
        lng: 3.3650,
        address: "FMC Abeokuta, Idi-Aba, Abeokuta, Ogun State"
    },
    {
        id: 'state-hospital',
        name: "State Hospital Abeokuta",
        shortName: "State Hospital",
        category: 'Healthcare',
        lat: 7.1380,
        lng: 3.3580,
        address: "State Hospital, Isabo, Abeokuta, Ogun State"
    },
    {
        id: 'sacred-heart-hospital',
        name: "Sacred Heart Hospital",
        shortName: "Sacred Heart Hospital",
        category: 'Healthcare',
        lat: 7.1450,
        lng: 3.3500,
        address: "Sacred Heart Hospital, Lantoro, Abeokuta, Ogun State"
    },

    // Markets
    {
        id: 'kuto-market',
        name: "Kuto Market",
        shortName: "Kuto Market",
        category: 'Market',
        lat: 7.1500,
        lng: 3.3450,
        address: "Kuto Market, Kuto, Abeokuta, Ogun State"
    },
    {
        id: 'panseke-market',
        name: "Panseke Market",
        shortName: "Panseke Market",
        category: 'Market',
        lat: 7.1580,
        lng: 3.3520,
        address: "Panseke Market, Panseke, Abeokuta, Ogun State"
    },
    {
        id: '7linkz-phone-village',
        name: "7Linkz Phone Village",
        shortName: "7Linkz Phone Village",
        category: 'Shopping',
        lat: 7.1588,
        lng: 3.3515,
        address: "7Linkz Phone Village, Panseke, Abeokuta, Ogun State"
    },
    {
        id: 'peak-olam-suites',
        name: "Peak Olam Suites",
        shortName: "Peak Olam Suites",
        category: 'Accommodation',
        lat: 7.1572,
        lng: 3.3470,
        address: "36 FUNAAB-Alabata Road, Camp, Abeokuta, Ogun State"
    },
    {
        id: 'lafenwa-market',
        name: "Lafenwa Market",
        shortName: "Lafenwa Market",
        category: 'Market',
        lat: 7.1520,
        lng: 3.3720,
        address: "Lafenwa Market, Lafenwa, Abeokuta, Ogun State"
    },

    // Transportation Hubs
    {
        id: 'inter-state-motor-park',
        name: "Inter-State Motor Park",
        shortName: "Inter-State Park",
        category: 'Transportation',
        lat: 7.1600,
        lng: 3.3500,
        address: "Inter-State Motor Park, Panseke, Abeokuta, Ogun State"
    },
    {
        id: 'kuto-motor-park',
        name: "Kuto Motor Park",
        shortName: "Kuto Motor Park",
        category: 'Transportation',
        lat: 7.1520,
        lng: 3.3460,
        address: "Kuto Motor Park, Kuto, Abeokuta, Ogun State"
    },

    // Religious Centers
    {
        id: 'cathedral-church',
        name: "Cathedral Church of St. Peter",
        shortName: "Cathedral Church",
        category: 'Religious',
        lat: 7.1520,
        lng: 3.3445,
        address: "Cathedral Church, Ake, Abeokuta, Ogun State"
    },
    {
        id: 'central-mosque',
        name: "Central Mosque Abeokuta",
        shortName: "Central Mosque",
        category: 'Religious',
        lat: 7.1495,
        lng: 3.3465,
        address: "Central Mosque, Ake, Abeokuta, Ogun State"
    },

    // Shopping Centers
    {
        id: 'mall-of-abeokuta',
        name: "Mall of Abeokuta",
        shortName: "Mall of Abeokuta",
        category: 'Shopping',
        lat: 7.1400,
        lng: 3.3500,
        address: "Mall of Abeokuta, Ibara, Abeokuta, Ogun State"
    },
    {
        id: 'shoprite-abeokuta',
        name: "Shoprite Abeokuta",
        shortName: "Shoprite",
        category: 'Shopping',
        lat: 7.1420,
        lng: 3.3520,
        address: "Shoprite, Abeokuta, Ogun State"
    },

    // Banks/Financial
    {
        id: 'first-bank-ake',
        name: "First Bank of Nigeria - Ake Branch",
        shortName: "First Bank Ake",
        category: 'Bank',
        lat: 7.1515,
        lng: 3.3445,
        address: "First Bank, Ake, Abeokuta, Ogun State"
    },
    {
        id: 'gtb-kuto',
        name: "Guaranty Trust Bank - Kuto Branch",
        shortName: "GTB Kuto",
        category: 'Bank',
        lat: 7.1505,
        lng: 3.3455,
        address: "GTB, Kuto, Abeokuta, Ogun State"
    },

    // Hotels/Hospitality
    {
        id: 'park-inn-abeokuta',
        name: "Park Inn by Radisson Abeokuta",
        shortName: "Park Inn",
        category: 'Hotel',
        lat: 7.1450,
        lng: 3.3480,
        address: "Park Inn, Oke-Mosan, Abeokuta, Ogun State"
    },
    {
        id: 'gateway-hotel',
        name: "Gateway Hotel",
        shortName: "Gateway Hotel",
        category: 'Hotel',
        lat: 7.1470,
        lng: 3.3490,
        address: "Gateway Hotel, Oke-Mosan, Abeokuta, Ogun State"
    },
    {
        id: 'cele-titun-eleweran',
        name: "12 Cele Titun, Eleweran Camp",
        shortName: "Cele Titun, Eleweran",
        category: 'Residential',
        lat: 7.1550,
        lng: 3.3580,
        address: "12 Cele Titun, Eleweran Camp, Abeokuta, Ogun State"
    },

    // === POPULAR NEIGHBORHOODS & AREAS IN ABEOKUTA ===
    {
        id: 'ake-area',
        name: "Ake Area",
        shortName: "Ake",
        category: 'Area',
        lat: 7.1550,
        lng: 3.3420,
        address: "Ake, Abeokuta, Ogun State"
    },
    {
        id: 'isabo-area',
        name: "Isabo Area",
        shortName: "Isabo",
        category: 'Area',
        lat: 7.1520,
        lng: 3.3380,
        address: "Isabo, Abeokuta, Ogun State"
    },
    {
        id: 'oke-mosan',
        name: "Oke-Mosan Area",
        shortName: "Oke-Mosan",
        category: 'Area',
        lat: 7.1475,
        lng: 3.3465,
        address: "Oke-Mosan, Abeokuta, Ogun State"
    },
    {
        id: 'lantoro-area',
        name: "Lantoro Area",
        shortName: "Lantoro",
        category: 'Area',
        lat: 7.1600,
        lng: 3.3500,
        address: "Lantoro, Abeokuta, Ogun State"
    },
    {
        id: 'kuto-area',
        name: "Kuto Area",
        shortName: "Kuto",
        category: 'Area',
        lat: 7.1450,
        lng: 3.3400,
        address: "Kuto, Abeokuta, Ogun State"
    },
    {
        id: 'panseke-area',
        name: "Panseke Area",
        shortName: "Panseke",
        category: 'Area',
        lat: 7.1350,
        lng: 3.3350,
        address: "Panseke, Abeokuta, Ogun State"
    },
    {
        id: 'lafenwa-area',
        name: "Lafenwa Area",
        shortName: "Lafenwa",
        category: 'Area',
        lat: 7.1300,
        lng: 3.3320,
        address: "Lafenwa, Abeokuta, Ogun State"
    },
    {
        id: 'idi-aba-area',
        name: "Idi-Aba Area",
        shortName: "Idi-Aba",
        category: 'Area',
        lat: 7.1380,
        lng: 3.3450,
        address: "Idi-Aba, Abeokuta, Ogun State"
    },
    {
        id: 'iberekodo-area',
        name: "Iberekodo Area",
        shortName: "Iberekodo",
        category: 'Area',
        lat: 7.1200,
        lng: 3.3250,
        address: "Iberekodo, Abeokuta, Ogun State"
    },
    {
        id: 'obantoko-area',
        name: "Obantoko Area",
        shortName: "Obantoko",
        category: 'Area',
        lat: 7.1700,
        lng: 3.3600,
        address: "Obantoko, Abeokuta, Ogun State"
    },
    {
        id: 'ijaiye-area',
        name: "Ijaiye Area",
        shortName: "Ijaiye",
        category: 'Area',
        lat: 7.1650,
        lng: 3.3750,
        address: "Ijaiye, Abeokuta, Ogun State"
    },
    {
        id: 'quarry-road-area',
        name: "Quarry Road Area",
        shortName: "Quarry Road",
        category: 'Area',
        lat: 7.1620,
        lng: 3.3680,
        address: "Quarry Road, Abeokuta, Ogun State"
    },
    {
        id: 'adatan-area',
        name: "Adatan Area",
        shortName: "Adatan",
        category: 'Area',
        lat: 7.1400,
        lng: 3.3550,
        address: "Adatan, Abeokuta, Ogun State"
    },
    {
        id: 'camp-area',
        name: "Camp Area",
        shortName: "Camp",
        category: 'Area',
        lat: 7.1480,
        lng: 3.3520,
        address: "Camp, Abeokuta, Ogun State"
    },
    {
        id: 'eleweran-area',
        name: "Eleweran Area",
        shortName: "Eleweran",
        category: 'Area',
        lat: 7.1550,
        lng: 3.3580,
        address: "Eleweran, Abeokuta, Ogun State"
    },
    {
        id: 'bode-olude-area',
        name: "Bode Olude Area",
        shortName: "Bode Olude",
        category: 'Area',
        lat: 7.1320,
        lng: 3.3380,
        address: "Bode Olude, Abeokuta, Ogun State"
    },
    {
        id: 'brewery-area',
        name: "Brewery Area",
        shortName: "Brewery",
        category: 'Area',
        lat: 7.1580,
        lng: 3.3620,
        address: "Brewery, Abeokuta, Ogun State"
    },

    // === FUNAAB AREA HOSTELS & ACCOMMODATIONS ===
    {
        id: 'grace-hostel-funaab',
        name: "11 Grace Hostel Oluwa, FUNAAB Road",
        shortName: "Grace Hostel Oluwa",
        category: 'Accommodation',
        lat: 7.2205,
        lng: 3.4425,
        address: "11 Grace Hostel Oluwa, FUNAAB Road, Abeokuta, Ogun State"
    },
    {
        id: 'grace-hostel-alt',
        name: "Grace Hostel Oluwa FUNAAB",
        shortName: "Grace Hostel",
        category: 'Accommodation',
        lat: 7.2205,
        lng: 3.4425,
        address: "Grace Hostel Oluwa, Near FUNAAB, Abeokuta, Ogun State"
    },
    {
        id: 'funaab-main-gate',
        name: "FUNAAB Main Gate",
        shortName: "FUNAAB Gate",
        category: 'Education',
        lat: 7.2200,
        lng: 3.4400,
        address: "FUNAAB Main Gate, Alabata Road, Abeokuta, Ogun State"
    },
    {
        id: 'funaab-road-area',
        name: "FUNAAB Road Area",
        shortName: "FUNAAB Road",
        category: 'Area',
        lat: 7.2150,
        lng: 3.4350,
        address: "FUNAAB Road, Abeokuta, Ogun State"
    },
    {
        id: 'alabata-road',
        name: "Alabata Road",
        shortName: "Alabata Road",
        category: 'Area',
        lat: 7.2100,
        lng: 3.4300,
        address: "Alabata Road, Abeokuta, Ogun State"
    },
    {
        id: 'camp-funaab',
        name: "Camp Area (Near FUNAAB)",
        shortName: "Camp FUNAAB",
        category: 'Area',
        lat: 7.2120,
        lng: 3.4320,
        address: "Camp Area, Near FUNAAB, Abeokuta, Ogun State"
    },
    {
        id: 'student-village-funaab',
        name: "Student Village FUNAAB",
        shortName: "Student Village",
        category: 'Accommodation',
        lat: 7.2190,
        lng: 3.4410,
        address: "Student Village, FUNAAB, Abeokuta, Ogun State"
    },
    {
        id: 'pentagon-hostel',
        name: "Pentagon Hostel",
        shortName: "Pentagon Hostel",
        category: 'Accommodation',
        lat: 7.2160,
        lng: 3.4360,
        address: "Pentagon Hostel, FUNAAB Road, Abeokuta, Ogun State"
    },
    {
        id: 'excellence-hostel',
        name: "Excellence Hostel",
        shortName: "Excellence Hostel",
        category: 'Accommodation',
        lat: 7.2170,
        lng: 3.4370,
        address: "Excellence Hostel, FUNAAB Area, Abeokuta, Ogun State"
    },
    {
        id: 'royal-palace-hostel',
        name: "Royal Palace Hostel",
        shortName: "Royal Palace",
        category: 'Accommodation',
        lat: 7.2140,
        lng: 3.4340,
        address: "Royal Palace Hostel, FUNAAB Road, Abeokuta, Ogun State"
    },
    {
        id: 'ori-okuta',
        name: 'Ori Okuta (Ori Village)',
        shortName: 'Ori Okuta',
        category: 'Area',
        lat: 7.12074,
        lng: 3.24529,
        address: 'Ori Okuta, Abeokuta North, Ogun State'
    },
    {
        id: 'divine-mercy-hostel',
        name: "Divine Mercy Hostel",
        shortName: "Divine Mercy",
        category: 'Accommodation',
        lat: 7.2200,
        lng: 3.4390,
        address: "Divine Mercy Hostel, FUNAAB Area, Abeokuta, Ogun State"
    }
];

// Function to search landmarks by name or category
export const searchLandmarks = (query) => {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();

    const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length >= 2);

    return landmarks.filter((landmark) => {
        const fields = [
            landmark.name,
            landmark.shortName,
            landmark.category,
            landmark.address,
        ].map((f) => f.toLowerCase());

        if (fields.some((f) => f.includes(lowerQuery) || lowerQuery.includes(f))) {
            return true;
        }

        return queryWords.some((word) =>
            fields.some((f) => f.includes(word))
        );
    });
};

// Function to get landmarks by category
export const getLandmarksByCategory = (category) => {
    return landmarks.filter(landmark =>
        landmark.category.toLowerCase() === category.toLowerCase()
    );
};

// Function to get landmark by ID
export const getLandmarkById = (id) => {
    return landmarks.find(landmark => landmark.id === id);
};

// Export default
export default landmarks;