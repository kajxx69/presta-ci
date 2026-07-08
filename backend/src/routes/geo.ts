import express, { Request, Response } from 'express';
import { serverError } from '../utils/http.js';
import { logger } from '../logger.js';

/**
 * Proxy de géocodage (Nominatim / OpenStreetMap).
 * - Le frontend ne tape plus Nominatim en direct : quota et User-Agent centralisés,
 *   cache partagé entre tous les utilisateurs, et point unique si on passe un jour
 *   à un géocodeur payant (Google/Mapbox).
 * - Cache mémoire 24h + espacement des appels sortants (politique Nominatim : 1 req/s).
 */

const router = express.Router();

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'PrestaCI/1.0 (marketplace de services, contact: support@prestaci.com)';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 2000;

const cache = new Map<string, { at: number; data: any }>();

function cacheGet(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key: string, data: any) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Éviction du plus ancien
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), data });
}

// Espacement des appels sortants vers Nominatim
let lastCallAt = 0;
async function throttledFetch(url: string): Promise<any> {
  const wait = Math.max(0, lastCallAt + 1100 - Date.now());
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallAt = Date.now();

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr' },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json();
}

/** Extrait un libellé court "Quartier, Ville" depuis une réponse Nominatim */
function shortLabel(address: any, fallback: string): string {
  if (!address) return fallback;
  const quartier = address.suburb || address.neighbourhood || address.quarter || address.city_district || address.village;
  const ville = address.city || address.town || address.municipality || address.county;
  if (quartier && ville) return `${quartier}, ${ville}`;
  return ville || quartier || fallback;
}

// GET /api/geo/search?q= — autocomplete d'adresse (limité à la Côte d'Ivoire)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 3) return res.json([]);

    const key = `s:${q.toLowerCase()}`;
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    const url = `${NOMINATIM_BASE}/search?format=json&addressdetails=1&limit=6&countrycodes=ci&q=${encodeURIComponent(q)}`;
    const data = await throttledFetch(url);

    const results = (Array.isArray(data) ? data : []).map((r: any) => ({
      label: r.display_name,
      label_court: shortLabel(r.address, r.display_name?.split(',')[0] || ''),
      lat: Number(r.lat),
      lng: Number(r.lon),
      type: r.type,
    }));

    cacheSet(key, results);
    res.json(results);
  } catch (e: any) {
    logger.warn(`[geo] search échoué: ${e.message}`);
    res.json([]); // dégradé silencieux : l'UI garde la saisie manuelle
  }
});

// GET /api/geo/reverse?lat=&lng= — position → adresse lisible
router.get('/reverse', async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat et lng requis' });
    }

    // Arrondi à ~100m pour maximiser les hits de cache
    const key = `r:${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    const url = `${NOMINATIM_BASE}/reverse?format=json&addressdetails=1&zoom=16&lat=${lat}&lon=${lng}`;
    const data = await throttledFetch(url);

    const result = {
      label: data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      label_court: shortLabel(data?.address, `${lat.toFixed(4)}, ${lng.toFixed(4)}`),
      quartier: data?.address?.suburb || data?.address?.neighbourhood || null,
      ville: data?.address?.city || data?.address?.town || null,
      lat, lng,
    };

    cacheSet(key, result);
    res.json(result);
  } catch (e: any) {
    serverError(res, e, 'geo/reverse');
  }
});

export default router;
