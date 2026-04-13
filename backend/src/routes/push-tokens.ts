import { Router, Request, Response } from 'express';
import { PushToken } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// POST /api/push-tokens
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { token, device_type, device_id } = req.body;
    if (!token || !device_type) return res.status(400).json({ error: "Token et type d'appareil requis" });

    const existing = await PushToken.findOne({ user_id: userId, token });
    if (existing) {
      await PushToken.updateOne({ _id: existing._id }, { device_type, device_id, is_active: true, updated_at: new Date() });
      return res.json({ ok: true, message: 'Token mis à jour' });
    }

    const pt = await PushToken.create({ user_id: userId, token, device_type, device_id });
    res.json({ ok: true, id: pt._id, message: 'Token enregistré' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/push-tokens
router.get('/', async (req: Request, res: Response) => {
  try {
    const tokens = await PushToken.find({ user_id: req.userId }).sort({ created_at: -1 });
    res.json(tokens);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/push-tokens/:id/toggle
router.put('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.id);
    const pt = await PushToken.findOne({ _id: tokenId, user_id: req.userId });
    if (!pt) return res.status(404).json({ error: 'Token introuvable' });

    const newStatus = !pt.is_active;
    await PushToken.updateOne({ _id: tokenId }, { is_active: newStatus, updated_at: new Date() });
    res.json({ ok: true, is_active: newStatus });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/push-tokens/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await PushToken.deleteOne({ _id: parseInt(req.params.id), user_id: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Token introuvable' });
    res.json({ ok: true, message: 'Token supprimé' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/push-tokens/cleanup
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const result = await PushToken.deleteMany({ user_id: req.userId, is_active: false, updated_at: { $lt: cutoff } });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
