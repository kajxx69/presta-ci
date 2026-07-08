import express, { Request, Response } from 'express';
import { User } from '../models/index.js';
import { getUserIdFromSession } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { materializePhotos } from '../utils/uploads.js';

const router = express.Router();

// GET /api/users/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.json({ user: null, authenticated: false });

    const user = await User.findById(userId).select('email nom prenom telephone ville photo_profil role_id');
    if (!user) return res.json({ user: null, authenticated: false });

    res.json({ user: user.toJSON(), authenticated: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/users/me/parrainage — code de parrainage + filleuls
router.get('/me/parrainage', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const user = await User.findById(userId).select('prenom code_parrainage');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Génération paresseuse pour les comptes créés avant la fonctionnalité
    let code = (user as any).code_parrainage as string | undefined;
    if (!code) {
      const crypto = await import('crypto');
      const base = (user.prenom || 'USER').normalize('NFD').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'USER';
      code = `${base}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await User.updateOne({ _id: userId }, { code_parrainage: code });
    }

    const filleuls = await User.countDocuments({ parrain_id: userId });
    res.json({ code, filleuls });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/users/me
router.put('/me', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { nom, prenom, telephone, ville, photo_profil } = req.body || {};
    const update: any = { updated_at: new Date() };
    if (nom !== undefined) update.nom = nom;
    if (prenom !== undefined) update.prenom = prenom;
    if (telephone !== undefined) update.telephone = telephone;
    if (ville !== undefined) update.ville = ville;
    if (photo_profil !== undefined) {
      try {
        update.photo_profil = photo_profil ? await materializePhotos(photo_profil) : photo_profil;
      } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Photo invalide' });
      }
    }

    await User.updateOne({ _id: userId }, update);
    const user = await User.findById(userId).select('email nom prenom telephone ville photo_profil role_id');
    res.json({ user: user?.toJSON() });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
