// Communes d'Abidjan et grandes villes — même liste que backend/src/services/communes.ts
export const COMMUNES_ABIDJAN = [
  'Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi', 'Marcory', 'Plateau',
  'Port-Bouët', 'Treichville', 'Yopougon', 'Bingerville', 'Anyama', 'Songon',
] as const;
export const AUTRES_VILLES = [
  'Grand-Bassam', 'Assinie', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo', 'Man', 'Gagnoa', 'Abengourou',
] as const;
export const COMMUNES: readonly string[] = [...COMMUNES_ABIDJAN, ...AUTRES_VILLES];

/** « 1,2 km », « 800 m », « ~3 km » (approximatif = centre de commune). */
export function formatDistance(km: number | null | undefined, approx?: boolean): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  const txt = km < 1 ? `${Math.max(100, Math.round(km * 10) * 100)} m` : `${(km < 10 ? Math.round(km * 10) / 10 : Math.round(km)).toLocaleString('fr-FR')} km`;
  return approx ? `~${txt}` : txt;
}

/** « 1,2 km · Cocody », « Dans ta commune · Cocody », ou simplement la commune/ville. */
export function libelleLieu(p: { distance_km?: number | null; distance_approx?: boolean; commune?: string | null; ville?: string | null }, maCommune?: string | null): string | null {
  const lieu = p.commune || p.ville || null;
  // Position = commune choisie (pas de GPS) et pro de la même commune : la distance n'aurait pas de sens
  const memeCommune = !!maCommune && !!p.commune && p.commune === maCommune && !!p.distance_approx;
  if (memeCommune || (p.distance_approx && p.distance_km != null && p.distance_km < 0.5)) return lieu ? `Dans ta commune · ${lieu}` : 'Dans ta commune';
  const d = formatDistance(p.distance_km, p.distance_approx);
  return d ? [d, lieu].filter(Boolean).join(' · ') : lieu;
}
