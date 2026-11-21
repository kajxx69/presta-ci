import express, { Request, Response } from 'express';
import { PaiementEnLigne, Plan, Prestataire, User, getNextId } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { logger } from '../logger.js';
import { InAppNotificationService } from '../services/in-app-notifications.js';
import {
  createPayment, getPayment, isGeniusPayConfigured, verifyWebhookSignature, MONTANT_MINIMUM, montantPour,
} from '../utils/geniuspay.js';

// Paiement d'abonnement en ligne (GeniusPay) — activation automatique, sans
// validation admin, car le statut est TOUJOURS re-vérifié auprès de l'API
// GeniusPay avec notre clé secrète avant d'activer quoi que ce soit.
// Indépendant du flux Wave manuel (wave-transactions.ts), qui reste inchangé.

const router = express.Router();

export const DUREES_AUTORISEES = [30, 90, 180, 365];
const DAY_MS = 86400000;

function frontendBaseUrl(): string {
  const explicit = process.env.FRONTEND_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const first = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  return first.replace(/\/+$/, '');
}

/**
 * Re-vérifie un paiement auprès de GeniusPay et active l'abonnement s'il est payé.
 * Idempotent et sûr en concurrence (webhook + retour navigateur + boucle de fond) :
 * seul l'appel qui fait passer le statut de en_attente à paye active l'abonnement.
 */
export async function synchroniserPaiement(paiementId: number): Promise<any> {
  const paiement = await PaiementEnLigne.findById(paiementId);
  if (!paiement || paiement.statut !== 'en_attente') return paiement;

  const distant = await getPayment(paiement.reference);
  const statut = String(distant.status || '').toLowerCase();

  if (statut === 'completed' || statut === 'paid' || statut === 'success') {
    // Garde-fous : bon montant, bonne devise
    const montantRecu = Number(distant.amount);
    if (!(montantRecu >= paiement.montant) || (distant.currency && distant.currency !== 'XOF')) {
      logger.error(`[paiements] Montant/devise incohérents pour ${paiement.reference}: reçu ${montantRecu} ${distant.currency}, attendu ${paiement.montant} XOF`);
      return paiement;
    }

    const claimed = await PaiementEnLigne.findOneAndUpdate(
      { _id: paiement._id, statut: 'en_attente' },
      {
        statut: 'paye',
        paye_at: distant.completed_at ? new Date(distant.completed_at) : new Date(),
        moyen_paiement: distant.payment_method || distant.payment_provider || null,
        environnement: distant.environment || null,
        frais: typeof distant.fees === 'number' ? distant.fees : undefined,
        montant_net: typeof distant.net_amount === 'number' ? distant.net_amount : undefined,
        updated_at: new Date(),
      },
      { new: true }
    );
    if (!claimed) return PaiementEnLigne.findById(paiement._id); // déjà traité par un autre appel

    const prestataire = await Prestataire.findById(claimed.prestataire_id);
    if (!prestataire) return claimed;

    // Renouvellement du même plan encore actif : on prolonge à partir de la date
    // de fin actuelle (le prestataire ne perd aucun jour payé). Sinon : à partir de maintenant.
    const now = Date.now();
    const finActuelle = prestataire.abonnement_expires_at ? new Date(prestataire.abonnement_expires_at).getTime() : 0;
    const base = prestataire.plan_actuel_id === claimed.plan_id && finActuelle > now ? finActuelle : now;
    const expires = new Date(base + claimed.duree_abonnement_jours * DAY_MS);

    await Promise.all([
      Prestataire.updateOne({ _id: prestataire._id }, { plan_actuel_id: claimed.plan_id, abonnement_expires_at: expires, updated_at: new Date() }),
      PaiementEnLigne.updateOne({ _id: claimed._id }, { abonnement_expires_at: expires }),
    ]);

    const plan = await Plan.findById(claimed.plan_id).select('nom');
    await InAppNotificationService.createCustom(
      prestataire.user_id,
      'Abonnement activé 🎉',
      `Votre paiement de ${claimed.montant.toLocaleString('fr-FR')} FCFA a été reçu. Plan ${plan?.nom || ''} actif jusqu'au ${expires.toLocaleDateString('fr-FR')}.`,
      'success',
      { paiement_id: claimed._id, plan_id: claimed.plan_id }
    );
    logger.info(`[paiements] ${claimed.reference} payé — prestataire ${prestataire._id} → plan ${claimed.plan_id} jusqu'au ${expires.toISOString()}`);
    return PaiementEnLigne.findById(claimed._id);
  }

  if (statut === 'failed' || statut === 'cancelled') {
    return PaiementEnLigne.findOneAndUpdate({ _id: paiement._id, statut: 'en_attente' }, { statut: 'echoue', updated_at: new Date() }, { new: true });
  }
  if (statut === 'expired') {
    return PaiementEnLigne.findOneAndUpdate({ _id: paiement._id, statut: 'en_attente' }, { statut: 'expire', updated_at: new Date() }, { new: true });
  }
  return paiement; // pending / processing
}

