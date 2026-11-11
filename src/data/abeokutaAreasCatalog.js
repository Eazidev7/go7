/**
 * Canonical Abeokuta delivery areas — single source of truth.
 * Merged from areas.js, abeokutaAreas.ts, abeokutaAreasSimple.js,
 * abeokutaNeighborhoods.js, Nigeria postal records, and OSM geocoding.
 */

const slug = (name) =>
  String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** @type {{ id: string, name: string, lat: number, lng: number, aliases?: string[], zone?: 'south'|'north'|'metro' }[]} */
export const ABEOKUTA_AREAS_CATALOG = [
  // —— Abeokuta South (urban core) ——
  { id: 'kuto', name: 'Kuto', lat: 7.1500, lng: 3.3450, zone: 'south', aliases: ['kuto market', 'kuto garage'] },
  { id: 'panseke', name: 'Panseke', lat: 7.1580, lng: 3.3520, zone: 'south', aliases: ['panseke market', 'phone village', 'phone village panseke'] },
  {
    id: '7linkz-phone-village',
    name: '7Linkz Phone Village',
    lat: 7.1588,
    lng: 3.3515,
    zone: 'south',
    aliases: ['7linkz', '7 linkz', '7linkz phone village camp', 'phone village camp'],
  },
  {
    id: 'peak-olam-suites',
    name: 'Peak Olam Suites',
    lat: 7.1572,
    lng: 3.3470,
    zone: 'south',
    aliases: ['peak olam', 'peak olam suite', 'peak-olam suites', 'peakolam', 'funaab alabata road camp'],
  },
  { id: 'sapon', name: 'Sapon', lat: 7.1547, lng: 3.3469, zone: 'south' },
  { id: 'oke-ilewo', name: 'Oke-Ilewo', lat: 7.1556, lng: 3.3498, zone: 'south', aliases: ['oke ilewo', 'ilewo'] },
  { id: 'adatan', name: 'Adatan', lat: 7.1450, lng: 3.3795, zone: 'south' },
  { id: 'asero', name: 'Asero', lat: 7.1458, lng: 3.3708, zone: 'south', aliases: ['asero estate'] },
  { id: 'ijaye', name: 'Ijaye', lat: 7.1620, lng: 3.3680, zone: 'south', aliases: ['ijaiye'] },
  { id: 'ago-ika', name: 'Ago-Ika', lat: 7.1702, lng: 3.3605, zone: 'south', aliases: ['ago ika'] },
  { id: 'obantoko', name: 'Obantoko', lat: 7.1650, lng: 3.3750, zone: 'south' },
  { id: 'ibara', name: 'Ibara', lat: 7.1400, lng: 3.3500, zone: 'south', aliases: ['ibara gra', 'ibara/gr a'] },
  { id: 'gra', name: 'GRA', lat: 7.1380, lng: 3.3280, zone: 'south', aliases: ['ibara gra', 'government reserved area'] },
  { id: 'adigbe', name: 'Adigbe', lat: 7.1300, lng: 3.3400, zone: 'south' },
  { id: 'isabo', name: 'Isabo', lat: 7.1380, lng: 3.3580, zone: 'south' },
  { id: 'ijemo', name: 'Ijemo', lat: 7.1420, lng: 3.3650, zone: 'south' },
  { id: 'jemo', name: 'Jemo', lat: 7.1480, lng: 3.3620, zone: 'south' },
  { id: 'camp', name: 'Camp', lat: 7.1480, lng: 3.3600, zone: 'south', aliases: ['camp area'] },
  { id: 'fajol', name: 'Fajol', lat: 7.1457, lng: 3.3198, zone: 'south' },
  { id: 'omida', name: 'Omida', lat: 7.1350, lng: 3.3480, zone: 'south' },
  { id: 'gbagura', name: 'Gbagura', lat: 7.1910, lng: 3.3430, zone: 'south' },
  { id: 'olomore', name: 'Olomore', lat: 7.1075, lng: 3.3625, zone: 'south', aliases: ['olomore housing'] },
  { id: 'kemta', name: 'Kemta', lat: 7.1525, lng: 3.3925, zone: 'south' },
  { id: 'itoku', name: 'Itoku', lat: 7.1445, lng: 3.3395, zone: 'south', aliases: ['itoku market', 'adire mall'] },
  { id: 'itoko', name: 'Itoko', lat: 7.1510, lng: 3.3380, zone: 'south' },
  { id: 'sokori', name: 'Sokori', lat: 7.1425, lng: 3.3825, zone: 'south', aliases: ['oke sokori', 'oke-sokori'] },
  { id: 'nnpc', name: 'NNPC', lat: 7.1125, lng: 3.3825, zone: 'south', aliases: ['nnpc depot'] },
  { id: 'totoro', name: 'Totoro', lat: 7.1700, lng: 3.3800, zone: 'south', aliases: ['totoro owu', 'itory'] },
  { id: 'lafenwa', name: 'Lafenwa', lat: 7.1520, lng: 3.3720, zone: 'south', aliases: ['lafenwa garage'] },
  { id: 'ake', name: 'Ake', lat: 7.1510, lng: 3.3435, zone: 'south', aliases: ['ake palace'] },
  { id: 'isale-igbein', name: 'Isale Igbein', lat: 7.1490, lng: 3.3410, zone: 'south', aliases: ['isale-igbein', 'igbein'] },
  { id: 'eleweran', name: 'Eleweran', lat: 7.1540, lng: 3.3380, zone: 'south' },
  { id: 'idi-aba', name: 'Idi-Aba', lat: 7.1380, lng: 3.3720, zone: 'south', aliases: ['idi aba', 'idiaba'] },
  { id: 'iberekodo', name: 'Iberekodo', lat: 7.1250, lng: 3.3850, zone: 'south', aliases: ['iberekodo akomoje', 'akomoje'] },
  { id: 'lantoro', name: 'Lantoro', lat: 7.1629, lng: 3.3625, zone: 'south' },
  { id: 'oke-mosan', name: 'Oke-Mosan', lat: 7.1480, lng: 3.3470, zone: 'south', aliases: ['oke mosan'] },
  { id: 'quarry', name: 'Quarry', lat: 7.1361, lng: 3.3268, zone: 'south' },
  { id: 'bode-olude', name: 'Bode Olude', lat: 7.1580, lng: 3.3550, zone: 'south', aliases: ['bode olude'] },
  { id: 'brewery', name: 'Brewery', lat: 7.1550, lng: 3.3580, zone: 'south', aliases: ['brewery road'] },
  { id: 'onikolobo', name: 'Onikolobo', lat: 7.1334, lng: 3.3318, zone: 'south', aliases: ['onikolobo gra'] },
  { id: 'agbomeji', name: 'Agbomeji', lat: 7.1600, lng: 3.3480, zone: 'south' },
  { id: 'saje', name: 'Saje', lat: 7.1460, lng: 3.3340, zone: 'south' },
  { id: 'ita-oshin', name: 'Ita-Oshin', lat: 7.1400, lng: 3.3550, zone: 'south', aliases: ['ita oshin'] },
  { id: 'oluwo', name: 'Oluwo', lat: 7.1280, lng: 3.3180, zone: 'south' },
  { id: 'ago-oko', name: 'Ago-Oko', lat: 7.1419, lng: 3.3394, zone: 'south', aliases: ['ago oko'] },
  { id: 'ago-owu', name: 'Ago-Owu', lat: 7.1680, lng: 3.3550, zone: 'north', aliases: ['ago owu'] },
  { id: 'ikopa', name: 'Ikopa', lat: 7.1550, lng: 3.3280, zone: 'south', aliases: ['ikopa iawo onigunu'] },
  { id: 'ojokodo', name: 'Ojokodo', lat: 7.1180, lng: 3.3680, zone: 'south', aliases: ['ojokodo ido owe'] },
  { id: 'oke-oko', name: 'Oke Oko', lat: 7.1720, lng: 3.3380, zone: 'south', aliases: ['oke oko'] },
  { id: 'ikija', name: 'Ikija', lat: 7.1642, lng: 3.3409, zone: 'south', aliases: ['olumo rock', 'ikija olumo'] },
  { id: 'hospital-road', name: 'Hospital Road', lat: 7.1520, lng: 3.3500, zone: 'south' },
  { id: 'bode', name: 'Bode', lat: 7.1560, lng: 3.3520, zone: 'south' },
  { id: 'aregbe', name: 'Aregbe', lat: 7.1620, lng: 3.3320, zone: 'south', aliases: ['aregbesola'] },

  // —— Abeokuta North & metro suburbs ——
  { id: 'elega', name: 'Elega', lat: 7.1280, lng: 3.3320, zone: 'north', aliases: ['housing elega'] },
  { id: 'apata', name: 'Apata', lat: 7.1180, lng: 3.3580, zone: 'north' },
  { id: 'siun', name: 'Siun', lat: 7.0980, lng: 3.3780, zone: 'north' },
  { id: 'owode', name: 'Owode', lat: 7.1289, lng: 3.3985, zone: 'north', aliases: ['owode egba'] },
  { id: 'oke-ata', name: 'Oke-Ata', lat: 7.1750, lng: 3.3920, zone: 'north', aliases: ['oke ata', 'oke ata housing'] },
  { id: 'alabata', name: 'Alabata', lat: 7.2050, lng: 3.4120, zone: 'metro' },
  { id: 'osiele', name: 'Osiele', lat: 7.2180, lng: 3.4280, zone: 'metro' },
  { id: 'funaab', name: 'FUNAAB', lat: 7.2200, lng: 3.4400, zone: 'metro', aliases: ['federal university of agriculture'] },
  { id: 'mapoly', name: 'MAPOLY', lat: 7.1650, lng: 3.3750, zone: 'south', aliases: ['moshood abiola polytechnic', 'mko abiola poly'] },
  { id: 'ikereku', name: 'Ikereku', lat: 7.1850, lng: 3.3680, zone: 'north', aliases: ['ikereku idan'] },
  { id: 'imala', name: 'Imala', lat: 7.2100, lng: 3.2800, zone: 'north' },
  { id: 'kotopo', name: 'Kotopo', lat: 7.1780, lng: 3.3850, zone: 'north' },
  { id: 'oke-aro', name: 'Oke-Aro', lat: 7.1680, lng: 3.4020, zone: 'north', aliases: ['oke aro'] },
  { id: 'ayetoro', name: 'Ayetoro', lat: 7.1050, lng: 3.3450, zone: 'north', aliases: ['araromi ayetoro'] },
  { id: 'abule-otun', name: 'Abule Otun', lat: 7.1150, lng: 3.3350, zone: 'north', aliases: ['abule otun'] },
  { id: 'ilugun', name: 'Ilugun', lat: 7.1380, lng: 3.3180, zone: 'north', aliases: ['ilugun agunrin', 'mokola'] },
  { id: 'lambasa', name: 'Lambasa', lat: 7.1320, lng: 3.3880, zone: 'north', aliases: ['lambare'] },
  { id: 'denro', name: 'Denro', lat: 7.1950, lng: 3.3550, zone: 'north' },
  { id: 'alamala', name: 'Alamala', lat: 7.1680, lng: 3.3780, zone: 'north', aliases: ['alamala barracks', 'alamala barrack'] },
  { id: 'oke-pape', name: 'Oke Pape', lat: 7.1720, lng: 3.3480, zone: 'north', aliases: ['oke pape'] },
  { id: 'olodo', name: 'Olodo', lat: 7.1550, lng: 3.3250, zone: 'north' },
  { id: 'ilewo', name: 'Ilewo', lat: 7.1356, lng: 3.3363, zone: 'south', aliases: ['ilewo township'] },
  { id: 'abule-adelanwa', name: 'Abule Adelanwa', lat: 7.1200, lng: 3.3420, zone: 'north' },
  { id: 'abule-oke', name: 'Abule Oke', lat: 7.1080, lng: 3.3520, zone: 'north', aliases: ['abule oke sabo'] },
  { id: 'ewekoro', name: 'Ewekoro', lat: 7.0500, lng: 3.2800, zone: 'metro' },
  { id: 'ilara', name: 'Ilara', lat: 7.0800, lng: 3.3200, zone: 'metro' },
  { id: 'akute', name: 'Akute', lat: 6.9800, lng: 3.4200, zone: 'metro' },
  { id: 'alagbole', name: 'Alagbole', lat: 6.9500, lng: 3.4500, zone: 'metro' },
  { id: 'isale-abetu', name: 'Isale Abetu', lat: 7.1470, lng: 3.3360, zone: 'south' },
  { id: 'ita-balogun', name: 'Ita Balogun', lat: 7.1530, lng: 3.3400, zone: 'south' },
  { id: 'iyana-mortuary', name: 'Iyana Mortuary', lat: 7.1480, lng: 3.3680, zone: 'south' },
  { id: 'iyana-oloke', name: 'Iyana Oloke', lat: 7.1600, lng: 3.3620, zone: 'south' },
  { id: 'sagamu-road', name: 'Sagamu Road', lat: 7.1450, lng: 3.3780, zone: 'south' },
  { id: 'laderin', name: 'Laderin', lat: 7.1350, lng: 3.3950, zone: 'north' },
  { id: 'agbeloba', name: 'Agbeloba', lat: 7.1250, lng: 3.3250, zone: 'south' },
  { id: 'ogun-state', name: 'Ogun State', lat: 7.1475, lng: 3.3619, zone: 'south', aliases: ['ogun'] },
  { id: 'abeokuta', name: 'Abeokuta', lat: 7.1475, lng: 3.3619, zone: 'south' },
];

