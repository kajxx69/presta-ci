import { Modele, OffreModele, Service, Prestataire, SubCategory, Category } from '../models/index.js';
import { categorieModelePour, normaliser } from './modeles-sync.js';
import { planEffectif, estPro } from './plans.js';
import { positionPrestataire, distanceKm, Point } from './communes.js';

// « Je sais le faire » : un prestataire se propose pour un modèle du fil.
// L'offre relie le modèle à un service réservable (prix, durée) du prestataire.

export class ErreurOffre extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Sous-catégorie du modèle (même famille, nom le plus proche des mots du modèle). */
async function sousCategoriePour(modele: any): Promise<number> {
  const [cats, sous] = await Promise.all([Category.find({ is_active: { $ne: false } }).select('nom'), SubCategory.find({ is_active: { $ne: false } }).select('nom categorie_id')]);
  const nomCat = new Map(cats.map(c => [c._id as number, c.nom]));
  const candidates = sous.filter(s => categorieModelePour(nomCat.get(s.categorie_id) || '', s.nom) === modele.categorie);
  if (!candidates.length) throw new ErreurOffre('Aucune catégorie disponible pour ce modèle');
  const mots = new Set([...(modele.tags || []), ...normaliser(modele.titre).split(' ')].filter((w: string) => w.length > 2));
  const score = (nom: string) => normaliser(nom).split(' ').filter(w => [...mots].some(m => m.startsWith(w.slice(0, 5)) || w.startsWith(m.slice(0, 5)))).length;
  return [...candidates].sort((a, b) => score(b.nom) - score(a.nom))[0]._id as number;
}

export async function creerOffre(userId: number, modeleId: number, body: any) {
  const prestataire: any = await Prestataire.findOne({ user_id: userId });
  if (!prestataire) throw new ErreurOffre('Crée ton compte pro pour te proposer sur ce modèle', 403);
  const modele: any = await Modele.findOne({ _id: modeleId, is_active: true });
  if (!modele) throw new ErreurOffre('Modèle introuvable', 404);

  let serviceId: number;
  if (body?.service_id) {
    // Rattacher un service existant du prestataire
    const s = await Service.findOne({ _id: Number(body.service_id), prestataire_id: prestataire._id, deleted_at: null });
    if (!s) throw new ErreurOffre('Service introuvable', 404);
    serviceId = s._id as number;
  } else {
    const prix = Math.round(Number(body?.prix));
    const duree = Math.round(Number(body?.duree_minutes || 120));
    if (!Number.isFinite(prix) || prix < 500 || prix > 2_000_000) throw new ErreurOffre('Indique ton prix (500 FCFA minimum)');
    if (!Number.isFinite(duree) || duree < 15 || duree > 1440) throw new ErreurOffre('Durée invalide (entre 15 min et 24 h)');

    // Déjà proposée sur ce modèle : on met à jour son service (prix, durée) au lieu d'en créer un autre
    const existante = await OffreModele.findOne({ modele_id: modeleId, prestataire_id: prestataire._id });
    const serviceExistant = existante ? await Service.findOne({ _id: existante.service_id, prestataire_id: prestataire._id, deleted_at: null }) : null;
    if (serviceExistant) {
      await Service.updateOne({ _id: serviceExistant._id }, { prix, duree_minutes: duree, is_active: true, updated_at: new Date(), ...(body?.is_domicile !== undefined ? { is_domicile: !!body.is_domicile } : {}) });
      return { service_id: serviceExistant._id as number, mis_a_jour: true };
    }

    const plan: any = await planEffectif(prestataire);
    const nb = await Service.countDocuments({ prestataire_id: prestataire._id, deleted_at: null });
    if (plan && plan.max_services >= 0 && nb >= plan.max_services) {
      throw new ErreurOffre(`Le plan ${plan.nom} permet ${plan.max_services} modèles. Passe Pro pour en proposer autant que tu veux ✨`, 402);
    }
    const nom = String(body?.nom || modele.titre).trim().slice(0, 120) || modele.titre;
    const service = await Service.create({
      prestataire_id: prestataire._id,
      sous_categorie_id: await sousCategoriePour(modele),
      nom, prix, duree_minutes: duree,
      description: String(body?.description || `Je réalise ce modèle : ${modele.titre}.`).slice(0, 1000),
      is_domicile: !!body?.is_domicile,
      is_active: true,
      // Pas de photos : la photo d'inspiration n'est pas le travail du prestataire.
      // Ses propres réalisations ajoutées ensuite deviendront des modèles réservables.
      photos: null,
    });
    serviceId = service._id as number;
  }

  const filtre = { modele_id: modeleId, prestataire_id: prestataire._id as number };
  if (await OffreModele.exists(filtre)) {
    await OffreModele.updateOne(filtre, { service_id: serviceId });
  } else {
    try {
      await OffreModele.create({ ...filtre, service_id: serviceId });
    } catch (e: any) {
      if (e?.code !== 11000) throw e; // double clic : l'offre existe déjà
      await OffreModele.updateOne(filtre, { service_id: serviceId });
    }
  }
  return { service_id: serviceId, mis_a_jour: false };
}

export async function retirerOffre(userId: number, modeleId: number) {
  const prestataire = await Prestataire.findOne({ user_id: userId }).select('_id');
  if (!prestataire) throw new ErreurOffre('Compte pro introuvable', 403);
  await OffreModele.deleteOne({ modele_id: modeleId, prestataire_id: prestataire._id });
}

