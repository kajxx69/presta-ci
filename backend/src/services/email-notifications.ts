import { User, NotificationPreference } from '../models/index.js';
import { sendMail } from '../utils/mailer.js';

/**
 * Emails transactionnels de réservation.
 * Best-effort : ne lève jamais (à appeler sans bloquer la requête),
 * et respecte les préférences de notification de l'utilisateur.
 */

type EventKey = 'new_reservation' | 'reservation_confirmed' | 'reservation_cancelled' | 'reservation_updates';

async function canEmail(userId: number, eventKey: EventKey): Promise<string | null> {
  try {
    const user = await User.findById(userId).select('email');
    if (!user?.email) return null;
    const prefs = await NotificationPreference.findOne({ user_id: userId });
    // Pas de document de préférences = valeurs par défaut (email activé)
    if (prefs && (!prefs.email_notifications || prefs[eventKey] === false)) return null;
    return user.email;
  } catch {
    return null;
  }
}

function layout(titre: string, corps: string, ctaLabel?: string, ctaUrl?: string): string {
  const frontendOrigin = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  const url = ctaUrl || `${frontendOrigin}/app`;
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="color:#2563eb;">PrestaCI</h2>
      <h3 style="color:#111827;">${titre}</h3>
      <div style="color:#374151;font-size:14px;line-height:1.6;">${corps}</div>
      <p style="margin:24px 0;">
        <a href="${url}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          ${ctaLabel || 'Ouvrir PrestaCI'}
        </a>
      </p>
      <p style="color:#9ca3af;font-size:12px;">Vous recevez cet email car les notifications sont activées sur votre compte PrestaCI.</p>
    </div>`;
}

export const EmailNotifications = {
  /** Au prestataire : nouvelle réservation reçue */
  async nouvelleReservation(prestataireUserId: number, clientNom: string, serviceNom: string, date: string, heure?: string | null) {
    const email = await canEmail(prestataireUserId, 'new_reservation');
    if (!email) return;
    await sendMail(
      email,
      `Nouvelle réservation — ${serviceNom}`,
      layout(
        'Vous avez reçu une nouvelle réservation 🎉',
        `<p><strong>${clientNom}</strong> a réservé <strong>${serviceNom}</strong> pour le <strong>${date}</strong>${heure ? ` à <strong>${heure}</strong>` : ''}.</p>
         <p>Connectez-vous pour l'accepter ou la refuser.</p>`,
        'Voir la réservation'
      )
    );
  },

  /** Au client : réservation acceptée */
  async reservationConfirmee(clientUserId: number, prestataireNom: string, serviceNom: string, date: string, heure?: string | null) {
    const email = await canEmail(clientUserId, 'reservation_confirmed');
    if (!email) return;
    await sendMail(
      email,
      `Réservation confirmée — ${serviceNom}`,
      layout(
        'Votre réservation est confirmée ✅',
        `<p><strong>${prestataireNom}</strong> a accepté votre réservation pour <strong>${serviceNom}</strong> le <strong>${date}</strong>${heure ? ` à <strong>${heure}</strong>` : ''}.</p>`,
        'Voir mes réservations'
      )
    );
  },

  /** Au client : réservation refusée */
  async reservationRefusee(clientUserId: number, prestataireNom: string, serviceNom: string, motif?: string) {
    const email = await canEmail(clientUserId, 'reservation_cancelled');
    if (!email) return;
    await sendMail(
      email,
      `Réservation refusée — ${serviceNom}`,
      layout(
        'Votre réservation a été refusée',
        `<p><strong>${prestataireNom}</strong> n'a pas pu accepter votre réservation pour <strong>${serviceNom}</strong>.</p>
         ${motif ? `<p>Motif : ${motif}</p>` : ''}
         <p>Vous pouvez réserver un autre créneau ou choisir un autre prestataire.</p>`,
        'Trouver un autre créneau'
      )
    );
  },

  /** Au client : prestation terminée, confirmation attendue */
  async serviceTermine(clientUserId: number, prestataireNom: string, serviceNom: string) {
    const email = await canEmail(clientUserId, 'reservation_updates');
    if (!email) return;
    await sendMail(
      email,
      `Prestation terminée — ${serviceNom}`,
      layout(
        'Votre prestation est terminée',
        `<p><strong>${prestataireNom}</strong> a marqué la prestation <strong>${serviceNom}</strong> comme terminée.</p>
         <p>Confirmez la fin de la prestation puis laissez un avis pour aider la communauté.</p>`,
        'Confirmer et noter'
      )
    );
  },
};
