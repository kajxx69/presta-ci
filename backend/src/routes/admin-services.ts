import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Service, Prestataire, User, SubCategory, Category, Reservation, Avis, Notification, StatutReservation } from '../models/index.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/services
router.get('/', async (req, res) => {
  try {
    const { status = 'all', search = '', page = 1, limit = 20, prestataire_id, categorie_id } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const filter: any = { deleted_at: null };
    if (status === 'active') filter.is_active = true;
    else if (status === 'inactive') filter.is_active = false;
    if (prestataire_id) filter.prestataire_id = parseInt(prestataire_id as string);

    if (categorie_id) {
      const subCats = await SubCategory.find({ categorie_id: parseInt(categorie_id as string) }).select('_id');
      filter.sous_categorie_id = { $in: subCats.map(s => s._id) };
    }

    const [services, total] = await Promise.all([
      Service.find(filter).sort({ created_at: -1 }).skip(offset).limit(limitNum),
      Service.countDocuments(filter)
    ]);

    let results = await Promise.all(services.map(async (s) => {
      const [prestataire, sousCategorie] = await Promise.all([
        Prestataire.findById(s.prestataire_id).select('nom_commercial user_id'),
        SubCategory.findById(s.sous_categorie_id).select('nom categorie_id')
      ]);
      const [prestUser, category] = await Promise.all([
        prestataire?.user_id ? User.findById(prestataire.user_id).select('email') : null,
        sousCategorie?.categorie_id ? Category.findById(sousCategorie.categorie_id).select('nom') : null
      ]);
      const reservationCount = await Reservation.countDocuments({ service_id: s._id });
      const avisForService = await Avis.find({ service_id: s._id });
      const moyenne_avis = avisForService.length > 0 ? avisForService.reduce((sum, a) => sum + a.note, 0) / avisForService.length : 0;

      return {
        ...s.toJSON(),
        prestataire_nom: prestataire?.nom_commercial || null,
        prestataire_email: prestUser?.email || null,
        categorie_nom: category?.nom || null,
        sous_categorie_nom: sousCategorie?.nom || null,
        total_reservations: reservationCount,
        moyenne_avis: parseFloat(moyenne_avis.toFixed(1))
      };
    }));

    if (search) {
      const s = (search as string).toLowerCase();
      results = results.filter(r =>
        r.nom?.toLowerCase().includes(s) ||
        r.description?.toLowerCase().includes(s) ||
        r.prestataire_nom?.toLowerCase().includes(s) ||
        r.prestataire_email?.toLowerCase().includes(s)
      );
    }

    const totalPages = Math.ceil(total / limitNum);
    res.json({ services: results, pagination: { page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/services/stats/overview
router.get('/stats/overview', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const [all, actifs, nouveaux] = await Promise.all([
      Service.countDocuments({ deleted_at: null }),
      Service.countDocuments({ deleted_at: null, is_active: true }),
      Service.countDocuments({ deleted_at: null, created_at: { $gte: thirtyDaysAgo } })
    ]);

    const services = await Service.find({ deleted_at: null }).select('prix');
    const prix_moyen = services.length > 0 ? services.reduce((s, r) => s + (r.prix || 0), 0) / services.length : 0;

    const categories = await Category.find();
    const topCategories = await Promise.all(categories.map(async (c) => {
      const subCats = await SubCategory.find({ categorie_id: c._id }).select('_id');
      const count = await Service.countDocuments({ sous_categorie_id: { $in: subCats.map(s => s._id) }, deleted_at: null });
      return { categorie: c.nom, nombre_services: count };
    }));
    topCategories.sort((a, b) => b.nombre_services - a.nombre_services);

    // Top prestataires par nombre de services actifs
    const servicesByPrestataire = await Service.aggregate([
      { $match: { deleted_at: null, is_active: true } },
      { $group: { _id: '$prestataire_id', nombre_services: { $sum: 1 } } },
      { $sort: { nombre_services: -1 } },
      { $limit: 5 }
    ]);
    const topPrestataires = await Promise.all(servicesByPrestataire.map(async (row) => {
      const prestataire = await Prestataire.findById(row._id).select('nom_commercial note_moyenne user_id');
      const user = prestataire?.user_id ? await User.findById(prestataire.user_id).select('email') : null;
      return {
        prestataire: prestataire?.nom_commercial || 'Prestataire inconnu',
        email: user?.email || null,
        nombre_services: row.nombre_services,
        moyenne_avis: prestataire?.note_moyenne || 0
      };
    }));

    res.json({
      overview: { total_services: all, services_actifs: actifs, services_suspendus: all - actifs, nouveaux_ce_mois: nouveaux, prix_moyen: parseFloat(prix_moyen.toFixed(0)) },
      topCategories: topCategories.slice(0, 5),
      topPrestataires
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/services/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const s = await Service.findOne({ _id: id, deleted_at: null });
    if (!s) return res.status(404).json({ error: 'Service non trouvé' });

    const [prestataire, sousCategorie] = await Promise.all([
      Prestataire.findById(s.prestataire_id).select('nom_commercial user_id'),
      SubCategory.findById(s.sous_categorie_id).select('nom categorie_id')
    ]);
    const [prestUser, category] = await Promise.all([
      prestataire?.user_id ? User.findById(prestataire.user_id).select('email telephone') : null,
      sousCategorie?.categorie_id ? Category.findById(sousCategorie.categorie_id).select('nom') : null
    ]);
    const termineeStatut = await StatutReservation.findOne({ nom: 'terminee' });
    const [reservationCount, termineesCount, avisForService] = await Promise.all([
      Reservation.countDocuments({ service_id: id }),
      termineeStatut ? Reservation.countDocuments({ service_id: id, statut_id: termineeStatut._id }) : Promise.resolve(0),
      Avis.find({ service_id: id })
    ]);
    const moyenne_avis = avisForService.length > 0 ? avisForService.reduce((sum, a) => sum + a.note, 0) / avisForService.length : 0;

    res.json({
      ...s.toJSON(),
      prestataire_nom: prestataire?.nom_commercial || null,
      prestataire_email: prestUser?.email || null,
      prestataire_telephone: prestUser?.telephone || null,
      categorie_nom: category?.nom || null,
      sous_categorie_nom: sousCategorie?.nom || null,
      total_reservations: reservationCount,
      reservations_terminees: termineesCount,
      moyenne_avis: parseFloat(moyenne_avis.toFixed(1)),
      nombre_avis: avisForService.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/services/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { is_active, reason } = req.body;

    const service = await Service.findOne({ _id: id, deleted_at: null });
    if (!service) return res.status(404).json({ error: 'Service non trouvé' });

    await Service.updateOne({ _id: id }, { is_active, updated_at: new Date() });

    if (!is_active) {
      const prestataire = await Prestataire.findById(service.prestataire_id).select('user_id');
      const userId = prestataire?.user_id || service.prestataire_id;
      await Notification.create({
        user_id: userId, type: 'service_suspended', titre: 'Service suspendu',
        message: `Votre service a été suspendu. Raison: ${reason || 'Non spécifiée'}`,
        data: JSON.stringify({ service_id: id, reason }), is_read: false
      });
    }

    res.json({ success: true, message: is_active ? 'Service activé' : 'Service suspendu' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/services/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;

    const service = await Service.findOne({ _id: id, deleted_at: null });
    if (!service) return res.status(404).json({ error: 'Service non trouvé' });

    const activeStatuts = await StatutReservation.find({ nom: { $in: ['en_attente', 'confirmee'] } });
    const activeStatutIds = activeStatuts.map(s => s._id);
    const activeCount = await Reservation.countDocuments({ service_id: id, statut_id: { $in: activeStatutIds } });
    if (activeCount > 0) return res.status(400).json({ error: 'Impossible de supprimer un service avec des réservations actives' });

    await Service.updateOne({ _id: id }, { deleted_at: new Date() });

    const prestataire = await Prestataire.findById(service.prestataire_id).select('user_id');
    const userId = prestataire?.user_id || service.prestataire_id;
    await Notification.create({
      user_id: userId, type: 'service_deleted', titre: 'Service supprimé',
      message: `Votre service "${service.nom}" a été supprimé. Raison: ${reason || 'Non spécifiée'}`,
      data: JSON.stringify({ service_id: id, service_name: service.nom, reason }), is_read: false
    });

    res.json({ success: true, message: 'Service supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
