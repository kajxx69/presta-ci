import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { User, UserSession, Role, Prestataire, Plan, Service } from '../models/index.js';
import { invalidateSearchIndex } from '../utils/search-engine.js';

const router = express.Router();

// GET /api/admin/users
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let filter: any = {};
    if (role && role !== 'all') {
      const roleDoc = await Role.findOne({ nom: String(role) });
      if (roleDoc) filter.role_id = roleDoc._id;
    }

    if (search) {
      const s = `${search}`;
      filter.$or = [
        { nom: { $regex: s, $options: 'i' } },
        { prenom: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } }
      ];
    }

    // Les comptes supprimés (soft-delete) ne figurent plus dans la liste
    filter.deleted_at = null;

    const [users, total] = await Promise.all([
      User.find(filter).sort({ created_at: -1 }).skip(offset).limit(limitNum),
      User.countDocuments(filter)
    ]);

    const results = await Promise.all(users.map(async (u) => {
      const roleDoc = await Role.findById(u.role_id);
      const prestataire = await Prestataire.findOne({ user_id: u._id });
      const plan = prestataire?.plan_actuel_id ? await Plan.findById(prestataire.plan_actuel_id) : null;
      return {
        ...u.toJSON(),
        role_nom: roleDoc?.nom || null,
        nom_commercial: prestataire?.nom_commercial || null,
        abonnement_expires_at: prestataire?.abonnement_expires_at || null,
        plan_nom: plan?.nom || null,
      };
    }));

    res.json({
      users: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/users/stats
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [clientRole, prestataireRole, adminRole] = await Promise.all([
      Role.findOne({ nom: 'client' }),
      Role.findOne({ nom: 'prestataire' }),
      Role.findOne({ nom: 'admin' })
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const notDeleted = { deleted_at: null };
    const [total, clients, prestataires, admins, nouveaux_30j] = await Promise.all([
      User.countDocuments(notDeleted),
      clientRole ? User.countDocuments({ role_id: clientRole._id, ...notDeleted }) : 0,
      prestataireRole ? User.countDocuments({ role_id: prestataireRole._id, ...notDeleted }) : 0,
      adminRole ? User.countDocuments({ role_id: adminRole._id, ...notDeleted }) : 0,
      User.countDocuments({ created_at: { $gte: thirtyDaysAgo }, ...notDeleted })
    ]);

    res.json({ total_users: total, clients, prestataires, admins, nouveaux_30j });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/users/:id/toggle-status
router.put('/:id/toggle-status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminId = req.userId!;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const roleDoc = await Role.findById(user.role_id);
    if (roleDoc?.nom === 'admin') return res.status(403).json({ error: "Impossible de modifier le statut d'un administrateur" });
    if (userId === adminId) return res.status(403).json({ error: 'Vous ne pouvez pas modifier votre propre statut' });

    const newStatus = !user.is_active;
    await User.updateOne({ _id: userId }, { is_active: newStatus });

    // Suspendre/réactiver un prestataire doit avoir le même effet sur sa vitrine
    // publique que sur son compte (sinon il reste visible partout, suspendu ou non)
    const prestataire = await Prestataire.findOne({ user_id: userId });
    if (prestataire) {
      await Prestataire.updateOne({ _id: prestataire._id }, { is_active: newStatus, updated_at: new Date() });
      if (!newStatus) {
        await Service.updateMany({ prestataire_id: prestataire._id }, { is_active: false, updated_at: new Date() });
      }
      invalidateSearchIndex();
    }

    res.json({ ok: true, is_active: newStatus, message: newStatus ? 'Utilisateur réactivé avec succès' : 'Utilisateur suspendu avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/users/:id — suppression douce (is_active=false) pour préserver
// l'intégrité référentielle (réservations, avis, conversations pointent vers cet user_id)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminId = req.userId!;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const roleDoc = await Role.findById(user.role_id);
    if (roleDoc?.nom === 'admin') return res.status(403).json({ error: "Impossible de supprimer un administrateur" });
    if (userId === adminId) return res.status(403).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });

    // Anonymiser l'email pour le libérer (une réinscription avec le même email
    // doit rester possible), tout en gardant une trace de l'original
    await User.updateOne({ _id: userId }, {
      is_active: false,
      deleted_at: new Date(),
      email: `deleted-${userId}.${user.email}`,
      updated_at: new Date(),
    });
    await UserSession.deleteMany({ user_id: userId });

    // Prestataire : lui-même (vitrine) et ses services ne doivent plus apparaître
    // nulle part (listing, recherche, "populaires", fiche détail)
    const prestataire = await Prestataire.findOne({ user_id: userId });
    if (prestataire) {
      await Prestataire.updateOne({ _id: prestataire._id }, { is_active: false, updated_at: new Date() });
      await Service.updateMany({ prestataire_id: prestataire._id }, { is_active: false, updated_at: new Date() });
      invalidateSearchIndex();
    }

    res.json({ ok: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
