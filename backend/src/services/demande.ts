import { User, Modele, ModeleSwipe, OffreModele, Prestataire } from '../models/index.js';
import { zonesEffectives } from './communes.js';
import { estPro } from './plans.js';

// « La demande dans ta zone » : ce que les clientes des communes d'une pro ont aimé
// récemment. Uniquement des chiffres agrégés, jamais qui a aimé quoi.

const JOUR = 24 * 3600 * 1000;
export const PERIODE_JOURS = 7;
/** Version gratuite : un aperçu ; Pro : le classement complet */
export const TOP_GRATUIT = 1;
export const TOP_PRO = 10;

async function likesParModele(userIds: number[], depuis: Date, jusqua?: Date) {
  if (!userIds.length) return [] as { _id: number; clientes: number }[];
  const created_at: Record<string, Date> = { $gte: depuis };
  if (jusqua) created_at.$lt = jusqua;
  return ModeleSwipe.aggregate<{ _id: number; clientes: number }>([
    { $match: { action: 'like', user_id: { $in: userIds }, created_at } },
    { $group: { _id: '$modele_id', clientes: { $addToSet: '$user_id' } } },
    { $project: { clientes: { $size: '$clientes' } } },
    { $sort: { clientes: -1 } },
  ]);
}

export async function demandeDansMaZone(userId: number) {
  const pro: any = await Prestataire.findOne({ user_id: userId });
  if (!pro) return null;
  const zones = zonesEffectives(pro);
  const pro_actif = estPro(pro);
  const vide = { zones, commune: pro.commune || null, periode_jours: PERIODE_JOURS, est_pro: pro_actif, clientes: 0, clientes_semaine_precedente: 0, likes: 0, par_categorie: [], top_modeles: [], top_masques: 0 };
  if (!zones.length) return vide;

  const maintenant = Date.now();
  const depuis = new Date(maintenant - PERIODE_JOURS * JOUR);
  const avant = new Date(maintenant - 2 * PERIODE_JOURS * JOUR);
  const userIds = (await User.find({ commune: { $in: zones }, _id: { $ne: userId } }).select('_id').limit(50000)).map(u => u._id as number);
  if (!userIds.length) return vide;

  const [parModele, clientesSemaine, clientesAvant] = await Promise.all([
    likesParModele(userIds, depuis),
    ModeleSwipe.distinct('user_id', { action: 'like', user_id: { $in: userIds }, created_at: { $gte: depuis } }),
    ModeleSwipe.distinct('user_id', { action: 'like', user_id: { $in: userIds }, created_at: { $gte: avant, $lt: depuis } }),
  ]);
  if (!parModele.length) return { ...vide, clientes_semaine_precedente: clientesAvant.length };

  const modeles = await Modele.find({ _id: { $in: parModele.slice(0, 300).map(m => m._id) }, is_active: true })
    .select('titre categorie tags photo_url pin_url source credit_nom credit_url prestataire_id service_id prix ville nombre_likes');
  const parId = new Map(modeles.map(m => [m._id as number, m]));

  // Par catégorie : clientes distinctes ≈ somme bornée ; on garde la somme des clientes par modèle (indicatif)
  const cat = new Map<string, number>();
  for (const m of parModele) {
    const mod = parId.get(m._id);
    if (mod) cat.set(mod.categorie, (cat.get(mod.categorie) || 0) + m.clientes);
  }
  const mesOffres = new Set((await OffreModele.find({ prestataire_id: pro._id }).select('modele_id')).map(o => o.modele_id));
  const classes = parModele.filter(m => parId.has(m._id));
  const limite = pro_actif ? TOP_PRO : TOP_GRATUIT;
  const top = classes.slice(0, limite).map(m => {
    const mod: any = parId.get(m._id)!.toJSON();
    const { _id, ...reste } = mod;
    return {
      modele: { ...reste, id: m._id },
      clientes: m.clientes,
      je_le_propose: mesOffres.has(m._id) || (mod.source === 'prestataire' && mod.prestataire_id === pro._id),
    };
  });

  return {
    ...vide,
    clientes: clientesSemaine.length,
    clientes_semaine_precedente: clientesAvant.length,
    likes: parModele.reduce((s, m) => s + m.clientes, 0),
    par_categorie: [...cat.entries()].map(([categorie, n]) => ({ categorie, likes: n })).sort((a, b) => b.likes - a.likes),
    top_modeles: top,
    top_masques: Math.max(0, Math.min(classes.length, TOP_PRO) - top.length),
  };
}
