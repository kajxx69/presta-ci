import express, { Request, Response } from 'express';
import { Prestataire, User } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { InAppNotificationService } from '../services/in-app-notifications.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

// GET /api/admin/verifications?statut=en_attente|verifie|rejete|all
router.get('/', async (req: Request, res: Response) => {
  try {
    const { statut = 'en_attente', page = '1', limit = '20' } = req.query;
    const filter: any = {};
    if (statut && statut !== 'all') filter.verification_statut = statut;
    else filter.verification_statut = { $ne: 'non_demandee' };

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [prestataires, total] = await Promise.all([
      Prestataire.find(filter).sort({ verification_demandee_at: -1 }).skip(skip).limit(limitNum),
      Prestataire.countDocuments(filter)
    ]);

    const results = await Promise.all(prestataires.map(async (p) => {
      const user = await User.findById(p.user_id).select('prenom nom email telephone photo_profil');
      return {
        id: p._id,
        nom_commercial: p.nom_commercial,
        ville: p.ville,
        adresse: p.adresse,
        user_nom: user ? `${user.prenom} ${user.nom}` : null,
        user_email: (user as any)?.email || null,
        user_telephone: (user as any)?.telephone || null,
        verification_statut: p.verification_statut,
        verification_document: p.verification_document,
        verification_demandee_at: p.verification_demandee_at,
        verification_traitee_at: p.verification_traitee_at,
        verification_rejet_motif: p.verification_rejet_motif,
        is_verified: p.is_verified,
      };
    }));

    res.json({ verifications: results, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/admin/verifications/:id/approve
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const prestataire = await Prestataire.findById(id);
    if (!prestataire) return res.status(404).json({ error: 'Prestataire introuvable' });
    if (prestataire.verification_statut !== 'en_attente') {
      return res.status(400).json({ error: 'Cette demande n\'est pas en attente d\'examen.' });
    }

    await Prestataire.updateOne({ _id: id }, {
      is_verified: true,
      verification_statut: 'verifie',
      verification_traitee_at: new Date(),
      verification_rejet_motif: null,
      updated_at: new Date()
    });

    try {
      await InAppNotificationService.createCustom(
        prestataire.user_id,
        '✓ Identité vérifiée',
        'Félicitations, votre identité a été vérifiée. Le badge "Identité vérifiée" est maintenant visible sur votre profil.',
        'success'
      );
    } catch { /* non bloquant */ }

    res.json({ ok: true, message: 'Prestataire vérifié avec succès' });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/admin/verifications/:id/reject
router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { motif } = req.body || {};
    if (!motif || !String(motif).trim()) {
      return res.status(400).json({ error: 'Un motif de rejet est requis.' });
    }

    const prestataire = await Prestataire.findById(id);
    if (!prestataire) return res.status(404).json({ error: 'Prestataire introuvable' });
    if (prestataire.verification_statut !== 'en_attente') {
      return res.status(400).json({ error: 'Cette demande n\'est pas en attente d\'examen.' });
    }

    await Prestataire.updateOne({ _id: id }, {
      verification_statut: 'rejete',
      verification_traitee_at: new Date(),
      verification_rejet_motif: String(motif).trim(),
      updated_at: new Date()
    });

    try {
      await InAppNotificationService.createCustom(
        prestataire.user_id,
        'Vérification refusée',
        `Votre demande de vérification d'identité a été refusée. Motif : ${String(motif).trim()}`,
        'warning'
      );
    } catch { /* non bloquant */ }

    res.json({ ok: true, message: 'Demande rejetée' });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
