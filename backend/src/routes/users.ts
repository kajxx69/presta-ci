import express, { Request, Response } from 'express';
import { User } from '../models/index.js';
import { getUserIdFromSession } from '../middleware/auth.js';

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
    res.status(500).json({ error: e.message });
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
    if (photo_profil !== undefined) update.photo_profil = photo_profil;

    await User.updateOne({ _id: userId }, update);
    const user = await User.findById(userId).select('email nom prenom telephone ville photo_profil role_id');
    res.json({ user: user?.toJSON() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
