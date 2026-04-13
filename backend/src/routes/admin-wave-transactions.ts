import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { TransactionWave, Prestataire, User, Plan } from '../models/index.js';

const router = express.Router();

// GET /api/admin/wave-transactions
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { statut, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (statut && statut !== 'all') filter.statut = statut;

    const [transactions, total] = await Promise.all([
      TransactionWave.find(filter).sort({ created_at: -1 }).skip(offset).limit(limitNum),
      TransactionWave.countDocuments(filter)
    ]);

    const results = await Promise.all(transactions.map(async (tx) => {
      const [prestataire, plan] = await Promise.all([
        Prestataire.findById(tx.prestataire_id).select('user_id'),
        Plan.findById(tx.plan_id).select('nom prix')
      ]);
      const [prestUser, adminUser] = await Promise.all([
        prestataire?.user_id ? User.findById(prestataire.user_id).select('nom prenom email telephone') : null,
        tx.validee_par_admin_id ? User.findById(tx.validee_par_admin_id).select('nom prenom') : null
      ]);
      return {
        ...tx.toJSON(),
        prestataire_nom: prestUser?.nom || null,
        prestataire_prenom: prestUser?.prenom || null,
        prestataire_email: prestUser?.email || null,
        prestataire_telephone: prestUser?.telephone || null,
        plan_nom: plan?.nom || null,
        plan_prix: plan?.prix || null,
        admin_nom: adminUser?.nom || null,
        admin_prenom: adminUser?.prenom || null
      };
    }));

    const totalPages = Math.ceil(total / limitNum);
    res.json({ transactions: results, pagination: { page: pageNum, limit: limitNum, total, totalPages } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/wave-transactions/:id/validate
router.put('/:id/validate', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    const adminId = req.user!.id;

    const tx = await TransactionWave.findOne({ _id: txId, statut: 'en_attente' });
    if (!tx) return res.status(404).json({ error: 'Transaction non trouvée ou déjà traitée' });

    const expires = new Date(Date.now() + (tx.duree_abonnement_jours || 30) * 86400000);

    await Promise.all([
      TransactionWave.updateOne({ _id: txId }, { statut: 'valide', validee_par_admin_id: adminId, date_validation: new Date(), updated_at: new Date() }),
      Prestataire.updateOne({ _id: tx.prestataire_id }, { plan_actuel_id: tx.plan_id, abonnement_expires_at: expires, updated_at: new Date() })
    ]);

    res.json({ ok: true, message: 'Transaction validée et abonnement activé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/wave-transactions/:id/reject
router.put('/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const { motif_rejet } = req.body;

    if (!motif_rejet?.trim()) return res.status(400).json({ error: 'Le motif de rejet est requis' });

    const tx = await TransactionWave.findOne({ _id: txId, statut: 'en_attente' });
    if (!tx) return res.status(404).json({ error: 'Transaction non trouvée ou déjà traitée' });

    await TransactionWave.updateOne(
      { _id: txId },
      { statut: 'rejete', validee_par_admin_id: adminId, motif_rejet: motif_rejet.trim(), date_validation: new Date(), updated_at: new Date() }
    );

    res.json({ ok: true, message: 'Transaction rejetée avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/wave-transactions/stats
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const all = await TransactionWave.find().select('statut montant');
    const total = all.length;
    const en_attente = all.filter(t => t.statut === 'en_attente').length;
    const validees = all.filter(t => t.statut === 'valide').length;
    const rejetees = all.filter(t => t.statut === 'rejete').length;
    const validatedAmounts = all.filter(t => t.statut === 'valide').map(t => parseFloat(String(t.montant)) || 0);
    const revenus_total = validatedAmounts.reduce((s, v) => s + v, 0);
    const montant_moyen = validatedAmounts.length > 0 ? revenus_total / validatedAmounts.length : 0;

    res.json({ total_transactions: total, en_attente, validees, rejetees, revenus_total, montant_moyen: parseFloat(montant_moyen.toFixed(0)) });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
