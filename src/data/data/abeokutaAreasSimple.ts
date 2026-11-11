export interface AbeokutaArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: "blue" | "green" | "orange" | "pink" | "purple";
}

export const ABEOKUTA_AREAS: AbeokutaArea[] = [
  { id: "panseke", name: "Panseke", lat: 7.1482, lng: 3.3491, color: "blue" },
  { id: "kuto", name: "Kuto", lat: 7.1359, lng: 3.3444, color: "orange" },
  { id: "ibara", name: "Ibara", lat: 7.1775, lng: 3.3425, color: "green" },
  { id: "oke-ilewo", name: "Oke‑Ilewo", lat: 7.1556, lng: 3.3498, color: "blue" },
  { id: "sapon", name: "Sapon", lat: 7.1547, lng: 3.3469, color: "green" },
  { id: "adigbe", name: "Adigbe", lat: 7.1530, lng: 3.3215, color: "green" },
  { id: "obantoko", name: "Obantoko", lat: 7.1283, lng: 3.3777, color: "orange" },
  { id: "camp", name: "Camp", lat: 7.1209, lng: 3.4416, color: "blue" },
  { id: "kemta", name: "Kemta", lat: 7.1239, lng: 3.3314, color: "orange" },
  { id: "fajol", name: "Fajol", lat: 7.1457, lng: 3.3198, color: "green" },
  { id: "isabo", name: "Isabo", lat: 7.1567, lng: 3.3402, color: "purple" },
  { id: "omida", name: "Omida", lat: 7.1629, lng: 3.3439, color: "blue" },
  { id: "ijaye", name: "Ijaye", lat: 7.1562, lng: 3.3431, color: "purple" },
  { id: "ijemo", name: "Ijemo", lat: 7.1569, lng: 3.3353, color: "pink" },
  { id: "gbagura", name: "Gbagura", lat: 7.1910, lng: 3.3430, color: "green" },
  { id: "nnpc", name: "NNPC", lat: 7.1125, lng: 3.3825, color: "purple" },
  { id: "sokori", name: "Sokori", lat: 7.1425, lng: 3.3825, color: "pink" },
  { id: "adatan", name: "Adatan", lat: 7.1375, lng: 3.3425, color: "blue" },
  { id: "lafenwa", name: "Lafenwa", lat: 7.1825, lng: 3.3675, color: "orange" },
  { id: "olomore", name: "Olomore", lat: 7.1075, lng: 3.3625, color: "purple" },
  { id: "itoku", name: "Itoku", lat: 7.1445, lng: 3.3395, color: "pink" }
];

export const ABEOKUTA_CENTER: [number, number] = [7.147, 3.361];
export const ABEOKUTA_BOUNDS: [[number, number], [number, number]] = [[7.05, 3.28], [7.22, 3.44]];
