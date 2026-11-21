// Import de photos d'inspiration depuis Pexels (licence libre, usage commercial
// autorisé — https://www.pexels.com/license/). Clé gratuite : https://www.pexels.com/api/
// Les images restent hébergées par Pexels (CDN), comme le prévoit leur API.

const API_KEY = process.env.PEXELS_API_KEY || '';

export function isPexelsConfigured(): boolean {
  return Boolean(API_KEY);
}

export interface PhotoPexels {
  id_externe: string;
  photo_url: string;
  titre: string;
  credit_nom: string;
  credit_url: string;
}

export async function rechercherPexels(query: string, nombre: number, page = 1): Promise<PhotoPexels[]> {
  const perPage = Math.min(80, Math.max(1, nombre));
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: API_KEY } });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json: any = await res.json();
  return (json.photos || []).map((p: any) => ({
    id_externe: `pexels:${p.id}`,
    photo_url: p.src?.portrait || p.src?.large || p.src?.original,
    titre: (p.alt || query).slice(0, 120),
    credit_nom: p.photographer ? `${p.photographer} / Pexels` : 'Pexels',
    credit_url: p.url || p.photographer_url || 'https://www.pexels.com',
  })).filter((p: PhotoPexels) => !!p.photo_url);
}
