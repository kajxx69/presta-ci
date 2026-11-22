import { Plan, Configuration } from '../models/index.js';

// Deux plans seulement : Gratuit et Pro.
// - Réservations illimitées pour tout le monde (bloquer des clientes ne sert personne)
// - Le Pro apporte PLUS de clientes : prestations illimitées, en premier dans
//   « Réserver chez… », badge Pro.
// Business et Elite sont désactivés (plus proposés) ; les abonnées en cours gardent
// leur plan jusqu'à expiration, puis retombent sur le Gratuit.

export const PLAN_GRATUIT_ID = 1;
export const PLAN_PRO_ID = 2;

const MARQUEUR = 'migration_plans_gratuit_pro_v1';

const GRATUIT = {
  nom: 'Gratuit',
  prix: 0,
  prix_promo: null,
  devise: 'FCFA',
  max_services: 5,
  max_reservations_mois: -1,
  max_photos_par_service: 5,
  mise_en_avant: false,
  is_popular: false,
  is_active: true,
  description: 'Commence gratuitement et reçois tes premières clientes',
  avantages: [
    '5 modèles proposés (« Je sais le faire »)',
    'Réservations illimitées',
    '5 photos par prestation',
    'Visible dans le fil Découvrir',
  ],
  features: ['map_visibility', 'basic_stats'],
};

const PRO = {
  nom: 'Pro',
  prix: 2500,
  prix_promo: null,
  devise: 'FCFA',
  max_services: -1,
  max_reservations_mois: -1,
  max_photos_par_service: 15,
  mise_en_avant: true,
  is_popular: true,
  is_active: true,
  description: 'Plus de visibilité, plus de clientes',
  avantages: [
    'Modèles proposés illimités',
    'En premier dans « Réserver chez… »',
    'Badge Pro ✨ sur ton profil',
    '15 photos par prestation',
    'Réservations illimitées',
    'Support WhatsApp prioritaire',
  ],
  features: ['map_visibility', 'detailed_stats', 'whatsapp_support', 'client_notifications'],
};

/** Applique UNE fois la nouvelle grille (Gratuit / Pro). Ensuite l'admin peut la modifier librement. */
export async function migrerPlansGratuitPro(): Promise<void> {
  try {
    if (await Configuration.exists({ cle: MARQUEUR })) return;
    const maintenant = new Date();
    await Plan.updateOne({ _id: PLAN_GRATUIT_ID }, { $set: { ...GRATUIT, updated_at: maintenant } }, { upsert: true });
    await Plan.updateOne({ _id: PLAN_PRO_ID }, { $set: { ...PRO, updated_at: maintenant } }, { upsert: true });
    await Plan.updateMany({ _id: { $nin: [PLAN_GRATUIT_ID, PLAN_PRO_ID] } }, { $set: { is_active: false, is_popular: false, updated_at: maintenant } });
    await Configuration.create({ cle: MARQUEUR, valeur: maintenant.toISOString(), description: 'Grille Gratuit / Pro appliquée' });
    console.log('[plans] Grille Gratuit / Pro appliquée');
  } catch (err) {
    console.error('[plans] Échec de la migration Gratuit / Pro :', err);
  }
}

/** Plan réellement applicable : un abonnement payant expiré retombe sur le plan gratuit. */
export async function planEffectif(prestataire: { plan_actuel_id?: number | null; abonnement_expires_at?: Date | string | null }) {
  const expire = prestataire.abonnement_expires_at && new Date(prestataire.abonnement_expires_at).getTime() < Date.now();
  const id = expire ? PLAN_GRATUIT_ID : (prestataire.plan_actuel_id || PLAN_GRATUIT_ID);
  return (await Plan.findById(id)) || (await Plan.findById(PLAN_GRATUIT_ID));
}

/** Abonnement payant en cours (mise en avant, badge Pro). */
export function estPro(p: { plan_actuel_id?: number | null; abonnement_expires_at?: Date | string | null }): boolean {
  return !!p.plan_actuel_id && p.plan_actuel_id !== PLAN_GRATUIT_ID
    && !!p.abonnement_expires_at && new Date(p.abonnement_expires_at).getTime() > Date.now();
}
