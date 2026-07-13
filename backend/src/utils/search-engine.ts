/**
 * Moteur de recherche PrestaCI.
 *
 * - Insensible aux accents et à la casse ("reparation" trouve "Réparation")
 * - Tolérant aux fautes de frappe (distance de Levenshtein ≤ 1-2 selon la longueur)
 * - Multi-mots avec sémantique ET ("coiffure abidjan" = les deux doivent matcher)
 * - Synonymes courants du marché ivoirien ("menage" → nettoyage…)
 * - Classement par pertinence : mot exact > préfixe > sous-chaîne > fuzzy,
 *   pondéré par champ (nom > catégorie > description) et boosté par la
 *   réputation (note, avis, vérifié)
 */

// ── Fonctions pures (testables) ─────────────────────────────────────────────

/** Minuscules + suppression des accents + nettoyage ponctuation */
export function normalize(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  return normalize(input).split(' ').filter(t => t.length >= 2);
}

/** Distance de Levenshtein avec sortie anticipée au-delà de `max` */
export function levenshtein(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[n];
}

/** Tolérance aux fautes proportionnelle à la longueur du mot */
function fuzzyBudget(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 6) return 1;
  return 2;
}

/**
 * Score d'un token de requête contre une liste de mots d'un champ.
 * 10 = mot exact, 7 = préfixe, 4 = sous-chaîne, 2-3 = fuzzy, 0 = aucun match.
 */
export function scoreTokenAgainstWords(token: string, words: string[]): number {
  let best = 0;
  const budget = fuzzyBudget(token);
  for (const word of words) {
    if (word === token) return 10;
    if (word.startsWith(token)) { best = Math.max(best, 7); continue; }
    if (token.length >= 3 && word.includes(token)) { best = Math.max(best, 4); continue; }
    if (budget > 0) {
      const d = levenshtein(token, word, budget);
      if (d <= budget) best = Math.max(best, d === 1 ? 3 : 2);
    }
  }
  return best;
}

/** Synonymes / vocabulaire courant → termes du catalogue */
const SYNONYMS: Record<string, string[]> = {
  cheveux: ['coiffure'],
  coupe: ['coiffure'],
  tresse: ['coiffure', 'tresses'],
  barbier: ['coiffure', 'barbe'],
  menage: ['nettoyage'],
  lessive: ['nettoyage', 'pressing'],
  bouffe: ['traiteur', 'restauration'],
  manger: ['traiteur', 'restauration'],
  cuisine: ['traiteur', 'restauration'],
  gateau: ['patisserie', 'traiteur'],
  sport: ['fitness'],
  muscu: ['fitness'],
  ongle: ['ongles', 'manucure'],
  vernis: ['ongles', 'manucure'],
  fleur: ['fleuriste'],
  deco: ['decoration'],
  photo: ['photographie'],
  carte: ['imprimerie'],
  flyer: ['imprimerie'],
  affiche: ['imprimerie'],
  logo: ['design', 'infographie'],
  detente: ['massage', 'bien etre'],
  spa: ['massage', 'bien etre'],
  maquillage: ['beaute', 'esthetique'],
};

export function expandTokens(tokens: string[]): { tokens: string[]; extra: string[] } {
  const extra: string[] = [];
  for (const t of tokens) {
    const syns = SYNONYMS[t];
    if (syns) {
      for (const s of syns) {
        for (const w of tokenize(s)) {
          if (!tokens.includes(w) && !extra.includes(w)) extra.push(w);
        }
      }
    }
  }
  return { tokens, extra };
}

/**
 * Groupes de variantes par mot de la requête : [mot, ...ses synonymes].
 * Un mot est "satisfait" si lui-même OU un de ses synonymes matche.
 */
export function buildTokenGroups(tokens: string[]): string[][] {
  return tokens.map(t => {
    const group = [t];
    for (const s of SYNONYMS[t] || []) {
      for (const w of tokenize(s)) {
        if (!group.includes(w)) group.push(w);
      }
    }
    return group;
  });
}

/** Distance Haversine en km (pure, testable) */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Boost de proximité : décroissance exponentielle.
 * ~8 pts à 0 km, ~3 pts à 5 km, ~1 pt à 10 km, négligeable au-delà de 25 km.
 */
export function proximityBoost(distanceKm: number): number {
  return 8 * Math.exp(-distanceKm / 5);
}

export interface SearchField {
  words: string[];
  weight: number;
}

/**
 * Score global d'un document (multi-champs) pour une requête en groupes de variantes.
 * Sémantique ET : chaque groupe (mot + synonymes) doit matcher au moins un champ, sinon 0.
 * Un match via synonyme compte à 80% du score direct.
 */
export function scoreDocument(groups: string[][], fields: SearchField[]): number {
  let total = 0;
  for (const group of groups) {
    let bestWeighted = 0;
    group.forEach((variant, idx) => {
      const synonymFactor = idx === 0 ? 1 : 0.8;
      for (const field of fields) {
        const s = scoreTokenAgainstWords(variant, field.words) * field.weight * synonymFactor;
        if (s > bestWeighted) bestWeighted = s;
      }
    });
    if (bestWeighted === 0) return 0; // ET strict par groupe
    total += bestWeighted;
  }
  return total;
}

// ── Index en mémoire ─────────────────────────────────────────────────────────

import { Service, Prestataire, Category, SubCategory } from '../models/index.js';

interface IndexedService {
  doc: any;
  fields: SearchField[];
  boost: number;
}
interface IndexedPrestataire {
  doc: any;
  fields: SearchField[];
  boost: number;
}