interface OffreAffichee {
  prestataire: {
    id: number; nom_commercial: string; ville?: string; note_moyenne?: number; nombre_avis?: number; is_verified?: boolean; is_pro?: boolean; photo?: string | null;
    commune?: string | null; distance_km?: number | null; distance_approx?: boolean;
  };
  service: { id: number; nom: string; prix: number; duree_minutes?: number | null; is_domicile?: boolean };
}

/** Offres valides (service actif, prestataire actif) pour une liste de modèles. */
async function offresValides(modeleIds: number[]) {
  const offres = await OffreModele.find({ modele_id: { $in: modeleIds } });
  if (!offres.length) return { offres: [], services: new Map<number, any>(), prestataires: new Map<number, any>() };
  const [services, prestataires] = await Promise.all([
    Service.find({ _id: { $in: offres.map(o => o.service_id) }, is_active: true, deleted_at: null }).select('nom prix duree_minutes is_domicile prestataire_id'),
    Prestataire.find({ _id: { $in: [...new Set(offres.map(o => o.prestataire_id))] }, is_active: { $ne: false } })
      .select('nom_commercial ville commune adresse latitude longitude note_moyenne nombre_avis is_verified photos_etablissement plan_actuel_id abonnement_expires_at'),
  ]);
  const sMap = new Map(services.map(s => [s._id as number, s]));
  const pMap = new Map(prestataires.map(p => [p._id as number, p]));
  return { offres: offres.filter(o => sMap.has(o.service_id) && pMap.has(o.prestataire_id)), services: sMap, prestataires: pMap };
}

/** Ajoute nb_offres et prix_min à chaque modèle (cartes du fil, grilles). */
export async function enrichirOffres(modeles: any[]): Promise<any[]> {
  const ids = modeles.map(m => Number((m as any).id ?? (m as any)._id));
  const { offres, services } = await offresValides(ids);
  const parModele = new Map<number, number[]>();
  for (const o of offres) {
    const prix = services.get(o.service_id)?.prix;
    if (typeof prix === 'number') parModele.set(o.modele_id, [...(parModele.get(o.modele_id) || []), prix]);
  }
  return modeles.map(m => {
    const base = typeof (m as any).toJSON === 'function' ? (m as any).toJSON() : m;
    const prix = parModele.get(Number(base.id ?? base._id)) || [];
    return { ...base, nb_offres: prix.length, prix_min: prix.length ? Math.min(...prix) : null };
  });
}

/** Commune et distance d'une pro par rapport à la cliente (distance null si l'une des deux positions manque). */
export function infoDistance(p: any, pos: Point | null): { commune: string | null; distance_km: number | null; distance_approx: boolean } {
  const pp = positionPrestataire(p);
  const commune = p.commune || null;
  if (!pos || !pp) return { commune, distance_km: null, distance_approx: false };
  const d = distanceKm(pos.lat, pos.lng, pp.lat, pp.lng);
  return { commune, distance_km: Math.round(d * 10) / 10, distance_approx: pos.approx || pp.approx };
}

/** Tri « les plus proches d'abord » : par km entier, puis Pro, puis note. Sans position : Pro puis note. */
export interface CleProximite { pro: boolean; note: number; d: number | null }
export function comparerProximite(a: CleProximite, b: CleProximite): number {
  const da = a.d ?? Infinity, db = b.d ?? Infinity;
  const ka = Number.isFinite(da) ? Math.floor(da) : Infinity, kb = Number.isFinite(db) ? Math.floor(db) : Infinity;
  if (ka !== kb) return ka < kb ? -1 : 1;
  return (Number(b.pro) - Number(a.pro)) || (b.note - a.note) || (Number.isFinite(da) && Number.isFinite(db) ? da - db : 0);
}
/** Clé de tri d'une offre affichée. */
export const cleOffre = (o: { prestataire: { is_pro?: boolean; note_moyenne?: number; distance_km?: number | null } }): CleProximite =>
  ({ pro: !!o.prestataire.is_pro, note: o.prestataire.note_moyenne || 0, d: o.prestataire.distance_km ?? null });

/** Prestataires qui se sont proposés pour ce modèle — les plus proches d'abord si la position de la cliente est connue. */
export async function offresDuModele(modeleId: number, pos: Point | null = null): Promise<OffreAffichee[]> {
  const { offres, services, prestataires } = await offresValides([modeleId]);
  return offres
    .map(o => { const p = prestataires.get(o.prestataire_id); const info = infoDistance(p, pos); return { p, s: services.get(o.service_id), info }; })
    .sort((a, b) => comparerProximite(
      { pro: estPro(a.p), note: a.p.note_moyenne || 0, d: a.info.distance_km },
      { pro: estPro(b.p), note: b.p.note_moyenne || 0, d: b.info.distance_km }))
    .map(({ p, s, info }) => ({
      prestataire: {
        id: p._id, nom_commercial: p.nom_commercial, ville: p.ville, note_moyenne: p.note_moyenne, nombre_avis: p.nombre_avis,
        is_verified: p.is_verified, is_pro: estPro(p), photo: Array.isArray(p.photos_etablissement) ? p.photos_etablissement[0] || null : null,
        ...info,
      },
      service: { id: s._id, nom: s.nom, prix: s.prix, duree_minutes: s.duree_minutes, is_domicile: s.is_domicile },
    }));
}
