import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, UserSession, Role, Prestataire, Configuration } from '../models/index.js';
import { validateRegister, validateLogin } from '../utils/validation.js';
import { generateToken } from '../utils/jwt.js';
import { serverError } from '../utils/http.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { logger } from '../logger.js';

const router = express.Router();

// Cookie sécurisé si le frontend est servi en HTTPS (déploiement), lax/non-secure en dev local
const FRONTEND_IS_HTTPS = (process.env.FRONTEND_ORIGIN || '').startsWith('https://');
export function sessionCookieOptions(hours: number) {
  return {
    httpOnly: true,
    sameSite: (FRONTEND_IS_HTTPS ? 'none' : 'lax') as 'none' | 'lax',
    secure: FRONTEND_IS_HTTPS,
    maxAge: hours * 60 * 60 * 1000,
    path: '/',
  };
}

async function getSessionDurationHours(): Promise<number> {
  try {
    const config = await Configuration.findOne({ cle: 'session_duration_hours' });
    const n = Number(config?.valeur);
    return Number.isFinite(n) && n > 0 ? n : 24;
  } catch {
    return 24;
  }
}

function generateReferralCode(prenom: string): string {
  const base = (prenom || 'USER').normalize('NFD').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'USER';
  return `${base}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

router.post('/register', validateRegister, async (req: Request, res: Response) => {
  try {
    const { email, password, nom, prenom, telephone, role_id = 1, nom_commercial, ville, adresse, latitude, longitude, code_parrain } = req.body || {};
    if (!email || !password || !nom || !prenom) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    if (role_id === 2) {
      if (!nom_commercial || !ville || !adresse) {
        return res.status(400).json({ error: 'Les champs nom_commercial, ville et adresse sont requis pour un compte prestataire' });
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    // Parrainage : retrouver le parrain si un code est fourni (non bloquant si invalide)
    let parrain: any = null;
    if (code_parrain && typeof code_parrain === 'string') {
      parrain = await User.findOne({ code_parrainage: code_parrain.trim().toUpperCase() });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email, password_hash, role_id, nom, prenom, telephone: telephone || undefined,
      code_parrainage: generateReferralCode(prenom),
      parrain_id: parrain ? (parrain._id as number) : null
    });

    // Notifier le parrain (best-effort)
    if (parrain) {
      try {
        const { InAppNotificationService } = await import('../services/in-app-notifications.js');
        await InAppNotificationService.createCustom(
          parrain._id as number,
          '🎉 Nouveau filleul !',
          `${prenom} vient de s'inscrire avec votre code de parrainage.`,
          'success'
        );
      } catch { /* non bloquant */ }
    }

    if (role_id === 2) {
      await Prestataire.create({
        user_id: newUser._id as number,
        nom_commercial, ville, adresse,
        pays: "Côte d'Ivoire",
        latitude: latitude || undefined,
        longitude: longitude || undefined
      });
    }

    const role = await Role.findById(newUser.role_id);
    const user = {
      id: newUser._id,
      email: newUser.email,
      role_id: newUser.role_id,
      nom: newUser.nom,
      prenom: newUser.prenom,
      telephone: newUser.telephone,
      role_nom: role?.nom || null
    };

    const token = crypto.randomBytes(48).toString('hex');
    const hours = await getSessionDurationHours();
    await UserSession.create({
      user_id: newUser._id as number,
      token,
      device_info: req.headers['user-agent'] || '',
      ip_address: req.ip || '',
      expires_at: new Date(Date.now() + hours * 3600000)
    });

    res.cookie('session_token', token, sessionCookieOptions(hours));

    const jwtToken = generateToken({
      userId: newUser._id as number,
      email: newUser.email,
      role_id: newUser.role_id
    });

    res.json({ user, token: jwtToken });
  } catch (e: any) {
    serverError(res, e);
  }
});

router.post('/login', validateLogin, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Ce compte a été suspendu. Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.' });
    }

    const role = await Role.findById(user.role_id);

    const token = crypto.randomBytes(48).toString('hex');
    const hours = await getSessionDurationHours();
    await UserSession.create({
      user_id: user._id as number,
      token,
      device_info: req.headers['user-agent'] || '',
      ip_address: req.ip || '',
      expires_at: new Date(Date.now() + hours * 3600000)
    });

    await User.updateOne({ _id: user._id }, { last_login: new Date() });

    res.cookie('session_token', token, sessionCookieOptions(hours));

    const safeUser = {
      id: user._id,
      email: user.email,
      role_id: user.role_id,
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
      role_nom: role?.nom || null,
    };

    const jwtToken = generateToken({
      userId: user._id as number,
      email: user.email,
      role_id: user.role_id
    });

    res.json({ user: safeUser, token: jwtToken });
  } catch (e: any) {
    serverError(res, e);
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    // Try JWT first, then fall back to session cookie
    const { getUserIdFromSession } = await import('../middleware/auth.js');
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const user = await User.findById(userId).select('email role_id nom prenom telephone');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const role = await Role.findById(user.role_id);
    const result = {
      id: user._id,
      email: user.email,
      role_id: user.role_id,
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
      role_nom: role?.nom || null
    };

    res.json({ user: result });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/auth/forgot-password — génère un token de réinitialisation
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const genericResponse = { ok: true, message: 'Si cet email existe, vous recevrez un lien de réinitialisation.' };

    const user = await User.findOne({ email });
    // Ne pas révéler si l'email existe ou non (sécurité)
    if (!user) {
      return res.json(genericResponse);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await User.updateOne({ _id: user._id }, {
      reset_password_token: token,
      reset_password_expires: expires
    });

    const frontendOrigin = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
    const resetUrl = `${frontendOrigin}/reset-password?token=${token}`;
    const sent = await sendPasswordResetEmail(user.email, resetUrl);
    if (!sent) {
      // SMTP non configuré : le lien n'est visible que dans les logs serveur, jamais dans la réponse
      logger.warn(`[auth] Lien de réinitialisation pour ${user.email}: ${resetUrl}`);
    }

    res.json(genericResponse);
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/auth/reset-password — réinitialise le mot de passe avec le token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await User.findOne({
      reset_password_token: token,
      reset_password_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Lien invalide ou expiré. Veuillez refaire une demande.' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await User.updateOne({ _id: user._id }, {
      password_hash,
      reset_password_token: null,
      reset_password_expires: null
    });

    // Invalider toutes les sessions existantes
    await UserSession.deleteMany({ user_id: user._id });

    res.json({ ok: true, message: 'Mot de passe réinitialisé avec succès.' });
  } catch (e: any) {
    serverError(res, e);
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = (req as any).cookies?.session_token;
    if (token) {
      await UserSession.deleteOne({ token });
    }
    res.clearCookie('session_token', { path: '/' });
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
