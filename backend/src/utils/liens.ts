// Liens externes acceptés dans les demandes et tableaux d'inspiration.

const HOTES_INSPIRATION = /^(([a-z0-9-]+\.)?pinterest\.[a-z.]{2,6}|pin\.it|([a-z0-9-]+\.)?instagram\.com|([a-z0-9-]+\.)?tiktok\.com)$/i;

/** Lien Pinterest / Instagram / TikTok en https, sinon null. */
export function lienInspirationValide(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null;
  const brut = valeur.trim();
  if (!brut || brut.length > 500) return null;
  try {
    const u = new URL(brut);
    if (u.protocol !== 'https:' || !HOTES_INSPIRATION.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** URL d'un tableau Pinterest (https://www.pinterest.com/<compte>/<tableau>/), sinon null. */
export function tableauPinterestValide(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null;
  try {
    const u = new URL(valeur.trim());
    if (u.protocol !== 'https:' || !/^([a-z0-9-]+\.)?pinterest\.[a-z.]{2,6}$/i.test(u.hostname)) return null;
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length !== 2 || segments[0] === 'pin' || segments[0] === 'search') return null;
    return `https://www.pinterest.com/${segments[0]}/${segments[1]}/`;
  } catch {
    return null;
  }
}