// GET /api/paiements/config — le frontend n'affiche le bouton que si GeniusPay est configuré
router.get('/config', (_req: Request, res: Response) => {
  res.json({ enabled: isGeniusPayConfigured(), durees: DUREES_AUTORISEES });
});

// POST /api/paiements/checkout — crée un paiement et renvoie l'URL de la page GeniusPay
router.post('/checkout', requireAuth, async (req: any, res: Response) => {
  try {
    if (!isGeniusPayConfigured()) return res.status(503).json({ error: 'Le paiement en ligne est momentanément indisponible.' });

    const prestataire = await Prestataire.findOne({ user_id: req.userId });
    if (!prestataire) return res.status(403).json({ error: "Votre compte n'est pas configuré comme prestataire." });

    const plan_id = Number(req.body?.plan_id);
    const duree = Number(req.body?.duree_abonnement_jours ?? 30);
    if (!DUREES_AUTORISEES.includes(duree)) return res.status(400).json({ error: 'Durée invalide' });

    const plan = await Plan.findOne({ _id: plan_id, is_active: true });
    if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });

    const montant = montantPour(plan, duree);
    if (montant < MONTANT_MINIMUM) return res.status(400).json({ error: 'Ce plan ne nécessite pas de paiement.' });

    // Anti-abus : pas plus de 5 tentatives en cours sur la dernière heure
    const recentes = await PaiementEnLigne.countDocuments({
      prestataire_id: prestataire._id, statut: 'en_attente', created_at: { $gte: new Date(Date.now() - 3600000) },
    });
    if (recentes >= 5) return res.status(429).json({ error: 'Trop de tentatives de paiement. Réessayez dans quelques minutes.' });

    const user = await User.findById(req.userId).select('nom prenom email telephone');
    const paiementId = await getNextId('paiements_en_ligne');
    const retour = `${frontendBaseUrl()}/app/plans?paiement=${paiementId}`;

    const distant = await createPayment({
      amount: montant,
      description: `PrestaCI — Plan ${plan.nom} (${duree} jours)`.slice(0, 500),
      customer: {
        name: [user?.prenom, user?.nom].filter(Boolean).join(' ') || undefined,
        email: user?.email || undefined,
        phone: user?.telephone || undefined,
        country: 'CI',
      },
      success_url: retour,
      error_url: `${retour}&echec=1`,
      metadata: { paiement_id: paiementId, prestataire_id: prestataire._id as number, plan_id: plan._id as number, duree_jours: duree },
    });

    const checkout_url = distant.checkout_url || distant.payment_url;
    if (!distant.reference || !checkout_url) throw new Error('Réponse GeniusPay incomplète (reference/checkout_url manquants)');

    await PaiementEnLigne.create({
      _id: paiementId,
      prestataire_id: prestataire._id as number,
      plan_id: plan._id as number,
      reference: distant.reference,
      montant,
      devise: 'XOF',
      duree_abonnement_jours: duree,
      checkout_url,
      environnement: distant.environment || undefined,
    });

    res.json({ ok: true, paiement_id: paiementId, checkout_url });
  } catch (e: any) {
    if (String(e?.message || '').startsWith('GeniusPay') || e?.name === 'AbortError') {
      logger.error(`[paiements] checkout: ${e.message}`);
      return res.status(502).json({ error: "Le service de paiement n'a pas pu démarrer le paiement. Réessayez dans un instant." });
    }
    serverError(res, e, 'paiements/checkout');
  }
});

// GET /api/paiements/:id/verifier — appelé au retour de la page de paiement
router.get('/:id(\\d+)/verifier', requireAuth, async (req: any, res: Response) => {
  try {
    const prestataire = await Prestataire.findOne({ user_id: req.userId }).select('_id');
    const paiement = await PaiementEnLigne.findOne({ _id: Number(req.params.id), prestataire_id: prestataire?._id });
    if (!paiement) return res.status(404).json({ error: 'Paiement introuvable' });

    let a_jour: any = paiement;
    try {
      a_jour = (await synchroniserPaiement(paiement._id as number)) || paiement;
    } catch (e: any) {
      logger.error(`[paiements] vérification ${paiement.reference}: ${e.message}`);
    }
    const plan = await Plan.findById(a_jour.plan_id).select('nom');
    res.json({ paiement: { ...a_jour.toJSON(), plan_nom: plan?.nom || null } });
  } catch (e: any) {
    serverError(res, e, 'paiements/verifier');
  }
});