/** Extra village/area names for text matching (no dedicated coords — snaps to Abeokuta center). */
export const ABEOKUTA_EXTRA_AREA_NAMES = [
  'abese', 'abesin isale', 'abesin oke', 'abomolaso', 'abule nla', 'abule odunjo',
  'abule ohori', 'abule oko', 'abule olowojo', 'abule olowun', 'abule owe', 'abule titun',
  'abule aje', 'adeku', 'adeleye', 'adeotan', 'adeyori', 'afagba', 'afonja', 'agarawu',
  'agbanla', 'agbawo', 'ago odo', 'agunmona', 'ajana', 'ajegunle', 'akala', 'akere',
  'akin olugbade', 'akinmade oloro', 'akinwunmi', 'akiode', 'alamaa', 'alapako idi emi',
  'alapo', 'alaru', 'amukankan', 'anifa', 'anigbagbo', 'anima saun', 'animale', 'apana',
  'apapa oluwa', 'apo owu', 'aro hospital', 'aro village', 'asani', 'aseeso', 'asipa ijeja',
  'ata', 'atapa ikoyi', 'atapa ishaga', 'ate', 'babalogun', 'banjoko', 'base olodi',
  'bembe', 'bosero', 'daga', 'dasogunjo', 'dega', 'ekefun', 'ekeri', 'eko', 'elepo',
  'elewuro', 'eruku', 'erunbe', 'fafunke', 'fagbenro', 'falano', 'gaa', 'garage area',
  'gbengeri', 'gbolaku', 'gbomolese', 'gbopa', 'ibaro', 'ibara orile', 'idere', 'idi emi',
  'idi emo', 'idi igba', 'idi ori', 'idi iya', 'idiro lanlowo', 'idiroko', 'idofin',
  'idomapa', 'igbeyin', 'igbo egun', 'igbo aje', 'igbogbede', 'igosun', 'ija ofa',
  'ijaaye onipepeye', 'ijaiye deyorin', 'ijaje road', 'ijako', 'ijesha', 'ijeun',
  'ika ajibefun', 'ika oloba', 'ikerek', 'ila olona', 'ilakan', 'ilawo', 'imaro',
  'industrial estate', 'ipaya akintunde', 'isaga orile', 'isaga township', 'isagbesan',
  'ita iyalode', 'ita morin', 'ita oje', 'ita kinoshi', 'itaka', 'iyalo iliewo oke',
  'jagbadarigi', 'jebode', 'kanuko', 'keere', 'kipe', 'kobiti', 'kogo', 'kojola',
  'koosa kerere', 'koosa nla', 'kukudi', 'kumapayi', 'kurere', 'layeni', 'leper colony',
  'loki', 'luhami', 'lukosi', 'lupona', 'madi', 'makinde', 'malomo', 'mulero', 'nageke',
  'obada', 'obada market', 'obalakun', 'obangeri', 'odi ori', 'ogbe', 'ogbodo', 'ogboye',
  'ogongo', 'ogungbade', 'ojangangagan', 'ojibo alade', 'olorogun', 'olose', 'olowo',
  'olubo', 'oluwanfere', 'oluwo ikije', 'onipako', 'oniyanrin', 'onju', 'ontoye',
  'oogidan', 'ope oluwa', 'ori okuta', 'orun', 'osho', 'osieke', 'osun lafunke',
  'owu olubode', 'owu tuntun', 'padiku', 'ponkuku', 'sala ayiinla', 'salu', 'sangote',
  'sariki', 'siga mayero', 'sodeke', 'sodipe', 'solosun', 'surulere', 'taiwo', 'telefun',
  'temidire', 'tolato', 'toroto', 'township', 'yagi', 'yagofijo', 'yogun',
  'abayawo', 'abule egba', 'abule oba', 'abule ojo', 'abule seriki', 'adelabu', 'adimo',
  'agba', 'akiegun', 'akinniyi', 'alagbagba', 'alagbede', 'alagogo', 'alamola', 'aleelo',
  'alowo esin', 'anigbado', 'apasi', 'apata oke odo', 'aragba', 'aragudu', 'are elebute',
  'arobajo', 'asanusi', 'asipa', 'ategbe', 'atoku', 'ayo', 'baala', 'baale', 'baba ellegun',
  'bamajo', 'begbinlawo', 'dasofunjo', 'elemugbarade', 'eleyoiju', 'falekan', 'fapota',
  'fookusewa', 'iajiye', 'idera', 'idiata', 'idiemi', 'idiya', 'ijaiye orike', 'ijala orile',
  'ijala papa', 'ijaye oke odo', 'ilala', 'ileniku', 'ilugun orile', 'inawole', 'ipaya',
  'isaka', 'iwelode', 'iwofin', 'iyalode tibo', 'iyalode', 'jaarija', 'kesan orile', 'kesan',
  'ketu', 'kojala', 'laluwe', 'moloso', 'odango', 'ogbaagba', 'ogbon elegba', 'ogenne',
  'ogunola', 'ogunte', 'oje', 'ojo', 'ojubo lade', 'ojubu akinwande', 'ojubu latilawa',
  'ojugbele', 'ojumo', 'okooko', 'oloko', 'olorunda market', 'olowu', 'olukosi', 'omilende',
  'onlado', 'orunto', 'oyan lawn', 'remilekun', 'sangowole', 'tibo', 'tim', 'tofi', 'yawo',
  'plus code', 'gtb', 'guaranty trust bank', 'rockstone', 'rock stone', 'walmart', 'celestial',
  'titun', 'mko abiola', 'moshood abiola way',
];

