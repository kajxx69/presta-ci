// Communes d'Abidjan et grandes villes de Côte d'Ivoire, avec le centre approximatif
// de chacune. Sert à :
//  - normaliser la « ville » saisie par les pros et les clientes (« Yop », « Riviera 2 »…)
//  - calculer une distance même quand une pro n'a pas de position GPS (centre de sa commune)
// Garder cette liste identique à frontend/src/lib/communes.ts.

export interface Commune { nom: string; zone: 'Abidjan' | 'Autres villes'; lat: number; lng: number; alias?: string[] }

export const COMMUNES: Commune[] = [
  { nom: 'Abobo', zone: 'Abidjan', lat: 5.4189, lng: -4.0203, alias: ['abobo baoule', 'pk 18', 'n dotre', 'ndotre'] },
  { nom: 'Adjamé', zone: 'Abidjan', lat: 5.3670, lng: -4.0180, alias: ['williamsville', '220 logements'] },
  { nom: 'Attécoubé', zone: 'Abidjan', lat: 5.3370, lng: -4.0430, alias: ['locodjro', 'agban'] },
  { nom: 'Cocody', zone: 'Abidjan', lat: 5.3540, lng: -3.9870, alias: ['angre', 'riviera', '2 plateaux', 'deux plateaux', 'faya', 'palmeraie', 'blockhauss', 'danga', 'ambassades', 'mpouto', 'akouedo', 'saint jean'] },
  { nom: 'Koumassi', zone: 'Abidjan', lat: 5.2980, lng: -3.9550, alias: ['remblais', 'sicogi koumassi'] },
  { nom: 'Marcory', zone: 'Abidjan', lat: 5.3030, lng: -3.9800, alias: ['zone 4', 'biafra', 'anoumabo', 'residentiel marcory'] },
  { nom: 'Plateau', zone: 'Abidjan', lat: 5.3230, lng: -4.0170, alias: ['le plateau'] },
  { nom: 'Port-Bouët', zone: 'Abidjan', lat: 5.2560, lng: -3.9260, alias: ['port bouet', 'vridi', 'gonzagueville', 'gonzague', 'aeroport', 'adjouffou'] },
  { nom: 'Treichville', zone: 'Abidjan', lat: 5.2930, lng: -4.0050, alias: ['treich', 'arras'] },
  { nom: 'Yopougon', zone: 'Abidjan', lat: 5.3450, lng: -4.0750, alias: ['yop', 'niangon', 'sideci', 'selmer', 'maroc', 'toits rouges', 'andokoi', 'banco', 'koweit', 'wassakara', 'sicogi'] },
  { nom: 'Bingerville', zone: 'Abidjan', lat: 5.3550, lng: -3.8850, alias: ['binger', 'feh kesse'] },
  { nom: 'Anyama', zone: 'Abidjan', lat: 5.4950, lng: -4.0520 },
  { nom: 'Songon', zone: 'Abidjan', lat: 5.3200, lng: -4.2600 },
  { nom: 'Grand-Bassam', zone: 'Autres villes', lat: 5.2110, lng: -3.7380, alias: ['bassam'] },
  { nom: 'Assinie', zone: 'Autres villes', lat: 5.1350, lng: -3.2850 },
  { nom: 'Bouaké', zone: 'Autres villes', lat: 7.6900, lng: -5.0300 },
  { nom: 'Yamoussoukro', zone: 'Autres villes', lat: 6.8270, lng: -5.2890, alias: ['yakro'] },
  { nom: 'San-Pédro', zone: 'Autres villes', lat: 4.7480, lng: -6.6360 },
  { nom: 'Daloa', zone: 'Autres villes', lat: 6.8770, lng: -6.4500 },
  { nom: 'Korhogo', zone: 'Autres villes', lat: 9.4580, lng: -5.6290 },
  { nom: 'Man', zone: 'Autres villes', lat: 7.4120, lng: -7.5540 },
  { nom: 'Gagnoa', zone: 'Autres villes', lat: 6.1310, lng: -5.9510 },
  { nom: 'Abengourou', zone: 'Autres villes', lat: 6.7300, lng: -3.4960 },
];

const simplifier = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const PAR_NOM = new Map(COMMUNES.map(c => [simplifier(c.nom), c]));

/** Commune exacte (insensible aux accents/majuscules) ou null. */
export function communeParNom(nom: unknown): Commune | null {
  return typeof nom === 'string' ? PAR_NOM.get(simplifier(nom)) || null : null;
}

/** Devine la commune dans un texte libre (« Yop Maroc », « Cocody Angré », « Riviera 2 »…). */
export function communeDepuisTexte(texte: unknown): Commune | null {
  if (typeof texte !== 'string' || !texte.trim()) return null;
  const t = ` ${simplifier(texte)} `;
  for (const c of COMMUNES) if (t.includes(` ${simplifier(c.nom)} `)) return c;
  for (const c of COMMUNES) if (c.alias?.some(a => t.includes(` ${a} `))) return c;
  return null;
}

/** Distance à vol d'oiseau en km. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface Point { lat: number; lng: number; approx: boolean }

const coordValide = (lat: unknown, lng: unknown) =>
  typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

/** Position d'une pro : son GPS si connu, sinon le centre de sa commune (approximatif). */
export function positionPrestataire(p: { latitude?: number | null; longitude?: number | null; commune?: string | null; ville?: string | null; adresse?: string | null }): Point | null {
  if (coordValide(p.latitude, p.longitude)) return { lat: p.latitude!, lng: p.longitude!, approx: false };
  const c = communeParNom(p.commune) || communeDepuisTexte(p.ville) || communeDepuisTexte(p.adresse);
  return c ? { lat: c.lat, lng: c.lng, approx: true } : null;
}

/** Position de la cliente depuis la requête : ?lat=&lng= (GPS) ou ?commune=. */
export function positionDepuisRequete(q: Record<string, unknown>): Point | null {
  const lat = Number(q.lat), lng = Number(q.lng);
  if (q.lat !== undefined && q.lng !== undefined && coordValide(lat, lng)) return { lat, lng, approx: false };
  const c = communeParNom(q.commune);
  return c ? { lat: c.lat, lng: c.lng, approx: true } : null;
}
