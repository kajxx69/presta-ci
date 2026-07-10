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

// Note : l'activation d'un abonnement se fait exclusivement via le flux Wave
// (POST /api/wave-transactions puis validation admin sur
// PUT /api/admin/wave-transactions/:id/validate). Il n'existe volontairement
// aucune route ici permettant à un prestataire de s'auto-attribuer un plan —
// une ancienne route /start le permettait sans aucune vérification de
// paiement ni validation admin (faille de contournement de facturation) et a
// été supprimée. Ne pas la réintroduire sans passer par le flux Wave.

export default router;
