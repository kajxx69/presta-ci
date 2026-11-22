import { Modele } from '../models/index.js';
import { normaliser, texteRecherche } from './modeles-sync.js';
import { rechercherPhotos, maxParRequete } from '../utils/banques-images.js';
import { photoPertinente, ETHNIE } from './filtre-photos.js';
import { copierImageDistante } from '../utils/uploads.js';

type Categorie = 'coiffure' | 'ongles' | 'maquillage' | 'cils' | 'soins';

export interface DemandeImport {
  query: string;      // recherche dans la banque d'images (anglais conseillé)
  categorie: Categorie;
  nombre: number;     // 1..80
  titre?: string;     // titre affiché sur les cartes (français). Défaut : description de la banque
  tags?: string;      // mots-clés français pour la recherche dans l'app
  page?: number;
  /** Chaque groupe doit être présent dans les étiquettes de la photo (voir filtre-photos.ts) */
  requis?: string[][];
}

/** Importe des photos de la banque d'images active comme modèles d'inspiration (sans doublon). */
export async function importerPhotos(d: DemandeImport): Promise<{ trouves: number; importes: number; doublons: number; ecartees: number }> {
  const tags = [...new Set(normaliser(`${d.titre || ''} ${d.tags || ''} ${d.query}`).split(' ').filter(w => w.length > 2))];
  const voulu = Math.min(80, Math.max(1, d.nombre));
  // On demande ~5× plus de résultats pour en garder assez après le filtre de pertinence
  const bruts = await rechercherPhotos(d.query.trim(), Math.min(maxParRequete(), voulu * 5), Math.max(1, d.page || 1));
  const photos = bruts.filter(p => photoPertinente(p.mots, d.requis)).slice(0, voulu);
  const deja = new Set((await Modele.find({ source_externe_id: { $in: photos.map(p => p.id_externe) } }).distinct('source_externe_id')) as string[]);
  let importes = 0;
  for (const p of photos) {
    if (deja.has(p.id_externe)) continue;
    try {
      // Pixabay interdit le lien direct permanent : on copie l'image chez nous
      const photo_url = p.a_copier ? await copierImageDistante(p.url) : p.url;
      await Modele.create({
        titre: d.titre?.trim() || p.titre, categorie: d.categorie, tags, photo_url, source: 'curation',
        credit_nom: p.credit_nom, credit_url: p.credit_url, source_externe_id: p.id_externe,
        recherche: texteRecherche([d.titre, d.tags, p.titre, d.query, d.categorie]),
      });
      importes++;
      await p.declarerUsage?.(); // Unsplash : obligatoire quand une photo est utilisée
    } catch (e: any) {
      if (e?.code === 11000) continue; // doublon importé en parallèle : ignoré
      if (/Téléchargement image|Type d'image|trop lourde|aborted/i.test(String(e?.message))) continue; // image cassée : on passe
      throw e;
    }
  }
  return { trouves: photos.length, importes, doublons: photos.length - importes, ecartees: bruts.length - photos.length };
}

const STYLE_COIFFURE = ['braid', 'cornrow', 'dreadlock', 'locs', 'twist', 'bantu', 'afro', 'bun', 'updo', 'wig', 'headwrap', 'turban', 'headscarf', 'hairstyle', 'curl'];

/**
 * Pack de lancement : ~300 photos des styles les plus demandés à Abidjan.
 * Titres et mots-clés en français ; « requis » écarte les photos hors sujet.
 */
export const PACK_LANCEMENT: Omit<DemandeImport, 'nombre'>[] = [
  { query: 'box braids', categorie: 'coiffure', titre: 'Box braids', tags: 'box braids tresses knotless', requis: [['braid'], ETHNIE] },
  { query: 'african woman braids', categorie: 'coiffure', titre: 'Tresses africaines', tags: 'tresses knotless nattes', requis: [['braid'], ETHNIE] },
  { query: 'black woman braids hairstyle', categorie: 'coiffure', titre: 'Tresses longues', tags: 'tresses longues knotless', requis: [['braid'], ETHNIE] },
  { query: 'cornrows', categorie: 'coiffure', titre: 'Nattes collées', tags: 'nattes collees cornrows', requis: [['cornrow', 'braid'], ETHNIE] },
  { query: 'dreadlocks woman', categorie: 'coiffure', titre: 'Locks', tags: 'locks dreadlocks locs', requis: [['dreadlock', 'locs'], ETHNIE] },
  { query: 'bantu knots', categorie: 'coiffure', titre: 'Bantu knots', tags: 'bantu knots twists', requis: [['bantu', 'twist', 'knot'], ETHNIE] },
  { query: 'afro hair woman', categorie: 'coiffure', titre: 'Afro naturel', tags: 'afro naturel cheveux crepus', requis: [['afro', 'curl']] },
  { query: 'african woman hairstyle', categorie: 'coiffure', titre: 'Coiffure africaine', tags: 'coiffure africaine', requis: [STYLE_COIFFURE, ETHNIE] },
  { query: 'african headwrap', categorie: 'coiffure', titre: 'Foulard & turban', tags: 'foulard turban attache', requis: [['headwrap', 'turban', 'headscarf', 'head', 'scarf'], ETHNIE] },
  { query: 'black woman wig', categorie: 'coiffure', titre: 'Perruque', tags: 'perruque wig lace tissage', requis: [['wig', 'hair'], ETHNIE] },
  { query: 'nail art', categorie: 'ongles', titre: 'Nail art', tags: 'nail art deco ongles', requis: [['nail', 'manicure', 'fingernail']] },
  { query: 'manicure nails', categorie: 'ongles', titre: 'Manucure', tags: 'manucure vernis french gel', requis: [['nail', 'manicure', 'fingernail', 'polish']] },
  { query: 'nail polish hands', categorie: 'ongles', titre: 'Vernis & gel', tags: 'vernis gel semi permanent', requis: [['nail', 'manicure', 'fingernail', 'polish']] },
  { query: 'african woman makeup', categorie: 'maquillage', titre: 'Maquillage', tags: 'maquillage make up', requis: [['makeup', 'make', 'lipstick', 'beauty', 'cosmetic', 'glamour'], ETHNIE] },
  { query: 'black woman beauty portrait', categorie: 'maquillage', titre: 'Maquillage glam', tags: 'maquillage soiree glam', requis: [['makeup', 'lipstick', 'beauty', 'glamour', 'cosmetic'], ETHNIE] },
  { query: 'african bride', categorie: 'maquillage', titre: 'Maquillage mariée', tags: 'mariee mariage ceremonie dot', requis: [['bride', 'wedding', 'bridal'], ETHNIE] },
  { query: 'eyelashes', categorie: 'cils', titre: 'Cils', tags: 'cils extension faux cils', requis: [['eyelash', 'lash', 'mascara']] },
  { query: 'eyebrows makeup', categorie: 'cils', titre: 'Sourcils', tags: 'sourcils restructuration', requis: [['eyebrow', 'brow']] },
  { query: 'black woman skincare', categorie: 'soins', titre: 'Soin du visage', tags: 'soin visage peau', requis: [['skin', 'skincare', 'facial', 'face', 'cream', 'mask', 'spa'], ETHNIE] },
  { query: 'spa massage', categorie: 'soins', titre: 'Spa & massage', tags: 'spa massage detente', requis: [['spa', 'massage', 'wellness']] },
];
