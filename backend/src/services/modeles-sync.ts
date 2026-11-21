import { Modele, Service, Prestataire, Category, SubCategory } from '../models/index.js';
import { logger } from '../logger.js';

// Transforme les photos des services beauté publiés par les prestataires en
// modèles d'inspiration (source = 'prestataire'). Appelé après chaque
// création / modification / suppression de service, et en tâche de fond
// (rattrape les suspensions admin, comptes désactivés, etc.).

type CategorieModele = 'coiffure' | 'ongles' | 'maquillage' | 'cils' | 'soins';
const MAX_PHOTOS_PAR_SERVICE = 5;

/** Normalise pour la recherche : minuscules, sans accents, espaces simples. */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Catégorie d'inspiration d'une sous-catégorie, ou null si hors beauté femme. */
export function categorieModelePour(categorieNom: string, sousCategorieNom: string): CategorieModele | null {
  const cat = normaliser(categorieNom);
  const sous = normaliser(sousCategorieNom);
  if (cat.includes('homme') || cat.includes('masculin')) return null;
  if (cat.includes('coiffure')) return 'coiffure';
  if (cat.includes('ongle')) return 'ongles';
  if (cat.includes('beaute') || cat.includes('esthetique') || cat.includes('bien etre')) {
    if (sous.includes('maquillage')) return 'maquillage';
    if (sous.includes('cil') || sous.includes('sourcil')) return 'cils';
    if (sous.includes('ongle') || sous.includes('manucure') || sous.includes('pedicure')) return 'ongles';
    return 'soins';
  }
  return null;
}

export function texteRecherche(parts: (string | null | undefined)[]): string {
  return normaliser(parts.filter(Boolean).join(' '));
}

function photosDe(service: any): string[] {
  let photos = service.photos;
  if (typeof photos === 'string') {
    try { photos = JSON.parse(photos); } catch { photos = [photos]; }
  }
  if (!Array.isArray(photos)) return [];
  return photos.filter((p: any) => typeof p === 'string' && p.trim() && !p.startsWith('data:')).slice(0, MAX_PHOTOS_PAR_SERVICE);
}

export async function syncModelesService(serviceId: number): Promise<void> {
  const service: any = await Service.findById(serviceId);
  const desactiver = () => Modele.updateMany({ service_id: serviceId, source: 'prestataire' }, { is_active: false, updated_at: new Date() });
  if (!service || service.deleted_at || service.is_active === false) { await desactiver(); return; }

  const [prestataire, sous] = await Promise.all([
    Prestataire.findById(service.prestataire_id).select('is_active ville nom_commercial'),
    SubCategory.findById(service.sous_categorie_id).select('nom categorie_id'),
  ]);
  if (!prestataire || prestataire.is_active === false || !sous) { await desactiver(); return; }
  const cat = await Category.findById(sous.categorie_id).select('nom');
  const categorie = categorieModelePour(cat?.nom || '', sous.nom || '');
  const photos = photosDe(service);
  if (!categorie || photos.length === 0) { await desactiver(); return; }

  const tags = [...new Set(normaliser(`${sous.nom} ${service.nom}`).split(' ').filter(w => w.length > 2))];
  const recherche = texteRecherche([service.nom, service.description, sous.nom, cat?.nom, prestataire.ville, prestataire.nom_commercial]);

  const existants = await Modele.find({ service_id: serviceId, source: 'prestataire' });
  const parPhoto = new Map(existants.map(m => [m.photo_url, m]));

  for (const photo of photos) {
    const champs = {
      titre: service.nom,
      categorie,
      tags,
      prestataire_id: service.prestataire_id,
      prix: service.prix ?? null,
      ville: prestataire.ville || null,
      recherche,
      is_active: true,
      updated_at: new Date(),
    };
    const m = parPhoto.get(photo);
    if (m) await Modele.updateOne({ _id: m._id }, champs);
    else await Modele.create({ ...champs, photo_url: photo, source: 'prestataire', service_id: serviceId });
  }
  // Photos retirées du service → modèles désactivés (on garde les likes historiques)
  const retirees = existants.filter(m => !photos.includes(m.photo_url)).map(m => m._id);
  if (retirees.length) await Modele.updateMany({ _id: { $in: retirees } }, { is_active: false, updated_at: new Date() });
}

/** Appel non bloquant depuis les routes (n'échoue jamais la requête). */
export function syncModelesServiceEnFond(serviceId: number): void {
  syncModelesService(serviceId).catch(e => logger.error(`[modeles] sync service ${serviceId}: ${e.message}`));
}

/** Resynchronise tous les services (démarrage + toutes les 30 min). */
export async function syncTousLesModeles(): Promise<void> {
  const ids = new Set<number>([
    ...(await Service.find({ photos: { $ne: null } }).distinct('_id')) as number[],
    ...(await Modele.find({ source: 'prestataire', is_active: true }).distinct('service_id')) as number[],
  ]);
  for (const id of ids) {
    if (typeof id !== 'number') continue;
    try { await syncModelesService(id); } catch (e: any) { logger.error(`[modeles] sync ${id}: ${e.message}`); }
  }
}

export function startModelesSyncLoop(): void {
  const run = () => syncTousLesModeles().catch(e => logger.error(`[modeles] sync globale: ${e.message}`));
  setTimeout(run, 10_000);
  setInterval(run, 30 * 60 * 1000);
}
