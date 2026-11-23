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
