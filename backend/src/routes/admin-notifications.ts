import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Notification, NotificationTemplate, User } from '../models/index.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/notifications
router.get('/', async (req, res) => {
  try {
    const { type, search, page = 1, limit = 20, user_id, is_read, date_debut, date_fin } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (type && type !== 'all') filter.type = type;
    if (user_id) filter.user_id = parseInt(user_id as string);
    if (typeof is_read === 'string') filter.is_read = is_read === 'true';
    if (date_debut) filter.sent_at = { ...filter.sent_at, $gte: new Date(date_debut as string) };
    if (date_fin) filter.sent_at = { ...filter.sent_at, $lte: new Date(date_fin as string) };

    const [notifs, total] = await Promise.all([
      Notification.find(filter).sort({ sent_at: -1 }).skip(offset).limit(limitNum),
      Notification.countDocuments(filter)
    ]);

    let results = await Promise.all(notifs.map(async (n) => {
      const user = await User.findById(n.user_id).select('nom email');
      return { ...n.toJSON(), user_nom: user?.nom || null, user_email: user?.email || null };
    }));

    if (search) {
      const s = (search as string).toLowerCase();
      results = results.filter(r =>
        r.user_nom?.toLowerCase().includes(s) ||
        r.user_email?.toLowerCase().includes(s) ||
        r.titre?.toLowerCase().includes(s) ||
        r.message?.toLowerCase().includes(s)
      );
    }

    const totalPages = Math.ceil(total / limitNum);
    res.json({ success: true, notifications: results, pagination: { page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1 } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/admin/notifications/broadcast
router.post('/broadcast', async (req, res) => {
  try {
    const { title, message, type = 'info', target_roles = ['all'], data = {} } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, error: 'Titre et message sont requis et ne peuvent pas être vides' });
    }

    const validTypes = ['info', 'success', 'warning', 'error'];
    if (!validTypes.includes(type)) return res.status(400).json({ success: false, error: 'Type invalide' });

    const cleanTargetRoles: string[] = Array.isArray(target_roles) ? target_roles : ['all'];
    const roleIds: number[] = [];
    if (!cleanTargetRoles.includes('all')) {
      if (cleanTargetRoles.includes('client')) roleIds.push(1);
      if (cleanTargetRoles.includes('prestataire')) roleIds.push(2);
      if (cleanTargetRoles.includes('admin')) roleIds.push(3);
    }

    const userFilter = roleIds.length > 0 ? { role_id: { $in: roleIds } } : {};
    const users = await User.find(userFilter).select('_id');

    if (users.length === 0) return res.status(400).json({ success: false, error: 'Aucun utilisateur trouvé pour les rôles spécifiés' });

    await Promise.all(users.map(u => Notification.create({
      user_id: u._id as number, titre: title.trim(), message: message.trim(),
      data: JSON.stringify(data), is_read: false
    })));

    res.json({ success: true, message: `Notification envoyée à ${users.length} utilisateurs`, recipients_count: users.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/admin/notifications/stats
router.get('/stats', async (req, res) => {
  try {
    const [total, non_lues, envoyees_24h] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ is_read: false }),
      Notification.countDocuments({ sent_at: { $gte: new Date(Date.now() - 86400000) } })
    ]);
    const lues = total - non_lues;
    res.json({ success: true, total, non_lues, lues, envoyees_24h });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await Notification.deleteOne({ _id: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Notification non trouvée' });
    res.json({ success: true, message: 'Notification supprimée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/notifications/templates
router.get('/templates', async (req, res) => {
  try {
    const { include_inactive } = req.query;
    const filter = include_inactive ? {} : { is_active: true };
    const templates = await NotificationTemplate.find(filter).sort({ nom: 1 });
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/admin/notifications/templates
router.post('/templates', async (req, res) => {
  try {
    const { nom, titre, message, type = 'info', variables } = req.body;
    if (!nom?.trim() || !titre?.trim() || !message?.trim()) return res.status(400).json({ error: 'Nom, titre et message requis' });

    const existing = await NotificationTemplate.findOne({ nom: nom.trim() });
    if (existing) return res.status(400).json({ error: 'Un template avec ce nom existe déjà' });

    const template = await NotificationTemplate.create({ nom: nom.trim(), titre: titre.trim(), message: message.trim(), variables: variables || undefined });
    res.status(201).json({ success: true, message: 'Template créé', id: template._id });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/notifications/templates/:id
router.put('/templates/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nom, titre, message, type, variables, is_active } = req.body;

    const existing = await NotificationTemplate.findById(id);
    if (!existing) return res.status(404).json({ error: 'Template non trouvé' });

    const update: any = { updated_at: new Date() };
    if (nom) update.nom = nom;
    if (titre) update.titre = titre;
    if (message) update.message = message;
    if (type) update.type = type;
    if (variables !== undefined) update.variables = variables;
    if (typeof is_active === 'boolean') update.is_active = is_active;

    await NotificationTemplate.updateOne({ _id: id }, update);
    res.json({ success: true, message: 'Template mis à jour' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/notifications/templates/:id
router.delete('/templates/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await NotificationTemplate.deleteOne({ _id: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Template non trouvé' });
    res.json({ success: true, message: 'Template supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
