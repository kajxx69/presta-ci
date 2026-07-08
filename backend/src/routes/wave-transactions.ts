import express from 'express';
import { TransactionWave, Prestataire, Plan, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/wave-transactions
router.post('/', requireAuth, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const prestataire = await Prestataire.findOne({ user_id });
    if (!prestataire) return res.status(403).json({ error: "Votre compte n'est pas configuré comme prestataire." });

    const prestataire_id = prestataire._id as number;
    const { plan_id, transaction_id_wave, montant, devise = 'FCFA', duree_abonnement_jours = 30 } = req.body;

    if (!plan_id || !transaction_id_wave || !montant) {
      return res.status(400).json({ error: 'Plan, ID de transaction Wave et montant requis' });
    }

    const plan = await Plan.findById(plan_id);
    if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });

    const expectedPrice = Math.round(plan.prix * (duree_abonnement_jours / 30));
    if (parseFloat(montant) !== expectedPrice) {
      return res.status(400).json({ error: `Le montant doit être de ${expectedPrice} ${devise} pour ${duree_abonnement_jours} jours` });
    }

    const existing = await TransactionWave.findOne({ prestataire_id, statut: 'en_attente' });
    if (existing) return res.status(400).json({ error: "Vous avez déjà une demande d'abonnement en attente de validation" });

    const tx = await TransactionWave.create({
      prestataire_id, plan_id, transaction_id_wave, montant,
      devise, duree_abonnement_jours,
      statut: 'en_attente',
      date_paiement: new Date()
    });

    res.json({ ok: true, message: "Demande d'abonnement soumise avec succès. En attente de validation.", transaction_id: tx._id });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/wave-transactions/my-transactions
router.get('/my-transactions', requireAuth, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const prestataire = await Prestataire.findOne({ user_id });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire non trouvé.' });

    const transactions = await TransactionWave.find({ prestataire_id: prestataire._id }).sort({ created_at: -1 });

    // Enrichissement par requêtes groupées (évite N+1)
    const [plans, admins] = await Promise.all([
      Plan.find({ _id: { $in: [...new Set(transactions.map(tx => tx.plan_id))] } }),
      User.find({ _id: { $in: [...new Set(transactions.map(tx => tx.validee_par_admin_id).filter((x): x is number => typeof x === 'number'))] } }).select('nom prenom'),
    ]);
    const planById = new Map(plans.map(p => [p._id as number, p]));
    const adminById = new Map(admins.map(a => [a._id as number, a]));

    const results = transactions.map((tx) => {
      const plan = planById.get(tx.plan_id) || null;
      const admin = tx.validee_par_admin_id ? adminById.get(tx.validee_par_admin_id) || null : null;
      return {
        ...tx.toJSON(),
        plan_nom: plan?.nom || null,
        plan_prix: plan?.prix || null,
        admin_nom: admin?.nom || null,
        admin_prenom: admin?.prenom || null
      };
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/wave-transactions/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const prestataire = await Prestataire.findOne({ user_id });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire non trouvé.' });

    const tx = await TransactionWave.findOne({ prestataire_id: prestataire._id }).sort({ created_at: -1 });
    if (!tx) return res.json({ hasTransaction: false });

    const plan = await Plan.findById(tx.plan_id);
    res.json({ hasTransaction: true, transaction: { ...tx.toJSON(), plan_nom: plan?.nom || null } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
