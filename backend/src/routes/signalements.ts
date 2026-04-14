import express, { Request, Response } from 'express';
import { Signalement, User, Prestataire, Service, Publication, Notification } from '../models/index.js';
import { getUserIdFromSession } from '../middleware/auth.js';
import { getNextId } from '../models/Counter.js';

const router = express.Router();

// POST /api/signalements — Créer un signalement
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { type_cible, cible_id, motif, description, preuves } = req.body;

    if (!type_cible || !cible_id || !motif || !description) {
      return res.status(400).json({ error: 'type_cible, cible_id, motif et description sont requis' });
    }

    // Vérifier que la cible existe
    let cibleExists = false;
    switch (type_cible) {
      case 'prestataire':
        cibleExists = !!(await Prestataire.findById(cible_id));
        break;
      case 'service':
        cibleExists = !!(await Service.findById(cible_id));
        break;
      case 'publication':
        cibleExists = !!(await Publication.findById(cible_id));
        break;
      case 'utilisateur':
        cibleExists = !!(await User.findById(cible_id));
        break;
      default:
        return res.status(400).json({ error: 'type_cible invalide' });
    }

    if (!cibleExists) {
      return res.status(404).json({ error: 'La cible du signalement est introuvable' });
    }

    // Vérifier si l'utilisateur n'a pas déjà signalé cette cible
    const existing = await Signalement.findOne({
      signaleur_id: userId,
      type_cible,
      cible_id,
      statut: { $in: ['en_attente', 'en_cours'] }
    });
    if (existing) {
      return res.status(409).json({ error: 'Vous avez déjà signalé cet élément. Votre signalement est en cours de traitement.' });
    }

    const signalement = await Signalement.create({
      signaleur_id: userId,
      type_cible,
      cible_id,
      motif,
      description,
      preuves: preuves || []
    });

    // Notifier les admins
    const admins = await User.find({ role_id: 3 }).select('_id');
    const motifLabels: Record<string, string> = {
      arnaque: 'Arnaque',
      comportement_inapproprie: 'Comportement inapproprié',
      contenu_offensant: 'Contenu offensant',
      service_non_conforme: 'Service non conforme',
      'harcèlement': 'Harcèlement',
      faux_profil: 'Faux profil',
      spam: 'Spam',
      autre: 'Autre'
    };

    const signaleur = await User.findById(userId).select('prenom nom');
    const notifMessage = `Nouveau signalement (${motifLabels[motif] || motif}) par ${signaleur?.prenom || ''} ${signaleur?.nom || ''} — ${type_cible} #${cible_id}`;

    for (const admin of admins) {
      if (!admin._id) continue;
      await Notification.create({
        _id: await getNextId('notifications'),
        user_id: admin._id as number,
        titre: 'Nouveau signalement',
        message: notifMessage,
        type: 'warning',
        data: { signalement_id: signalement._id, type_cible, cible_id }
      });
    }

    res.status(201).json({ ok: true, id: signalement._id, message: 'Signalement envoyé avec succès' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/signalements/mine — Mes signalements
router.get('/mine', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const signalements = await Signalement.find({ signaleur_id: userId }).sort({ created_at: -1 });
    res.json(signalements);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
