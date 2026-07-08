import express, { Request, Response } from 'express';
import { TicketSupport, MessageTicket, User, Notification } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getNextId } from '../models/Counter.js';
import { serverError } from '../utils/http.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/tickets — liste tickets avec filtres
router.get('/', async (req: Request, res: Response) => {
  try {
    const { statut, categorie, page = '1', limit = '20' } = req.query;
    const filter: any = {};
    if (statut) filter.statut = statut;
    if (categorie) filter.categorie = categorie;

    const total = await TicketSupport.countDocuments(filter);
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));

    const tickets = await TicketSupport.find(filter)
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const results = await Promise.all(tickets.map(async (t) => {
      const user = await User.findById(t.user_id).select('prenom nom email');
      const lastMsg = await MessageTicket.findOne({ ticket_id: t._id }).sort({ created_at: -1 });
      return {
        ...t.toJSON(),
        user_nom: user ? `${user.prenom} ${user.nom}` : null,
        user_email: (user as any)?.email || null,
        dernier_message_at: lastMsg?.created_at || null,
        is_admin_last: lastMsg?.is_admin || false
      };
    }));

    res.json({ tickets: results, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/admin/tickets/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [total, ouvert, en_cours, resolu, ferme] = await Promise.all([
      TicketSupport.countDocuments({}),
      TicketSupport.countDocuments({ statut: 'ouvert' }),
      TicketSupport.countDocuments({ statut: 'en_cours' }),
      TicketSupport.countDocuments({ statut: 'resolu' }),
      TicketSupport.countDocuments({ statut: 'ferme' })
    ]);
    res.json({ total, ouvert, en_cours, resolu, ferme });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/admin/tickets/:id — détail ticket
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await TicketSupport.findById(parseInt(req.params.id));
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

    const user = await User.findById(ticket.user_id).select('prenom nom email telephone photo_profil');
    const messages = await MessageTicket.find({ ticket_id: ticket._id }).sort({ created_at: 1 });

    const enrichedMessages = await Promise.all(messages.map(async (m) => {
      const auteur = await User.findById(m.auteur_id).select('prenom nom photo_profil role_id');
      return {
        ...m.toJSON(),
        auteur_nom: auteur ? `${auteur.prenom} ${auteur.nom}` : null,
        auteur_photo: (auteur as any)?.photo_profil || null
      };
    }));

    res.json({
      ticket: ticket.toJSON(),
      user: user ? user.toJSON() : null,
      messages: enrichedMessages
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/admin/tickets/:id — mettre à jour statut/priorité/assignation
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const adminId = req.userId!;
    const ticket = await TicketSupport.findById(parseInt(req.params.id));
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

    const { statut, priorite } = req.body;
    const update: any = { updated_at: new Date(), admin_id: adminId };
    if (statut) update.statut = statut;
    if (priorite) update.priorite = priorite;
    if (statut === 'resolu') update.resolved_at = new Date();

    await TicketSupport.updateOne({ _id: ticket._id }, update);

    // Notifier l'utilisateur
    if (statut) {
      const statusLabels: Record<string, string> = {
        en_cours: 'pris en charge',
        resolu: 'résolu',
        ferme: 'fermé'
      };
      if (statusLabels[statut]) {
        await Notification.create({
          _id: await getNextId('notifications'),
          user_id: ticket.user_id,
          titre: 'Mise à jour de votre ticket',
          message: `Votre ticket "${ticket.sujet}" a été ${statusLabels[statut]}`,
          type: statut === 'resolu' ? 'success' : 'info',
          data: { ticket_id: ticket._id }
        });
      }
    }

    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/admin/tickets/:id/messages — répondre à un ticket
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const adminId = req.userId!;
    const ticket = await TicketSupport.findById(parseInt(req.params.id));
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

    const { contenu } = req.body;
    if (!contenu) return res.status(400).json({ error: 'Message requis' });

    await MessageTicket.create({
      ticket_id: ticket._id as number,
      auteur_id: adminId,
      contenu,
      is_admin: true
    });

    // Marquer le ticket en_cours si encore ouvert
    if (ticket.statut === 'ouvert') {
      await TicketSupport.updateOne({ _id: ticket._id }, { statut: 'en_cours', admin_id: adminId, updated_at: new Date() });
    } else {
      await TicketSupport.updateOne({ _id: ticket._id }, { updated_at: new Date() });
    }

    // Notifier l'utilisateur
    await Notification.create({
      _id: await getNextId('notifications'),
      user_id: ticket.user_id,
      titre: 'Réponse à votre ticket',
      message: `L'équipe support a répondu à votre ticket "${ticket.sujet}"`,
      type: 'info',
      data: { ticket_id: ticket._id }
    });

    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
