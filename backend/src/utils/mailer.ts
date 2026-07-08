import nodemailer from 'nodemailer';
import { logger } from '../logger.js';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || 'PrestaCI <no-reply@prestaci.com>';

export const isMailerConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isMailerConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    // Pas de SMTP configuré : on trace côté serveur uniquement (jamais renvoyé au client)
    logger.warn(`[mailer] SMTP non configuré — email non envoyé à ${to} (sujet: ${subject})`);
    return false;
  }
  try {
    await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
    return true;
  } catch (e: any) {
    logger.error(`[mailer] Échec d'envoi à ${to}: ${e.message}`);
    return false;
  }
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
