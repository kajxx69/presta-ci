import express, { Request, Response } from 'express';
import { Plan, Prestataire } from '../models/index.js';
import { getUserIdFromSession } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';

const router = express.Router();

// GET /api/subscription/plans
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await Plan.find({ is_active: true }).sort({ _id: 1 });
    res.json(plans);
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/subscription
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const prestataire = await Prestataire.findOne({ user_id: userId });
    if (!prestataire) return res.json({ subscription: null });

    const plan = await Plan.findById(prestataire.plan_actuel_id);
    const sub = {
      prestataire_id: prestataire._id,
      plan_actuel_id: prestataire.plan_actuel_id,
      abonnement_expires_at: prestataire.abonnement_expires_at,
      plan_nom: plan?.nom || null,
      max_services: plan?.max_services ?? null,
      max_reservations_mois: plan?.max_reservations_mois ?? null
    };

    res.json({ subscription: sub });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/subscription/start
router.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { plan_id, duree_jours = 30 } = req.body || {};
    if (!plan_id) return res.status(400).json({ error: 'plan_id requis' });

    const prestataire = await Prestataire.findOne({ user_id: userId });
    if (!prestataire) return res.status(403).json({ error: 'Prestataire introuvable' });

    const expires = new Date(Date.now() + duree_jours * 86400000);
    await Prestataire.updateOne({ user_id: userId }, {
      plan_actuel_id: plan_id,
      abonnement_expires_at: expires,
      updated_at: new Date()
    });

    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
