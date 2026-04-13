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
