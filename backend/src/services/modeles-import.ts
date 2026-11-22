import { Modele } from '../models/index.js';
import { normaliser, texteRecherche } from './modeles-sync.js';
import { rechercherPexels } from '../utils/pexels.js';

type Categorie = 'coiffure' | 'ongles' | 'maquillage' | 'cils' | 'soins';

export interface DemandeImport {
  query: string;      // recherche Pexels (anglais conseillé)
  categorie: Categorie;
  nombre: number;     // 1..80
  titre?: string;     // titre affiché sur les cartes (français). Défaut : description Pexels
  tags?: string;      // mots-clés français pour la recherche dans l'app
  page?: number;
}

/** Importe des photos Pexels comme modèles d'inspiration (sans doublon). */
export async function importerPexels(d: DemandeImport): Promise<{ trouves: number; importes: number; doublons: number }> {
  const tags = [...new Set(normaliser(`${d.titre || ''} ${d.tags || ''} ${d.query}`).split(' ').filter(w => w.length > 2))];
  const photos = await rechercherPexels(d.query.trim(), Math.min(80, Math.max(1, d.nombre)), Math.max(1, d.page || 1));
  const deja = new Set((await Modele.find({ source_externe_id: { $in: photos.map(p => p.id_externe) } }).distinct('source_externe_id')) as string[]);
  let importes = 0;
  for (const p of photos) {
    if (deja.has(p.id_externe)) continue;
    try {
      await Modele.create({
        titre: d.titre?.trim() || p.titre, categorie: d.categorie, tags, photo_url: p.photo_url, source: 'curation',
        credit_nom: p.credit_nom, credit_url: p.credit_url, source_externe_id: p.id_externe,
        recherche: texteRecherche([d.titre, d.tags, p.titre, d.query, d.categorie]),
      });
      importes++;
    } catch (e: any) {
      if (e?.code !== 11000) throw e; // doublon importé en parallèle : ignoré
    }
  }
  return { trouves: photos.length, importes, doublons: photos.length - importes };
}

/**
 * Pack de lancement : ~300 photos couvrant les styles les plus demandés à Abidjan.
 * Titres et mots-clés en français pour la recherche dans l'app.
 */
export const PACK_LANCEMENT: Omit<DemandeImport, 'nombre'>[] = [
  { query: 'knotless braids', categorie: 'coiffure', titre: 'Knotless braids', tags: 'knotless tresses sans noeuds' },
  { query: 'box braids black woman', categorie: 'coiffure', titre: 'Box braids', tags: 'box braids tresses' },
  { query: 'cornrows hairstyle woman', categorie: 'coiffure', titre: 'Nattes collées', tags: 'nattes collees cornrows' },
  { query: 'braids with beads', categorie: 'coiffure', titre: 'Tresses avec perles', tags: 'tresses perles enfant' },
  { query: 'locs hairstyle woman', categorie: 'coiffure', titre: 'Locks', tags: 'locks dreadlocks locs' },
  { query: 'twists natural hair', categorie: 'coiffure', titre: 'Twists', tags: 'twists vanilles naturel' },
  { query: 'afro natural hair woman', categorie: 'coiffure', titre: 'Afro naturel', tags: 'afro naturel cheveux crepus' },
  { query: 'braided bun black woman', categorie: 'coiffure', titre: 'Chignon tressé', tags: 'chignon tresse mariage ceremonie' },
  { query: 'wig black woman', categorie: 'coiffure', titre: 'Perruque', tags: 'perruque wig lace' },
  { query: 'silk press straight hair black woman', categorie: 'coiffure', titre: 'Brushing lisse', tags: 'brushing lisse defrisage tissage' },
  { query: 'nail art', categorie: 'ongles', titre: 'Nail art', tags: 'nail art deco ongles' },
  { query: 'french manicure', categorie: 'ongles', titre: 'French manucure', tags: 'french manucure' },
  { query: 'acrylic nails long', categorie: 'ongles', titre: 'Ongles longs résine', tags: 'resine capsules longs' },
  { query: 'gel nails colorful', categorie: 'ongles', titre: 'Pose gel couleur', tags: 'gel vernis semi permanent' },
  { query: 'makeup black woman', categorie: 'maquillage', titre: 'Maquillage', tags: 'maquillage make up' },
  { query: 'bridal makeup african woman', categorie: 'maquillage', titre: 'Maquillage mariée', tags: 'mariee mariage ceremonie' },
  { query: 'glam makeup evening', categorie: 'maquillage', titre: 'Maquillage soirée', tags: 'soiree glam' },
  { query: 'eyelash extensions', categorie: 'cils', titre: 'Extension de cils', tags: 'cils extension faux cils' },
  { query: 'eyebrows shaping', categorie: 'cils', titre: 'Sourcils', tags: 'sourcils restructuration' },
  { query: 'skincare black woman', categorie: 'soins', titre: 'Soin du visage', tags: 'soin visage peau' },
  { query: 'spa massage woman', categorie: 'soins', titre: 'Spa & massage', tags: 'spa massage detente' },
];
