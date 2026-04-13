import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Category, SubCategory, Plan, Prestataire, Service } from '../models/index.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('DB not connected');
    res.json({ status: 'ok', db: [{ ok: 1 }] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/categories', async (_req: Request, res: Response) => {
  const rows = await Category.find({ is_active: true }).sort({ ordre_affichage: 1, _id: 1 });
  res.json(rows);
});

router.get('/sous_categories', async (req: Request, res: Response) => {
  const { categorie_id } = req.query;
  const filter: any = { is_active: true };
  if (categorie_id) filter.categorie_id = Number(categorie_id);
  const rows = await SubCategory.find(filter).sort({ ordre_affichage: 1, _id: 1 });
  res.json(rows);
});

router.get('/plans_abonnement', async (_req: Request, res: Response) => {
  const rows = await Plan.find({ is_active: true }).sort({ _id: 1 });
  res.json(rows);
});

router.get('/prestataires', async (req: Request, res: Response) => {
  const { ville } = req.query;
  const filter: any = {};
  if (ville) filter.ville = ville;
  const rows = await Prestataire.find(filter).sort({ is_verified: -1, created_at: -1 });
  res.json(rows);
});

router.get('/services', async (req: Request, res: Response) => {
  const { sous_categorie_id, prestataire_id } = req.query;
  const filter: any = { is_active: true };
  if (sous_categorie_id) filter.sous_categorie_id = Number(sous_categorie_id);
  if (prestataire_id) filter.prestataire_id = Number(prestataire_id);
  const rows = await Service.find(filter).sort({ created_at: -1 });
  res.json(rows);
});

export default router;