// GET /api/paiements/mes-paiements
router.get('/mes-paiements', requireAuth, async (req: any, res: Response) => {
  try {
    const prestataire = await Prestataire.findOne({ user_id: req.userId }).select('_id');
    if (!prestataire) return res.json([]);
    const paiements = await PaiementEnLigne.find({ prestataire_id: prestataire._id, statut: { $ne: 'en_attente' } })
      .sort({ created_at: -1 }).limit(50);
    const plans = await Plan.find({ _id: { $in: [...new Set(paiements.map(p => p.plan_id))] } }).select('nom');
    const nomPlan = new Map(plans.map(p => [p._id as number, p.nom]));
    res.json(paiements.map(p => ({ ...p.toJSON(), plan_nom: nomPlan.get(p.plan_id) || null })));
  } catch (e: any) {
    serverError(res, e, 'paiements/mes-paiements');
  }
});

// GET /api/paiements/admin — suivi des paiements en ligne (admin)
router.get('/admin', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20')) || 20));
    const filter: any = {};
    if (req.query.statut && req.query.statut !== 'all') filter.statut = req.query.statut;

    const [paiements, total, agregats] = await Promise.all([
      PaiementEnLigne.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit),
      PaiementEnLigne.countDocuments(filter),
      PaiementEnLigne.aggregate([{ $group: { _id: '$statut', count: { $sum: 1 }, montant: { $sum: '$montant' }, net: { $sum: { $ifNull: ['$montant_net', '$montant'] } } } }]),
    ]);

    const prestataires = await Prestataire.find({ _id: { $in: [...new Set(paiements.map(p => p.prestataire_id))] } }).select('user_id nom_commercial');
    const users = await User.find({ _id: { $in: prestataires.map(p => p.user_id) } }).select('nom prenom email telephone');
    const plans = await Plan.find({ _id: { $in: [...new Set(paiements.map(p => p.plan_id))] } }).select('nom');
    const prestById = new Map(prestataires.map(p => [p._id as number, p]));
    const userById = new Map(users.map(u => [u._id as number, u]));
    const planById = new Map(plans.map(p => [p._id as number, p]));

    const stats: Record<string, { count: number; montant: number; net: number }> = {};
    for (const a of agregats) stats[a._id] = { count: a.count, montant: a.montant, net: a.net };

    res.json({
      paiements: paiements.map(p => {
        const prest = prestById.get(p.prestataire_id);
        const u = prest ? userById.get(prest.user_id) : null;
        return {
          ...p.toJSON(),
          prestataire_nom: prest?.nom_commercial || [u?.prenom, u?.nom].filter(Boolean).join(' ') || null,
          prestataire_email: u?.email || null,
          prestataire_telephone: u?.telephone || null,
          plan_nom: planById.get(p.plan_id)?.nom || null,
        };
      }),
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    serverError(res, e, 'paiements/admin');
  }
});

/**
 * Webhook GeniusPay — monté dans index.ts AVANT express.json() avec un corps brut,
 * pour pouvoir vérifier la signature sur les octets exacts reçus.
 */
export async function geniusPayWebhookHandler(req: Request, res: Response) {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!verifyWebhookSignature(raw, req.header('x-webhook-timestamp'), req.header('x-webhook-signature'))) {
    logger.warn('[paiements] webhook GeniusPay : signature invalide');
    return res.status(401).json({ error: 'Signature invalide' });
  }
  let payload: any = null;
  try { payload = JSON.parse(raw); } catch { return res.status(400).json({ error: 'JSON invalide' }); }

  const reference = payload?.data?.reference;
  const metaId = Number(payload?.data?.metadata?.paiement_id);
  try {
    const paiement = reference
      ? await PaiementEnLigne.findOne({ reference })
      : Number.isFinite(metaId) ? await PaiementEnLigne.findById(metaId) : null;
    if (paiement) await synchroniserPaiement(paiement._id as number);
  } catch (e: any) {
    // On répond quand même 200 : la boucle de fond retentera la synchronisation
    logger.error(`[paiements] webhook ${reference}: ${e.message}`);
  }
  res.json({ received: true });
}

/**
 * Filet de sécurité : si le prestataire ferme son navigateur après avoir payé
 * et que le webhook n'arrive pas, on re-vérifie les paiements en attente
 * récents toutes les 3 minutes.
 */
export function startPaymentSyncLoop() {
  if (!isGeniusPayConfigured()) return;
  const tick = async () => {
    try {
      const enAttente = await PaiementEnLigne.find({
        statut: 'en_attente', created_at: { $gte: new Date(Date.now() - 26 * 3600000) },
      }).select('_id').limit(50);
      for (const p of enAttente) {
        try { await synchroniserPaiement(p._id as number); } catch { /* retenté au prochain tour */ }
      }
      // Au-delà de 26 h, le lien GeniusPay (valable 24 h) est mort
      await PaiementEnLigne.updateMany(
        { statut: 'en_attente', created_at: { $lt: new Date(Date.now() - 26 * 3600000) } },
        { statut: 'expire', updated_at: new Date() }
      );
    } catch (e: any) {
      logger.error(`[paiements] boucle de synchronisation: ${e.message}`);
    }
  };
  setInterval(tick, 3 * 60 * 1000);
}

export default router;