interface SearchIndex {
  builtAt: number;
  services: IndexedService[];
  prestataires: IndexedPrestataire[];
}

const INDEX_TTL_MS = 60 * 1000; // reconstruit au plus toutes les 60s
let indexCache: SearchIndex | null = null;
let building: Promise<SearchIndex> | null = null;

async function buildIndex(): Promise<SearchIndex> {
  const [services, prestataires, categories, subCategories] = await Promise.all([
    Service.find({ is_active: true }),
    Prestataire.find({ is_active: true }),
    Category.find({}),
    SubCategory.find({}),
  ]);

  const catById = new Map(categories.map(c => [c._id as number, c]));
  const subById = new Map(subCategories.map(s => [s._id as number, s]));
  const prestaById = new Map(prestataires.map(p => [p._id as number, p]));

  const indexedServices: IndexedService[] = services.map(s => {
    const sub = subById.get(s.sous_categorie_id);
    const cat = sub ? catById.get((sub as any).categorie_id) : null;
    const presta = prestaById.get(s.prestataire_id);
    const doc = {
      ...s.toJSON(),
      sous_categorie_nom: (sub as any)?.nom || null,
      categorie_nom: (cat as any)?.nom || null,
      prestataire_nom: presta?.nom_commercial || null,
      prestataire_ville: presta?.ville || null,
      prestataire_latitude: presta?.latitude ?? null,
      prestataire_longitude: presta?.longitude ?? null,
    };
    return {
      doc,
      fields: [
        { words: tokenize(s.nom), weight: 3 },
        { words: tokenize(`${(sub as any)?.nom || ''} ${(cat as any)?.nom || ''}`), weight: 2.2 },
        { words: tokenize(`${presta?.nom_commercial || ''} ${presta?.ville || ''}`), weight: 1.6 },
        { words: tokenize(s.description || ''), weight: 1 },
      ],
      boost: (s.note_moyenne || 0) * 0.6 + Math.log10((s.nombre_avis || 0) + 1) * 1.5,
    };
  });

  const servicesByPresta = new Map<number, string[]>();
  for (const s of services) {
    const list = servicesByPresta.get(s.prestataire_id) || [];
    list.push(s.nom);
    servicesByPresta.set(s.prestataire_id, list);
  }

  const indexedPrestataires: IndexedPrestataire[] = prestataires.map(p => ({
    doc: p.toJSON(),
    fields: [
      { words: tokenize(p.nom_commercial || ''), weight: 3 },
      { words: tokenize(`${p.ville || ''} ${p.adresse || ''}`), weight: 1.8 },
      // Un prestataire est trouvable par ce qu'il propose
      { words: tokenize((servicesByPresta.get(p._id as number) || []).join(' ')), weight: 1.5 },
      { words: tokenize(p.bio || ''), weight: 1 },
    ],
    boost:
      (p.is_verified ? 2 : 0) +
      (p.note_moyenne || 0) * 0.6 +
      Math.log10((p.nombre_avis || 0) + 1) * 1.5,
  }));

  return { builtAt: Date.now(), services: indexedServices, prestataires: indexedPrestataires };
}

async function getIndex(): Promise<SearchIndex> {
  if (indexCache && Date.now() - indexCache.builtAt < INDEX_TTL_MS) return indexCache;
  if (!building) {
    building = buildIndex()
      .then(idx => { indexCache = idx; return idx; })
      .finally(() => { building = null; });
  }
  // Si un index périmé existe, on le sert pendant la reconstruction
  return indexCache || building;
}

/** Force la reconstruction au prochain appel (ex: après seed/migration) */
export function invalidateSearchIndex() {
  indexCache = null;
}

export interface SearchResults {
  services: any[];
  prestataires: any[];
}

export interface GeoContext {
  lat: number;
  lng: number;
}

export async function searchAll(query: string, limit = 12, geo?: GeoContext): Promise<SearchResults> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return { services: [], prestataires: [] };
  const groups = buildTokenGroups(tokens);

  const index = await getIndex();

  // Distance depuis la position de l'utilisateur (si fournie) → boost + affichage
  const withGeo = (doc: any, docLat: number | null, docLng: number | null) => {
    if (!geo || typeof docLat !== 'number' || typeof docLng !== 'number') {
      return { distance: null as number | null, boost: 0 };
    }
    const distance = haversineKm(geo.lat, geo.lng, docLat, docLng);
    return { distance, boost: proximityBoost(distance) };
  };

  const services = index.services
    .map(entry => ({ entry, score: scoreDocument(groups, entry.fields) }))
    .filter(x => x.score > 0)
    .map(x => {
      const g = withGeo(x.entry.doc, x.entry.doc.prestataire_latitude, x.entry.doc.prestataire_longitude);
      return { ...x, score: x.score + x.entry.boost + g.boost, distance: g.distance };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => ({
      ...x.entry.doc,
      _score: Math.round(x.score * 10) / 10,
      distance_km: x.distance !== null ? Math.round(x.distance * 10) / 10 : undefined,
    }));

  const prestataires = index.prestataires
    .map(entry => ({ entry, score: scoreDocument(groups, entry.fields) }))
    .filter(x => x.score > 0)
    .map(x => {
      const g = withGeo(x.entry.doc, x.entry.doc.latitude, x.entry.doc.longitude);
      return { ...x, score: x.score + x.entry.boost + g.boost, distance: g.distance };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => ({
      ...x.entry.doc,
      _score: Math.round(x.score * 10) / 10,
      distance_km: x.distance !== null ? Math.round(x.distance * 10) / 10 : undefined,
    }));

  return { services, prestataires };
}
