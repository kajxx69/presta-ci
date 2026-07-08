import { Reservation, StatutReservation, Service, Prestataire, User } from '../models/index.js';
import { InAppNotificationService } from './in-app-notifications.js';
import { sendMail } from '../utils/mailer.js';
import { logger } from '../logger.js';

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; // rappel quand le RDV est à moins de 24h

function appointmentDateTime(dateReservation: Date, heureDebut?: string | null): Date {
  const d = new Date(dateReservation);
  if (heureDebut && /^\d{2}:\d{2}/.test(heureDebut)) {
    const [h, m] = heureDebut.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

/**
 * Envoie les rappels pour les rendez-vous confirmés qui ont lieu dans les prochaines 24h.
 * Idempotent : chaque réservation n'est rappelée qu'une fois (rappel_envoye).
 */
export async function runReminderSweep(): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const statuts = await StatutReservation.find({ nom: { $in: ['confirmee', 'acceptee'] } });
  if (statuts.length === 0) return 0;

  // Pré-filtre large sur la date (jour courant et lendemain), affiné ensuite avec l'heure
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const candidates = await Reservation.find({
    booking_type: 'appointment',
    statut_id: { $in: statuts.map(s => s._id) },
    rappel_envoye: { $ne: true },
    date_reservation: { $gte: dayStart, $lte: horizon },
  });

  let sent = 0;
  for (const r of candidates) {
    const appt = appointmentDateTime(r.date_reservation, r.heure_debut);
    if (appt <= now || appt > horizon) continue;

    try {
      const [service, prestataire, client] = await Promise.all([
        Service.findById(r.service_id).select('nom'),
        Prestataire.findById(r.prestataire_id).select('nom_commercial adresse user_id'),
        User.findById(r.client_id).select('email prenom nom'),
      ]);

      const quand = `${appt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}${r.heure_debut ? ` à ${r.heure_debut}` : ''}`;
      const serviceNom = service?.nom || 'votre prestation';
      const prestataireNom = prestataire?.nom_commercial || 'votre prestataire';

      // Rappel au client
      await InAppNotificationService.createCustom(
        r.client_id,
        '⏰ Rappel de rendez-vous',
        `${serviceNom} chez ${prestataireNom} — ${quand}${r.a_domicile ? ' (à domicile)' : prestataire?.adresse ? ` — ${prestataire.adresse}` : ''}`,
        'info'
      );
      if (client?.email) {
        await sendMail(
          client.email,
          `Rappel : ${serviceNom} ${r.heure_debut ? `demain à ${r.heure_debut}` : 'demain'}`,
          `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="color:#4f46e5;">PrestaCI — Rappel de rendez-vous ⏰</h2>
            <p>Bonjour ${client.prenom || ''},</p>
            <p>Petit rappel : <strong>${serviceNom}</strong> chez <strong>${prestataireNom}</strong>, ${quand}.</p>
            ${r.a_domicile ? '<p>La prestation aura lieu à votre domicile.</p>' : prestataire?.adresse ? `<p>Adresse : ${prestataire.adresse}</p>` : ''}
            <p style="color:#6b7280;font-size:13px;">Un empêchement ? Annulez depuis l'application pour libérer le créneau.</p>
          </div>`
        );
      }

      // Rappel au prestataire
      if (prestataire?.user_id) {
        const clientNom = client ? `${client.prenom} ${client.nom}` : 'un client';
        await InAppNotificationService.createCustom(
          prestataire.user_id,
          '⏰ Rendez-vous à venir',
          `${serviceNom} avec ${clientNom} — ${quand}`,
          'info'
        );
      }

      await Reservation.updateOne({ _id: r._id }, { rappel_envoye: true });
      sent++;
    } catch (e: any) {
      logger.error(`[reminders] Échec rappel réservation ${r._id}: ${e.message}`);
    }
  }

  if (sent > 0) logger.info(`[reminders] ${sent} rappel(s) de rendez-vous envoyé(s)`);
  return sent;
}

/** Démarre la boucle de rappels (appelée au boot du serveur) */
export function startReminderLoop() {
  runReminderSweep().catch(e => logger.error(`[reminders] sweep initial: ${e.message}`));
  setInterval(() => {
    runReminderSweep().catch(e => logger.error(`[reminders] sweep: ${e.message}`));
  }, SWEEP_INTERVAL_MS);
  logger.info('[reminders] Boucle de rappels de rendez-vous démarrée (toutes les 15 min)');
}
