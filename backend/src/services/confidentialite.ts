import { communeParNom, communeDepuisTexte } from './communes.js';
import { estPro } from './plans.js';

// Sécurité des pros (beaucoup travaillent chez elles) et des clientes :
//  - le public ne voit que la commune et une position approximative, jamais l'adresse exacte
//  - l'adresse exacte et l'itinéraire n'apparaissent qu'une fois la réservation confirmée

/** Statuts où l'adresse exacte est partagée entre la cliente et la pro. */
export const STATUTS_ADRESSE_VISIBLE = ['confirmee', 'acceptee', 'en_attente_confirmation', 'terminee'];
export const adresseVisible = (statut?: string | null) => !!statut && STATUTS_ADRESSE_VISIBLE.includes(statut);

/** Position publique : centre de la commune, sinon coordonnées arrondies (~1 km). */
export function positionApprox(p: { latitude?: number | null; longitude?: number | null; commune?: string | null; ville?: string | null }): { latitude: number; longitude: number } | null {
  const c = communeParNom(p.commune) || communeDepuisTexte(p.ville);
  if (c) return { latitude: c.lat, longitude: c.lng };
  if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
    return { latitude: Math.round(p.latitude * 100) / 100, longitude: Math.round(p.longitude * 100) / 100 };
  }
  return null;
}

/**
 * Fiche publique d'une pro : liste blanche de champs. Jamais d'adresse exacte, de GPS précis,
 * de document d'identité, d'identifiant de compte ni de champ interne.
 */
export function vuePubliquePrestataire(doc: any, extra: Record<string, unknown> = {}) {
  const p = typeof doc?.toJSON === 'function' ? doc.toJSON() : doc;
  const pos = positionApprox(p);
  return {
    id: p._id ?? p.id,
    nom_commercial: p.nom_commercial,
    bio: p.bio ?? null,
    ville: p.ville ?? null,
    commune: p.commune ?? null,
    pays: p.pays ?? null,
    telephone_pro: p.telephone_pro ?? null,
    horaires_ouverture: p.horaires_ouverture ?? {},
    photos_etablissement: Array.isArray(p.photos_etablissement) ? p.photos_etablissement : [],
    note_moyenne: p.note_moyenne ?? 0,
    nombre_avis: p.nombre_avis ?? 0,
    is_verified: !!p.is_verified,
    is_pro: estPro(p),
    zones_deplacement: p.zones_deplacement ?? [],
    frais_deplacement: p.frais_deplacement ?? 0,
    created_at: p.created_at,
    // Position approximative (commune) : suffisante pour une carte ou une distance
    latitude: pos?.latitude ?? null,
    longitude: pos?.longitude ?? null,
    position_approx: true,
    ...extra,
  };
}

/** Lien d'itinéraire Google Maps (ouvre l'app sur téléphone). */
export function lienItineraire(lat?: number | null, lng?: number | null, adresse?: string | null): string | null {
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (adresse && adresse.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${adresse.trim()}, Côte d'Ivoire`)}`;
  }
  return null;
}
