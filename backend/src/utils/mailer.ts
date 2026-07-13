import { Resend } from 'resend';
import { logger } from '../logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || 'PrestaCI <no-reply@prestaci.com>';

export const isMailerConfigured = Boolean(RESEND_API_KEY);

const resend = isMailerConfigured ? new Resend(RESEND_API_KEY) : null;

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    // Pas de clé Resend configurée : on trace côté serveur uniquement (jamais renvoyé au client)
    logger.warn(`[mailer] Resend non configuré — email non envoyé à ${to} (sujet: ${subject})`);
    return false;
  }
  const { error } = await resend.emails.send({ from: MAIL_FROM, to, subject, html });
  if (error) {
    logger.error(`[mailer] Échec d'envoi à ${to}: ${error.message}`);
    return false;
  }
  return true;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="color:#2563eb;">PrestaCI — Réinitialisation du mot de passe</h2>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p style="margin:24px 0;">
        <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          Réinitialiser mon mot de passe
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>`;
  return sendMail(to, 'Réinitialisation de votre mot de passe PrestaCI', html);
}
