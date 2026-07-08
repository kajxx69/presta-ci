import express, { Request, Response } from 'express';
import { Signalement, User, Prestataire, Service, Publication, Notification } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getNextId } from '../models/Counter.js';
import { serverError } from '../utils/http.js';

const router = express.Router();

// Middleware admin
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/signalements — Lister tous les signalements
router.get('/', async (req: Request, res: Response) => {
  try {
    const { statut, type_cible, page = '1', limit = '20' } = req.query;

    const filter: any = {};
    if (statut && statut !== 'all') filter.statut = statut;
    if (type_cible && type_cible !== 'all') filter.type_cible = type_cible;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [signalements, total] = await Promise.all([
      Signalement.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum),
      Signalement.countDocuments(filter)
    ]);

    // Enrichir avec les infos du signaleur et de la cible
    const results = await Promise.all(signalements.map(async (s) => {
      const signaleur = await User.findById(s.signaleur_id).select('prenom nom email photo_profil');

      let cible_info: any = null;
      switch (s.type_cible) {
        case 'prestataire': {
          const p = await Prestataire.findById(s.cible_id);
          if (p) {
            const u = await User.findOne({ _id: p.user_id }).select('prenom nom email');
            cible_info = { nom_commercial: p.nom_commercial, ville: p.ville, user: u };
          }
          break;
        }
        case 'service': {
          const svc = await Service.findById(s.cible_id);
          if (svc) cible_info = { nom: svc.nom, prix: svc.prix };
          break;
        }
        case 'publication': {
          const pub = await Publication.findById(s.cible_id);
          if (pub) cible_info = { description: pub.description?.substring(0, 100) };
          break;
        }
        case 'utilisateur': {
          const u = await User.findById(s.cible_id).select('prenom nom email photo_profil is_active');
          if (u) cible_info = u.toJSON();
          break;
        }
      }

      const admin = s.admin_id ? await User.findById(s.admin_id).select('prenom nom') : null;

      return {
        ...s.toJSON(),
        signaleur: signaleur?.toJSON() || null,
        cible_info,
        admin_info: admin?.toJSON() || null
      };
    }));

    res.json({
      signalements: results,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/admin/signalements/stats — Statistiques
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [total, en_attente, en_cours, resolu, rejete] = await Promise.all([
      Signalement.countDocuments(),
      Signalement.countDocuments({ statut: 'en_attente' }),
      Signalement.countDocuments({ statut: 'en_cours' }),
      Signalement.countDocuments({ statut: 'resolu' }),
      Signalement.countDocuments({ statut: 'rejete' })
    ]);

    res.json({ total, en_attente, en_cours, resolu, rejete });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/admin/signalements/:id/traiter — Traiter un signalement
router.put('/:id/traiter', async (req: Request, res: Response) => {
  try {
    const signalementId = Number(req.params.id);
    const { statut, resolution_note, action_prise } = req.body;

    if (!statut || !['en_cours', 'resolu', 'rejete'].includes(statut)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const signalement = await Signalement.findById(signalementId);
    if (!signalement) return res.status(404).json({ error: 'Signalement introuvable' });

    signalement.statut = statut;
    signalement.admin_id = req.userId!;
    if (resolution_note) signalement.resolution_note = resolution_note;
    if (action_prise) signalement.action_prise = action_prise;
    if (statut === 'resolu' || statut === 'rejete') {
      signalement.resolved_at = new Date();
    }
    await signalement.save();

    // Si une action est prise, appliquer
    if (action_prise === 'suspension_temporaire' || action_prise === 'suspension_definitive') {
      if (signalement.type_cible === 'prestataire') {
        const presta = await Prestataire.findById(signalement.cible_id);
        if (presta) {
          await User.updateOne({ _id: presta.user_id }, { is_active: false });
        }
      } else if (signalement.type_cible === 'utilisateur') {
        await User.updateOne({ _id: signalement.cible_id }, { is_active: false });
      }
    }

    if (action_prise === 'suppression_contenu') {
      if (signalement.type_cible === 'publication') {
        await Publication.deleteOne({ _id: signalement.cible_id });
      } else if (signalement.type_cible === 'service') {
        await Service.updateOne({ _id: signalement.cible_id }, { is_active: false });
      }
    }

    // Notifier le signaleur
    const statutLabels: Record<string, string> = {
      en_cours: 'est en cours de traitement',
      resolu: 'a été résolu',
      rejete: 'a été examiné et classé'
    };

    await Notification.create({
      _id: await getNextId('notifications'),
      user_id: signalement.signaleur_id,
      titre: 'Mise à jour de votre signalement',
      message: `Votre signalement #${signalementId} ${statutLabels[statut] || ''}. ${resolution_note || ''}`.trim(),
      type: statut === 'resolu' ? 'success' : 'info',
      data: { signalement_id: signalementId }
    });

    res.json({ ok: true, message: 'Signalement mis à jour' });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/admin/signalements/:id — Détail d'un signalement
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const signalement = await Signalement.findById(Number(req.params.id));
    if (!signalement) return res.status(404).json({ error: 'Signalement introuvable' });

    const signaleur = await User.findById(signalement.signaleur_id).select('prenom nom email photo_profil telephone');

    let cible_info: any = null;
    switch (signalement.type_cible) {
      case 'prestataire': {
        const p = await Prestataire.findById(signalement.cible_id);
        if (p) {
          const u = await User.findOne({ _id: p.user_id }).select('prenom nom email telephone is_active');
          cible_info = { ...p.toJSON(), user: u?.toJSON() };
        }
        break;
      }
      case 'service': {
        const svc = await Service.findById(signalement.cible_id);
        if (svc) cible_info = svc.toJSON();
        break;
      }
      case 'publication': {
        const pub = await Publication.findById(signalement.cible_id);
        if (pub) {
          const u = await User.findById(pub.client_id).select('prenom nom');
          cible_info = { ...pub.toJSON(), auteur: u?.toJSON() };
        }
        break;
      }
      case 'utilisateur': {
        const u = await User.findById(signalement.cible_id).select('prenom nom email photo_profil telephone is_active created_at');
        if (u) cible_info = u.toJSON();
        break;
      }
    }

    // Historique des signalements sur cette même cible
    const historique = await Signalement.countDocuments({
      type_cible: signalement.type_cible,
      cible_id: signalement.cible_id,
      _id: { $ne: signalement._id }
    });

    const admin = signalement.admin_id ? await User.findById(signalement.admin_id).select('prenom nom') : null;

    res.json({
      ...signalement.toJSON(),
      signaleur: signaleur?.toJSON() || null,
      cible_info,
      admin_info: admin?.toJSON() || null,
      nombre_signalements_cible: historique + 1
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
