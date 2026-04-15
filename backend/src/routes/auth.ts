import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, UserSession, Role, Prestataire, Configuration } from '../models/index.js';
import { validateRegister, validateLogin } from '../utils/validation.js';
import { generateToken } from '../utils/jwt.js';

const router = express.Router();

async function getSessionDurationHours(): Promise<number> {
  try {
    const config = await Configuration.findOne({ cle: 'session_duration_hours' });
    const n = Number(config?.valeur);
    return Number.isFinite(n) && n > 0 ? n : 24;
  } catch {
    return 24;
  }
}

router.post('/register', validateRegister, async (req: Request, res: Response) => {
  try {
    const { email, password, nom, prenom, telephone, role_id = 1, nom_commercial, ville, adresse, latitude, longitude } = req.body || {};
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

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email, password_hash, role_id, nom, prenom, telephone: telephone || undefined
    });

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

    res.cookie('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: hours * 60 * 60 * 1000,
      path: '/',
    });

    const jwtToken = generateToken({
      userId: newUser._id as number,
      email: newUser.email,
      role_id: newUser.role_id
    });

    res.json({ user, token: jwtToken });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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

    res.cookie('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: hours * 60 * 60 * 1000,
      path: '/',
    });

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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/forgot-password — génère un token de réinitialisation
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const user = await User.findOne({ email });
    // Ne pas révéler si l'email existe ou non (sécurité)
    if (!user) {
      return res.json({ ok: true, message: 'Si cet email existe, vous recevrez un lien de réinitialisation.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await User.updateOne({ _id: user._id }, {
      reset_password_token: token,
      reset_password_expires: expires
    });

    // Pas de service email configuré — on retourne le token directement (mode démo)
    // En production, envoyer un email avec le lien
    res.json({
      ok: true,
      message: 'Lien de réinitialisation généré.',
      reset_token: token // À retirer en production et envoyer par email
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

export default router;
