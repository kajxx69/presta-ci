import { Prestataire, Plan, User, NotificationPreference } from '../models/index.js';
import { InAppNotificationService } from './in-app-notifications.js';
import { sendMail } from '../utils/mailer.js';
import { logger } from '../logger.js';

const DAY_MS = 86400000;
const PLAN_GRATUIT_ID = 1;

export type TypeRelance = 'j3' | 'expire';

/**
 * Quelle relance envoyer pour cet abonnement maintenant ? (fonction pure, testée)
 * - 'j3'     : expire dans les 3 prochains jours, relance J-3 pas encore faite
 * - 'expire' : expiré depuis moins de 3 jours, relance d'expiration pas encore faite
 * Au-delà de 3 jours après l'expiration on n'insiste plus.
 */
export function relanceAEnvoyer(
  p: { plan_actuel_id?: number | null; abonnement_expires_at?: Date | null; relance_j3_pour?: Date | null; relance_expire_pour?: Date | null },
  now: number = Date.now()
): TypeRelance | null {
  if (!p.abonnement_expires_at || !p.plan_actuel_id || p.plan_actuel_id === PLAN_GRATUIT_ID) return null;
  const fin = new Date(p.abonnement_expires_at).getTime();
  const deja = (d?: Date | null) => !!d && new Date(d).getTime() === fin;

  if (fin > now && fin - now <= 3 * DAY_MS) return deja(p.relance_j3_pour) ? null : 'j3';
  if (fin <= now && now - fin <= 3 * DAY_MS) return deja(p.relance_expire_pour) ? null : 'expire';
  return null;
}

function urlPlans(): string {
  const base = (process.env.FRONTEND_URL || (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0]).trim().replace(/\/+$/, '');
  return `${base}/app/plans`;
}

function emailHtml(prenom: string, titre: string, corps: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="color:#7A1638;">Chicly</h2>
      <p>Bonjour ${prenom},</p>
      <h3 style="color:#111827;">${titre}</h3>
      <div style="color:#374151;font-size:14px;line-height:1.6;">${corps}</div>
      <p style="margin:24px 0;">
        <a href="${urlPlans()}" style="background:#7A1638;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          Renouveler maintenant
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Paiement en quelques secondes par Wave, Orange Money, MTN, Moov ou carte.</p>
    </div>`;
}

/** Envoie les relances d'abonnement dues. Idempotent. */
export async function runSubscriptionReminderSweep(): Promise<number> {
  const now = Date.now();
  const candidats = await Prestataire.find({
    is_active: { $ne: false },
    plan_actuel_id: { $ne: PLAN_GRATUIT_ID },
    abonnement_expires_at: { $gte: new Date(now - 3 * DAY_MS), $lte: new Date(now + 3 * DAY_MS) },
  }).select('user_id plan_actuel_id abonnement_expires_at relance_j3_pour relance_expire_pour');

  let envoyes = 0;
  for (const p of candidats) {
    const type = relanceAEnvoyer(p as any, now);
    if (!type) continue;
    const fin = new Date(p.abonnement_expires_at as Date);

    // Réserve la relance AVANT d'envoyer : si deux instances tournent, une seule envoie
    const champ = type === 'j3' ? 'relance_j3_pour' : 'relance_expire_pour';
    const claim = await Prestataire.updateOne(
      { _id: p._id, [champ]: { $ne: fin } },
      { [champ]: fin }
    );
    if (claim.modifiedCount === 0) continue;

    try {
      const [plan, user, prefs] = await Promise.all([
        Plan.findById(p.plan_actuel_id).select('nom'),
        User.findById(p.user_id).select('email prenom'),
        NotificationPreference.findOne({ user_id: p.user_id }).select('email_notifications'),
      ]);
      const nomPlan = plan?.nom || 'premium';
      const jours = Math.max(1, Math.ceil((fin.getTime() - now) / DAY_MS));
      const dateFin = fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

      const titre = type === 'j3'
        ? `⏳ Votre plan ${nomPlan} expire dans ${jours} jour${jours > 1 ? 's' : ''}`
        : `⚠️ Votre plan ${nomPlan} a expiré`;
      const message = type === 'j3'
        ? `Il se termine le ${dateFin}. Renouvelez maintenant pour garder votre visibilité et vos avantages — les jours restants sont conservés.`
        : `Vos avantages (visibilité, accès anticipé aux demandes, services supplémentaires) sont suspendus. Renouvelez en 1 minute pour les retrouver.`;

      await InAppNotificationService.createCustom(p.user_id, titre, message, type === 'j3' ? 'warning' : 'error', { action: 'renouveler_abonnement', plan_id: p.plan_actuel_id });

      if (user?.email && prefs?.email_notifications !== false) {
        await sendMail(user.email, titre.replace(/^\S+\s/, ''), emailHtml(user.prenom || '', titre, `<p>${message}</p>`));
      }
      envoyes++;
    } catch (e: any) {
      logger.error(`[relances-abonnement] prestataire ${p._id}: ${e.message}`);
    }
  }
  if (envoyes > 0) logger.info(`[relances-abonnement] ${envoyes} relance(s) envoyée(s)`);
  return envoyes;
}
