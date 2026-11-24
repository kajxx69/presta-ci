import { Demande } from '../models/index.js';
import { InAppNotificationService } from './in-app-notifications.js';
import { doitRelancer, RELANCE_HEURES } from './negociation.js';
import { logger } from '../logger.js';

/**
 * Relance « Aucun prestataire n'a encore accepté ta demande » : une seule fois,
 * RELANCE_HEURES après l'envoi d'une demande sur un modèle restée sans accord.
 */
export async function runRelanceDemandesSweep(now = new Date()): Promise<number> {
  const candidates: any[] = await Demande.find({
    modele_id: { $ne: null }, statut: 'ouverte', relance_envoyee: { $ne: true }, accord: null,
    expires_at: { $gt: now }, created_at: { $lte: new Date(now.getTime() - RELANCE_HEURES * 3600_000) },
  }).limit(200);
  let envoyees = 0;
  for (const d of candidates) {
    if (!doitRelancer(d, now)) continue;
    // Marquer d'abord : jamais deux relances, même si deux serveurs tournent
    const r = await Demande.updateOne({ _id: d._id, relance_envoyee: { $ne: true } }, { $set: { relance_envoyee: true } });
    if (!r.modifiedCount) continue;
    try {
      await InAppNotificationService.createCustom(d.client_id,
        'Aucun prestataire n\'a encore accepté ta demande',
        `« ${d.titre} » : augmente ton montant pour avoir plus de chances.`,
        'warning', { kind: 'demande_relance', demande_id: d._id });
      envoyees++;
    } catch (e: any) {
      logger.error(`[relance-demandes] ${d._id}: ${e.message}`);
    }
  }
  if (envoyees) logger.info(`[relance-demandes] ${envoyees} relance(s) envoyée(s)`);
  return envoyees;
}
