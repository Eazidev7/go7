// Abeokuta areas with coordinates
export const areas = [
  { id: 'kuto', name: 'Kuto', lat: 7.1500, lng: 3.3450 },
  { id: 'panseke', name: 'Panseke', lat: 7.1580, lng: 3.3520 },
  { id: 'ijaye', name: 'Ijaye', lat: 7.1620, lng: 3.3680 },
  { id: 'ibara', name: 'Ibara', lat: 7.1400, lng: 3.3500 },
  { id: 'adigbe', name: 'Adigbe', lat: 7.1300, lng: 3.3400 },
  { id: 'camp', name: 'Camp', lat: 7.1480, lng: 3.3600 },
  { id: 'funaab', name: 'FUNAAB', lat: 7.2200, lng: 3.4400 },
  { id: 'obantoko', name: 'Obantoko', lat: 7.1650, lng: 3.3750 },
  { id: 'isabo', name: 'Isabo', lat: 7.1380, lng: 3.3580 },
  { id: 'lafenwa', name: 'Lafenwa', lat: 7.1520, lng: 3.3720 },
  { id: 'ijemo', name: 'Ijemo', lat: 7.1420, lng: 3.3650 },
  { id: 'omida', name: 'Omida', lat: 7.1350, lng: 3.3480 },
  { id: 'totoro', name: 'Totoro', lat: 7.1700, lng: 3.3800 }
];

export const getAreaByName = (name) => {
  return areas.find(area => area.name.toLowerCase() === name.toLowerCase());
};
