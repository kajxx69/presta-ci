// Banques d'images libres de droits pour remplir le fil « Découvrir ».
// La première banque configurée est utilisée, dans cet ordre :
//  1. Pixabay  (PIXABAY_API_KEY)     — clé immédiate et gratuite. Le lien direct
//     permanent est interdit : les images sont COPIÉES sur notre serveur (GridFS).
//     https://pixabay.com/api/docs/
//  2. Unsplash (UNSPLASH_ACCESS_KEY) — lien direct obligatoire + « déclaration »
//     d'usage de chaque photo (download_location). 50 requêtes/h en mode démo.
//     https://help.unsplash.com/api-guidelines
//  3. Pexels   (PEXELS_API_KEY)      — délivrance de nouvelles clés suspendue (2026).

export type NomBanque = 'pixabay' | 'unsplash' | 'pexels';

export interface PhotoBanque {
  id_externe: string;        // ex. "pixabay:123" — anti-doublon
  url: string;               // image à afficher (Unsplash/Pexels) ou à copier (Pixabay)
  a_copier: boolean;         // true = télécharger et stocker chez nous
  titre: string;
  credit_nom: string;
  credit_url: string;
  declarerUsage?: () => Promise<void>; // Unsplash : à appeler quand la photo est importée
}

const cle = (n: string) => process.env[n] || '';
const UTM = 'utm_source=prestaci&utm_medium=referral';

export function banqueActive(): NomBanque | null {
  if (cle('PIXABAY_API_KEY')) return 'pixabay';
  if (cle('UNSPLASH_ACCESS_KEY')) return 'unsplash';
  if (cle('PEXELS_API_KEY')) return 'pexels';
  return null;
}

export const LIBELLE_BANQUE: Record<NomBanque, string> = { pixabay: 'Pixabay', unsplash: 'Unsplash', pexels: 'Pexels' };

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const corps = (await res.text()).slice(0, 200);
    if (res.status === 429 || (res.status === 403 && /rate limit/i.test(corps))) {
      throw new Error('Limite de requêtes de la banque d\'images atteinte — réessayez plus tard (les photos déjà importées sont conservées)');
    }
    throw new Error(`HTTP ${res.status}: ${corps}`);
  }
  return res.json();
}

async function pixabay(query: string, nombre: number, page: number): Promise<PhotoBanque[]> {
  const params = new URLSearchParams({
    key: cle('PIXABAY_API_KEY'), q: query.slice(0, 100), image_type: 'photo', orientation: 'vertical',
    safesearch: 'true', per_page: String(Math.min(200, Math.max(3, nombre))), page: String(page),
  });
  const json = await getJson(`https://pixabay.com/api/?${params}`);
  return (json.hits || []).slice(0, nombre).map((h: any) => ({
    id_externe: `pixabay:${h.id}`,
    url: h.largeImageURL || h.webformatURL,
    a_copier: true,
    titre: String(h.tags || query).split(',')[0].trim() || query,
    credit_nom: h.user ? `${h.user} / Pixabay` : 'Pixabay',
    credit_url: h.pageURL || 'https://pixabay.com',
  }));
}

async function unsplash(query: string, nombre: number, page: number): Promise<PhotoBanque[]> {
  const auth = { Authorization: `Client-ID ${cle('UNSPLASH_ACCESS_KEY')}`, 'Accept-Version': 'v1' };
  const params = new URLSearchParams({ query, per_page: String(Math.min(30, Math.max(1, nombre))), page: String(page), orientation: 'portrait', content_filter: 'high' });
  const json = await getJson(`https://api.unsplash.com/search/photos?${params}`, auth);
  return (json.results || []).map((p: any) => ({
    id_externe: `unsplash:${p.id}`,
    url: p.urls?.regular,
    a_copier: false,
    titre: (p.alt_description || p.description || query).slice(0, 120),
    credit_nom: p.user?.name ? `${p.user.name} / Unsplash` : 'Unsplash',
    credit_url: `${p.user?.links?.html || 'https://unsplash.com'}?${UTM}`,
    declarerUsage: p.links?.download_location
      ? async () => { await fetch(p.links.download_location, { headers: auth }).catch(() => {}); }
      : undefined,
  })).filter((p: PhotoBanque) => !!p.url);
}

async function pexels(query: string, nombre: number, page: number): Promise<PhotoBanque[]> {
  const params = new URLSearchParams({ query, per_page: String(Math.min(80, Math.max(1, nombre))), page: String(page), orientation: 'portrait' });
  const json = await getJson(`https://api.pexels.com/v1/search?${params}`, { Authorization: cle('PEXELS_API_KEY') });
  return (json.photos || []).map((p: any) => ({
    id_externe: `pexels:${p.id}`,
    url: p.src?.portrait || p.src?.large,
    a_copier: false,
    titre: (p.alt || query).slice(0, 120),
    credit_nom: p.photographer ? `${p.photographer} / Pexels` : 'Pexels',
    credit_url: p.url || 'https://www.pexels.com',
  })).filter((p: PhotoBanque) => !!p.url);
}

export async function rechercherPhotos(query: string, nombre: number, page = 1): Promise<PhotoBanque[]> {
  const banque = banqueActive();
  if (!banque) throw new Error('Aucune banque d\'images configurée (PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY ou PEXELS_API_KEY)');
  if (banque === 'pixabay') return pixabay(query, nombre, page);
  if (banque === 'unsplash') return unsplash(query, nombre, page);
  return pexels(query, nombre, page);
}
