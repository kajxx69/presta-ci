import { Plan, Configuration, Prestataire, Counter } from '../models/index.js';
import { getNextId } from '../models/Counter.js';
import { InAppNotificationService } from './in-app-notifications.js';

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

// ─── Offre de lancement : 1 mois Pro offert aux 50 premières pros ───────────
export const PLACES_OFFRE_LANCEMENT = 50;
const COMPTEUR_OFFRE = 'offre_lancement_pro';
const JOURS_OFFERTS = 30;

/** Places encore disponibles (affichées à l'inscription et dans l'admin). */
export async function placesOffreRestantes(): Promise<number> {
  const c: any = await Counter.findById(COMPTEUR_OFFRE).lean();
  return Math.max(0, PLACES_OFFRE_LANCEMENT - (c?.seq || 0));
}

/**
 * Active le mois Pro offert pour une nouvelle pro, tant qu'il reste des places.
 * Ne bloque jamais l'inscription : renvoie false en cas d'échec.
 */
export async function offrirMoisProLancement(prestataireId: number, userId: number): Promise<boolean> {
  try {
    const p: any = await Prestataire.findById(prestataireId).select('offre_lancement plan_actuel_id abonnement_expires_at');
    if (!p || p.offre_lancement || estPro(p)) return false;
    // Compteur atomique : deux inscriptions simultanées ne peuvent pas prendre la même place
    const rang = await getNextId(COMPTEUR_OFFRE);
    if (rang > PLACES_OFFRE_LANCEMENT) return false;
    const fin = new Date(Date.now() + JOURS_OFFERTS * 86400000);
    const r = await Prestataire.updateOne(
      { _id: prestataireId, offre_lancement: { $ne: true } },
      { $set: { plan_actuel_id: PLAN_PRO_ID, abonnement_expires_at: fin, offre_lancement: true, updated_at: new Date() } },
    );
    if (!r.modifiedCount) return false;
    await InAppNotificationService.createCustom(
      userId,
      '🎁 Ton premier mois Pro est offert !',
      `Tu fais partie des ${PLACES_OFFRE_LANCEMENT} premières pros de PrestaCI : profite du plan Pro gratuitement jusqu'au ${fin.toLocaleDateString('fr-FR')} (modèles illimités, en premier dans « Réserver chez… », badge Pro ✨).`,
      'success',
      { offre_lancement: true, rang },
    );
    console.log(`[offre-lancement] Mois Pro offert (place ${rang}/${PLACES_OFFRE_LANCEMENT}) au prestataire ${prestataireId}`);
    return true;
  } catch (err) {
    console.error('[offre-lancement] Échec :', err);
    return false;
  }
}
