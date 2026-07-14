import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Plan, TransactionWave, Prestataire, User } from '../models/index.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/plans
router.get('/', async (req, res) => {
  try {
    const { include_inactive } = req.query;
    const filter = include_inactive ? {} : { is_active: true };
    const plans = await Plan.find(filter).sort({ prix: 1 });

    const results = await Promise.all(plans.map(async (p) => {
      const [total, validated] = await Promise.all([
        TransactionWave.countDocuments({ plan_id: p._id }),
        TransactionWave.countDocuments({ plan_id: p._id, statut: 'valide' })
      ]);
      const validatedTxs = await TransactionWave.find({ plan_id: p._id, statut: 'valide' }).select('montant');
      const revenus = validatedTxs.reduce((s, t) => s + (parseFloat(String(t.montant)) || 0), 0);
      return { ...p.toJSON(), nombre_abonnements_actifs: total, revenus_totaux: revenus };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/plans/stats/overview
router.get('/stats/overview', async (req, res) => {
  try {
    const plans = await Plan.find();
    const txAll = await TransactionWave.find().select('plan_id statut montant created_at');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const total_plans = plans.length;
    const plans_actifs = plans.filter(p => p.is_active).length;
    const prix_values = plans.map(p => p.prix).filter(p => p != null);
    const prix_moyen = prix_values.length > 0 ? prix_values.reduce((s, v) => s + v, 0) / prix_values.length : 0;

    const revenus_ce_mois = txAll
      .filter(t => t.created_at >= thirtyDaysAgo)
      .reduce((s, t) => s + (parseFloat(String(t.montant)) || 0), 0);

    const planPopularity = await Promise.all(plans.filter(p => p.is_active).map(async (p) => {
      const txs = txAll.filter(t => String(t.plan_id) === String(p._id));
      const actifs = txs.filter(t => t.statut === 'valide').length;
      const revenus = txs.filter(t => t.statut === 'valide').reduce((s, t) => s + (parseFloat(String(t.montant)) || 0), 0);
      return { plan_nom: p.nom, plan_prix: p.prix, nombre_abonnements: txs.length, abonnements_actifs: actifs, revenus_mensuels: revenus };
    }));
    planPopularity.sort((a, b) => b.nombre_abonnements - a.nombre_abonnements);

    res.json({ planStats: { total_plans, plans_actifs, prix_moyen, prix_min: Math.min(...prix_values) || 0, prix_max: Math.max(...prix_values) || 0 }, revenueStats: { revenus_ce_mois }, planPopularity });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/plans/subscriptions/all
router.get('/subscriptions/all', async (req, res) => {
  try {
    const { statut = 'all', plan_id, search = '', page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (statut !== 'all') filter.statut = statut;
    if (plan_id) filter.plan_id = parseInt(plan_id as string);

    const [txs, total] = await Promise.all([
      TransactionWave.find(filter).sort({ created_at: -1 }).skip(offset).limit(limitNum),
      TransactionWave.countDocuments(filter)
    ]);

    let results = await Promise.all(txs.map(async (t) => {
      const [prestataire, plan] = await Promise.all([
        Prestataire.findById(t.prestataire_id).select('user_id'),
        Plan.findById(t.plan_id).select('nom prix')
      ]);
      const user = prestataire?.user_id ? await User.findById(prestataire.user_id).select('nom email') : null;
      return { ...t.toJSON(), user_nom: user?.nom || null, user_email: user?.email || null, plan_nom: plan?.nom || null, plan_prix: plan?.prix || null };
    }));

    if (search) {
      const s = (search as string).toLowerCase();
      results = results.filter(r => r.user_nom?.toLowerCase().includes(s) || r.user_email?.toLowerCase().includes(s) || r.plan_nom?.toLowerCase().includes(s));
    }

    const totalPages = Math.ceil(total / limitNum);
    res.json({ subscriptions: results, pagination: { page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/plans/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const [allTxs, recentTxs] = await Promise.all([
      TransactionWave.find({ plan_id: id }).select('statut montant created_at prestataire_id'),
      TransactionWave.find({ plan_id: id }).sort({ created_at: -1 }).limit(10)
    ]);

    const validatedTxs = allTxs.filter(t => t.statut === 'valide');
    const revenus = validatedTxs.reduce((s, t) => s + (parseFloat(String(t.montant)) || 0), 0);
    const nouveaux = allTxs.filter(t => t.created_at >= thirtyDaysAgo).length;

    const recentSubs = await Promise.all(recentTxs.map(async (t) => {
      const prestataire = await Prestataire.findById(t.prestataire_id).select('user_id');
      const user = prestataire?.user_id ? await User.findById(prestataire.user_id).select('nom email') : null;
      return { ...t.toJSON(), user_nom: user?.nom || null, user_email: user?.email || null };
    }));

    res.json({ ...plan.toJSON(), nombre_abonnements_actifs: validatedTxs.length, nouveaux_abonnements_30j: nouveaux, revenus_mensuels_recurrents: revenus, recent_subscriptions: recentSubs });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/plans
router.post('/', async (req, res) => {
  try {
    const { nom, description, prix, max_services, max_reservations_mois, max_photos_par_service = 5, features = [], avantages = [], is_popular = false } = req.body;
    if (!nom || !description || prix === undefined || !max_services) return res.status(400).json({ error: 'Nom, description, prix et max_services requis' });
    if (prix < 0) return res.status(400).json({ error: 'Le prix ne peut pas être négatif' });

    const existing = await Plan.findOne({ nom });
    if (existing) return res.status(400).json({ error: 'Un plan avec ce nom existe déjà' });

    if (is_popular) await Plan.updateMany({ is_popular: true }, { is_popular: false });

    // avantages : liste affichée au prestataire (PlansTab) ; features : flags internes (ex. verified_badge)
    const plan = await Plan.create({ nom, description, prix, max_services, max_reservations_mois: max_reservations_mois || null, max_photos_par_service, features, avantages, is_popular });
    res.status(201).json({ success: true, message: 'Plan créé', id: plan._id });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/plans/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nom, description, prix, max_services, max_reservations_mois, max_photos_par_service, features, avantages, is_active, is_popular } = req.body;

    const existing = await Plan.findById(id);
    if (!existing) return res.status(404).json({ error: 'Plan non trouvé' });

    if (nom && nom !== existing.nom) {
      const dup = await Plan.findOne({ nom, _id: { $ne: id } });
      if (dup) return res.status(400).json({ error: 'Un plan avec ce nom existe déjà' });
    }
    if (prix !== undefined && prix < 0) return res.status(400).json({ error: 'Le prix ne peut pas être négatif' });
    if (is_popular) await Plan.updateMany({ is_popular: true, _id: { $ne: id } }, { is_popular: false });

    const update: any = { updated_at: new Date() };
    if (nom) update.nom = nom;
    if (description) update.description = description;
    if (prix !== undefined) update.prix = prix;
    if (max_services) update.max_services = max_services;
    if (max_reservations_mois !== undefined) update.max_reservations_mois = max_reservations_mois;
    if (max_photos_par_service) update.max_photos_par_service = max_photos_par_service;
    if (features) update.features = features;
    if (avantages) update.avantages = avantages;
    if (typeof is_active === 'boolean') update.is_active = is_active;
    if (typeof is_popular === 'boolean') update.is_popular = is_popular;

    if (Object.keys(update).length === 1) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });

    await Plan.updateOne({ _id: id }, update);
    res.json({ success: true, message: 'Plan mis à jour' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/plans/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });

    const activeCount = await Prestataire.countDocuments({ plan_actuel_id: id, abonnement_expires_at: { $gt: new Date() } });
    if (activeCount > 0) return res.status(400).json({ error: 'Impossible de supprimer un plan avec des abonnements actifs' });

    await Plan.deleteOne({ _id: id });
    res.json({ success: true, message: 'Plan supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
