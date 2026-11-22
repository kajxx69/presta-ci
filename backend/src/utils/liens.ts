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

/** Extrait l'identifiant d'une épingle d'une URL Pinterest complète (/pin/123/ ou /pin/titre--123/). */
export function idEpingle(valeur: string): string | null {
  try {
    const u = new URL(valeur.trim());
    if (u.protocol !== 'https:' || !/^([a-z0-9-]+\.)?pinterest\.[a-z.]{2,6}$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/pin\/(?:[^/]*--)?(\d{5,25})\/?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * Lien d'épingle Pinterest → { id, url canonique }, sinon null.
 * Les liens courts pin.it (bouton « Partager ») sont résolus en suivant la redirection.
 */
export async function epinglePinterestValide(valeur: string): Promise<{ id: string; url: string } | null> {
  let brut = String(valeur || '').trim();
  if (!brut || brut.length > 500) return null;
  try {
    const u = new URL(brut);
    if (u.protocol === 'https:' && u.hostname === 'pin.it') {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(brut, { redirect: 'follow', signal: controller.signal });
        brut = res.url;
        res.body?.cancel().catch(() => {});
      } finally {
        clearTimeout(timer);
      }
    }
  } catch {
    return null;
  }
  const id = idEpingle(brut);
  return id ? { id, url: `https://www.pinterest.com/pin/${id}/` } : null;
}
