import express, { Request, Response } from 'express';
import { TicketSupport, MessageTicket, User, Notification } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getNextId } from '../models/Counter.js';

const router = express.Router();
router.use(requireAuth);

// POST /api/tickets — Créer un ticket de support
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { sujet, categorie, message, reservation_id, priorite } = req.body;

    if (!sujet || !message) return res.status(400).json({ error: 'Sujet et message requis' });

    const ticket = await TicketSupport.create({
      user_id: userId,
      reservation_id: reservation_id || null,
      sujet,
      categorie: categorie || 'autre',
      priorite: priorite || 'normale'
    });

    // Premier message = description du problème
    await MessageTicket.create({
      ticket_id: ticket._id as number,
      auteur_id: userId,
      contenu: message,
      is_admin: false
    });

    // Notifier les admins
    const admins = await User.find({ role_id: 3 }).select('_id');
    const user = await User.findById(userId).select('prenom nom');
    const userName = user ? `${user.prenom} ${user.nom}` : 'Un utilisateur';
    for (const admin of admins) {
      if (!admin._id) continue;
      await Notification.create({
        _id: await getNextId('notifications'),
        user_id: admin._id as number,
        titre: 'Nouveau ticket de support',
        message: `${userName} a ouvert un ticket: "${sujet}"`,
        type: 'info',
        data: { ticket_id: ticket._id }
      });
    }

    res.status(201).json({ ok: true, id: ticket._id, message: 'Ticket créé avec succès' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tickets — Mes tickets
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const tickets = await TicketSupport.find({ user_id: userId }).sort({ updated_at: -1 });

    const results = await Promise.all(tickets.map(async (t) => {
      const lastMsg = await MessageTicket.findOne({ ticket_id: t._id }).sort({ created_at: -1 });
      return {
        ...t.toJSON(),
        dernier_message: lastMsg?.contenu || null,
        dernier_message_at: lastMsg?.created_at || null
      };
    }));

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tickets/:id — Détail ticket + messages
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const ticket = await TicketSupport.findOne({ _id: parseInt(req.params.id), user_id: userId });
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

    const messages = await MessageTicket.find({ ticket_id: ticket._id }).sort({ created_at: 1 });

    const enrichedMessages = await Promise.all(messages.map(async (m) => {
      const auteur = await User.findById(m.auteur_id).select('prenom nom photo_profil role_id');
      return {
        ...m.toJSON(),
        auteur_nom: auteur ? `${auteur.prenom} ${auteur.nom}` : null,
        auteur_photo: (auteur as any)?.photo_profil || null
      };
    }));

    res.json({ ticket: ticket.toJSON(), messages: enrichedMessages });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/tickets/:id/messages — Ajouter un message à un ticket
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const ticket = await TicketSupport.findOne({ _id: parseInt(req.params.id), user_id: userId });
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
    if (['resolu', 'ferme'].includes(ticket.statut)) {
      return res.status(400).json({ error: 'Ce ticket est fermé' });
    }

    const { contenu } = req.body;
    if (!contenu) return res.status(400).json({ error: 'Message requis' });

    await MessageTicket.create({
      ticket_id: ticket._id as number,
      auteur_id: userId,
      contenu,
      is_admin: false
    });

    await TicketSupport.updateOne({ _id: ticket._id }, { updated_at: new Date() });

    // Notifier l'admin assigné
    if (ticket.admin_id) {
      await Notification.create({
        _id: await getNextId('notifications'),
        user_id: ticket.admin_id,
        titre: 'Nouveau message sur ticket',
        message: `L'utilisateur a répondu sur le ticket "${ticket.sujet}"`,
        type: 'info',
        data: { ticket_id: ticket._id }
      });
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