const MAP_COLORS = [
  'blue', 'green', 'red', 'purple', 'orange', 'yellow', 'brown', 'darkred',
  'teal', 'lightblue', 'pink', 'cyan', 'indigo', 'lime', 'amber', 'rose',
];

/** Simple { id, name, lat, lng } list for areas.js consumers */
export const areas = ABEOKUTA_AREAS_CATALOG.map(({ id, name, lat, lng }) => ({
  id,
  name,
  lat,
  lng,
}));

export const getAreaByName = (name) => {
  const key = String(name || '').toLowerCase().trim();
  return areas.find(
    (area) =>
      area.name.toLowerCase() === key ||
      area.id === slug(name)
  );
};

export const getAreaById = (id) => areas.find((area) => area.id === id) || null;

/** Neighborhood list for map overlays */
export const ABEOKUTA_NEIGHBORHOODS = ABEOKUTA_AREAS_CATALOG.map((area, index) => ({
  id: area.id,
  name: area.name,
  coordinates: [area.lat, area.lng],
  color: MAP_COLORS[index % MAP_COLORS.length],
  cssClass: `label-${MAP_COLORS[index % MAP_COLORS.length]}`,
  active: false,
}));

export const MAP_DEFAULT_CENTER = [7.1475, 3.3618];
export const MAP_DEFAULT_ZOOM = 13;

export const generateMapBounds = () => {
  const latitudes = ABEOKUTA_NEIGHBORHOODS.map((n) => n.coordinates[0]);
  const longitudes = ABEOKUTA_NEIGHBORHOODS.map((n) => n.coordinates[1]);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latPadding = (maxLat - minLat) * 0.1;
  const lngPadding = (maxLng - minLng) * 0.1;
  return [
    [minLat - latPadding, minLng - lngPadding],
    [maxLat + latPadding, maxLng + lngPadding],
  ];
};

export const getNeighborhoodById = (id) =>
  ABEOKUTA_NEIGHBORHOODS.find((n) => n.id === id) || null;

/** All searchable area name tokens for zone text matching */
export function buildAreaNameIndex() {
  const names = new Set(['abeokuta', 'ogun', 'ogun state']);
  for (const area of ABEOKUTA_AREAS_CATALOG) {
    names.add(area.name.toLowerCase());
    names.add(area.id.replace(/-/g, ' '));
    for (const alias of area.aliases || []) {
      names.add(alias.toLowerCase());
    }
  }
  for (const extra of ABEOKUTA_EXTRA_AREA_NAMES) {
    names.add(extra.toLowerCase());
  }
  return [...names];
}
