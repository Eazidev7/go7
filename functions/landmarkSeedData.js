/**
 * 🏛️ GO7 ABEOKUTA LANDMARK SEED DATA
 * Starter set of well-known landmarks people actually name when giving a
 * location. Coordinates are approximate (marked `approximate: true`) and
 * should be refined over time. Seeded to Firestore `landmarks` by
 * functions/seedLocations.js.
 *
 * type: hospital | school | market | hotel | estate | garage | religious |
 *       government | bank | mall | park | transport | business | other
 */

module.exports = [
  // —— Landmarks / heritage ——
  { id: 'olumo-rock', name: 'Olumo Rock', aliases: ['olumo', 'olumo rock'], lat: 7.1508, lng: 3.3463, type: 'park', area: 'Ikija', popular: true },
  { id: 'ake-palace', name: 'Ake Palace', aliases: ['ake palace gate', 'alake palace', 'ake'], lat: 7.1510, lng: 3.3435, type: 'government', area: 'Ake', popular: true },
  { id: 'centenary-hall', name: 'Centenary Hall', aliases: ['centenary', 'centenary hall'], lat: 7.1490, lng: 3.3440, type: 'government', area: 'Ake' },
  { id: 'ogun-state-secretariat', name: 'Ogun State Secretariat', aliases: ['secretariat', 'ogun secretariat', 'state secretariat'], lat: 7.1475, lng: 3.3619, type: 'government', area: 'Abeokuta' },

  // —— Hospitals & health ——
  { id: 'federal-medical-centre', name: 'Federal Medical Centre', aliases: ['fmc', 'federal medical centre abk'], lat: 7.1520, lng: 3.3550, type: 'hospital', area: 'Idi Aba', popular: true },
  { id: 'sacred-heart-hospital', name: 'Sacred Heart Hospital', aliases: ['sacred heart', 'sacred heart hospital lantoro'], lat: 7.1629, lng: 3.3625, type: 'hospital', area: 'Lantoro' },
  { id: 'general-hospital', name: 'General Hospital', aliases: ['general hospital abeokuta', 'state hospital'], lat: 7.1480, lng: 3.3500, type: 'hospital', area: 'Abeokuta' },
  { id: 'aro-psychiatric-hospital', name: 'Aro Psychiatric Hospital', aliases: ['aro hospital', 'neuro psychiatric aro', 'aro'], lat: 7.1600, lng: 3.3550, type: 'hospital', area: 'Aro', popular: true },

  // —— Schools & institutions ——
  { id: 'funaab', name: 'FUNAAB', aliases: ['funaab main gate', 'federal university'], lat: 7.2200, lng: 3.4400, type: 'school', area: 'FUNAAB', popular: true },
  { id: 'mapoly', name: 'MAPOLY', aliases: ['mapoly', 'moshood abiola polytechnic', 'mko abiola poly'], lat: 7.1650, lng: 3.3750, type: 'school', area: 'MAPOLY', popular: true },
  { id: 'abeokuta-grammar-school', name: 'Abeokuta Grammar School', aliases: ['ags', 'abeokuta grammar'], lat: 7.1500, lng: 3.3500, type: 'school', area: 'Abeokuta' },
  { id: 'baptist-girls-high', name: 'Baptist Girls High School', aliases: ['baptist girls'], lat: 7.1550, lng: 3.3480, type: 'school', area: 'Oke-Ilewo' },

  // —— Markets & commercial ——
  { id: 'kuto-market', name: 'Kuto Market', aliases: ['kuto'], lat: 7.1500, lng: 3.3450, type: 'market', area: 'Kuto', popular: true },
  { id: 'panseke-market', name: 'Panseke Market', aliases: ['panseke', 'phone village'], lat: 7.1580, lng: 3.3520, type: 'market', area: 'Panseke', popular: true },
  { id: 'itoku-market', name: 'Itoku Market', aliases: ['itoku', 'adire market'], lat: 7.1445, lng: 3.3395, type: 'market', area: 'Itoku', popular: true },
  { id: 'sapon-market', name: 'Sapon Market', aliases: ['sapon'], lat: 7.1547, lng: 3.3469, type: 'market', area: 'Sapon' },
  { id: 'lafenwa-garage', name: 'Lafenwa Garage', aliases: ['lafenwa', 'lafenwa motor park'], lat: 7.1520, lng: 3.3720, type: 'garage', area: 'Lafenwa', popular: true },

  // —— Hotels & hospitality ——
  { id: 'peak-olam-suites', name: 'Peak Olam Suites', aliases: ['peak olam'], lat: 7.1572, lng: 3.3470, type: 'hotel', area: 'Camp', popular: true },
  { id: 'gateway-hotel', name: 'Gateway Hotel', aliases: ['gateway hotel abeokuta'], lat: 7.1550, lng: 3.3500, type: 'hotel', area: 'Abeokuta' },
  { id: 'green-legacy', name: 'Green Legacy Resort', aliases: ['green legacy', 'green legacy resort'], lat: 7.1400, lng: 3.3300, type: 'hotel', area: 'Ibara' },

  // —— Estates & housing ——
  { id: 'asero-estate', name: 'Asero Estate', aliases: ['asero'], lat: 7.1458, lng: 3.3708, type: 'estate', area: 'Asero' },
  { id: 'ibara-gra', name: 'Ibara GRA', aliases: ['ibara', 'gra', 'ibara gra'], lat: 7.1380, lng: 3.3280, type: 'estate', area: 'Ibara', popular: true },
  { id: 'oke-ilewo-estate', name: 'Oke-Ilewo', aliases: ['oke ilewo', 'ilewo'], lat: 7.1556, lng: 3.3498, type: 'estate', area: 'Oke-Ilewo' },

  // —— Religious ——
  { id: 'central-mosque', name: 'Central Mosque', aliases: ['abeokuta central mosque'], lat: 7.1500, lng: 3.3440, type: 'religious', area: 'Abeokuta' },
  { id: 'cathedral', name: 'Cathedral Church', aliases: ['cathedral', 'cathedral of st peter'], lat: 7.1490, lng: 3.3430, type: 'religious', area: 'Ake' },

  // —— Transport & infrastructure ——
  { id: 'nnpc-depot', name: 'NNPC Depot', aliases: ['nnpc'], lat: 7.1125, lng: 3.3825, type: 'transport', area: 'NNPC' },
  { id: 'kuto-garage', name: 'Kuto Garage', aliases: ['kuto garage'], lat: 7.1500, lng: 3.3450, type: 'garage', area: 'Kuto' },
  { id: 'sagamu-road', name: 'Sagamu Road', aliases: ['sagamu road'], lat: 7.1450, lng: 3.3780, type: 'transport', area: 'Sagamu Road' },

  // —— Banks & business ——
  { id: 'gtb-abeokuta', name: 'GTBank', aliases: ['gtb', 'guaranty trust bank'], lat: 7.1480, lng: 3.3500, type: 'bank', area: 'Abeokuta' },
  { id: 'zenith-abeokuta', name: 'Zenith Bank', aliases: ['zenith'], lat: 7.1490, lng: 3.3510, type: 'bank', area: 'Abeokuta' },
];
