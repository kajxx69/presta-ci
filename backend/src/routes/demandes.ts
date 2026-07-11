import { Router, Request, Response } from 'express';
import { Demande, Category, SubCategory, Service, Prestataire, User, Conversation, Message } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { InAppNotificationService } from '../services/in-app-notifications.js';

const router = Router();
router.use(requireAuth);

/** Durée de vie d'une demande ouverte */
const DUREE_JOURS = 7;
/** Une demande cesse d'accepter des réponses au-delà (assez pour choisir, évite le spam) */
const MAX_REPONSES = 15;
/** Un client ne peut pas avoir plus de N demandes ouvertes en même temps */
const MAX_DEMANDES_OUVERTES = 3;
/** Nombre maximum de prestataires notifiés à la création */
const MAX_NOTIFICATIONS = 50;

/** Prestataires actifs dans une catégorie (via leurs services), même ville en premier */
async function findMatchingPrestataires(categorieId: number, ville?: string | null): Promise<{ userIds: number[]; total: number }> {
  const subCats = await SubCategory.find({ categorie_id: categorieId }).select('_id');
  const subCatIds = subCats.map(s => s._id as number);
  if (subCatIds.length === 0) return { userIds: [], total: 0 };

  const prestataireIds: number[] = await Service.distinct('prestataire_id', {
    sous_categorie_id: { $in: subCatIds },
    is_active: true,
  });
  if (prestataireIds.length === 0) return { userIds: [], total: 0 };

  const prestataires = await Prestataire.find({ _id: { $in: prestataireIds } }).select('user_id ville');

  // Même ville d'abord, mais on notifie tout le monde (petit marché : mieux vaut
  // une réponse d'une ville voisine que pas de réponse du tout)
  const villeNorm = (ville || '').trim().toLowerCase();
  const sorted = [...prestataires].sort((a, b) => {
    const aMatch = villeNorm && (a.ville || '').trim().toLowerCase() === villeNorm ? 0 : 1;
    const bMatch = villeNorm && (b.ville || '').trim().toLowerCase() === villeNorm ? 0 : 1;
    return aMatch - bMatch;
  });

  return {
    userIds: sorted.slice(0, MAX_NOTIFICATIONS).map(p => p.user_id),
    total: prestataires.length,
  };
}

// POST /api/demandes — publier un besoin (tout utilisateur connecté)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const titre = String(req.body?.titre || '').trim();
    const description = String(req.body?.description || '').trim();
    const categorie_id = Number(req.body?.categorie_id);
    const sous_categorie_id = req.body?.sous_categorie_id ? Number(req.body.sous_categorie_id) : null;
    const ville = req.body?.ville ? String(req.body.ville).trim().slice(0, 80) : null;
    const budgetRaw = req.body?.budget_max;
    const date_souhaitee = req.body?.date_souhaitee ? String(req.body.date_souhaitee).slice(0, 10) : null;

    if (titre.length < 3 || titre.length > 120) return res.status(400).json({ error: 'Le titre doit faire entre 3 et 120 caractères' });
    if (description.length < 10 || description.length > 2000) return res.status(400).json({ error: 'Décrivez votre besoin en au moins 10 caractères' });
    if (!Number.isInteger(categorie_id) || categorie_id <= 0) return res.status(400).json({ error: 'Catégorie requise' });

    let budget_max: number | null = null;
    if (budgetRaw !== undefined && budgetRaw !== null && budgetRaw !== '') {
      budget_max = Number(budgetRaw);
      if (!Number.isFinite(budget_max) || budget_max <= 0 || budget_max > 100_000_000) {
        return res.status(400).json({ error: 'Budget invalide' });
      }
      budget_max = Math.round(budget_max);
    }

    const categorie = await Category.findOne({ _id: categorie_id, is_active: true });
    if (!categorie) return res.status(400).json({ error: 'Catégorie introuvable' });

    if (sous_categorie_id !== null) {
      const sousCat = await SubCategory.findOne({ _id: sous_categorie_id, categorie_id });
      if (!sousCat) return res.status(400).json({ error: 'Sous-catégorie invalide pour cette catégorie' });
    }

    const ouvertes = await Demande.countDocuments({ client_id: userId, statut: 'ouverte', expires_at: { $gt: new Date() } });
    if (ouvertes >= MAX_DEMANDES_OUVERTES) {
      return res.status(400).json({ error: `Vous avez déjà ${MAX_DEMANDES_OUVERTES} demandes en cours. Clôturez-en une avant d'en publier une nouvelle.` });
    }

    const demande = await Demande.create({
      client_id: userId,
      titre, description, categorie_id, sous_categorie_id, ville, budget_max, date_souhaitee,
      expires_at: new Date(Date.now() + DUREE_JOURS * 24 * 3600 * 1000),
    });

    // Notifier les prestataires de la catégorie (best-effort, ne bloque pas la réponse)
    let notifies = 0;
    try {
      const { userIds } = await findMatchingPrestataires(categorie_id, ville);
      const cible = userIds.filter(uid => uid !== userId);
      notifies = cible.length;
      await Promise.allSettled(cible.map(uid =>
        InAppNotificationService.createCustom(
          uid,
          '💼 Nouvelle opportunité près de chez vous',
          `Un client recherche : « ${titre} »${ville ? ` à ${ville}` : ''}. Soyez le premier à répondre !`,
          'info',
          { demande_id: demande._id, kind: 'demande_express' }
        )
      ));
    } catch { /* la demande est créée, les notifs sont un bonus */ }

    res.status(201).json({ id: demande._id, prestataires_notifies: notifies });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/demandes/mes — mes demandes avec leurs réponses enrichies
router.get('/mes', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const demandes = await Demande.find({ client_id: userId }).sort({ created_at: -1 }).limit(30);

    const prestataireIds = [...new Set(demandes.flatMap(d => (d.reponses || []).map(r => r.prestataire_id)))];
    const categorieIds = [...new Set(demandes.map(d => d.categorie_id))];
    const [prestataires, categories] = await Promise.all([
      Prestataire.find({ _id: { $in: prestataireIds } }).select('nom_commercial note_moyenne nombre_avis is_verified ville'),
      Category.find({ _id: { $in: categorieIds } }).select('nom icone'),
    ]);
    const prestById = new Map(prestataires.map(p => [p._id as number, p]));
    const catById = new Map(categories.map(c => [c._id as number, c]));

    const now = new Date();
    res.json(demandes.map(d => {
      const cat = catById.get(d.categorie_id);
      const expiree = d.statut === 'ouverte' && d.expires_at <= now;
      return {
        id: d._id,
        titre: d.titre,
        description: d.description,
        categorie_id: d.categorie_id,
        categorie_nom: cat?.nom || null,
        categorie_icone: cat?.icone || null,
        ville: d.ville,
        budget_max: d.budget_max,
        date_souhaitee: d.date_souhaitee,
        statut: expiree ? 'expiree' : d.statut,
        expires_at: d.expires_at,
        created_at: d.created_at,
        reponses: (d.reponses || []).map(r => {
          const p = prestById.get(r.prestataire_id);
          return {
            prestataire_id: r.prestataire_id,
            conversation_id: r.conversation_id,
            message: r.message,
            created_at: r.created_at,
            prestataire_nom: p?.nom_commercial || 'Prestataire',
            prestataire_note: p?.note_moyenne ?? 0,
            prestataire_nombre_avis: p?.nombre_avis ?? 0,
            prestataire_verifie: p?.is_verified ?? false,
            prestataire_ville: p?.ville || null,
          };
        }),
      };
    }));
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/demandes/opportunites — demandes ouvertes qui matchent mes catégories (prestataire)
router.get('/opportunites', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const prestataire = await Prestataire.findOne({ user_id: userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire requis' });
    const prestataireId = prestataire._id as number;

    // Catégories du prestataire, déduites de ses services actifs
    const sousCatIds: number[] = await Service.distinct('sous_categorie_id', { prestataire_id: prestataireId, is_active: true });
    if (sousCatIds.length === 0) return res.json([]);
    const catIds: number[] = await SubCategory.distinct('categorie_id', { _id: { $in: sousCatIds } });

    const demandes = await Demande.find({
      statut: 'ouverte',
      expires_at: { $gt: new Date() },
      categorie_id: { $in: catIds },
      client_id: { $ne: userId }, // pas ses propres demandes
    }).sort({ created_at: -1 }).limit(50);

    const clientIds = [...new Set(demandes.map(d => d.client_id))];
    const categorieIds = [...new Set(demandes.map(d => d.categorie_id))];
    const [clients, categories] = await Promise.all([
      User.find({ _id: { $in: clientIds } }).select('prenom nom'),
      Category.find({ _id: { $in: categorieIds } }).select('nom icone'),
    ]);
    const clientById = new Map(clients.map(c => [c._id as number, c]));
    const catById = new Map(categories.map(c => [c._id as number, c]));

    const villeNorm = (prestataire.ville || '').trim().toLowerCase();
    const results = demandes.map(d => {
      const client = clientById.get(d.client_id);
      const cat = catById.get(d.categorie_id);
      const dejaRepondu = (d.reponses || []).some(r => r.prestataire_id === prestataireId);
      return {
        id: d._id,
        titre: d.titre,
        description: d.description,
        categorie_nom: cat?.nom || null,
        categorie_icone: cat?.icone || null,
        ville: d.ville,
        budget_max: d.budget_max,
        date_souhaitee: d.date_souhaitee,
        created_at: d.created_at,
        expires_at: d.expires_at,
        // Prénom + initiale : assez pour humaniser, pas assez pour contourner la plateforme
        client_nom: client ? `${client.prenom || ''} ${(client.nom || '').charAt(0)}.`.trim() : 'Client',
        nombre_reponses: (d.reponses || []).length,
        deja_repondu: dejaRepondu,
        complete: (d.reponses || []).length >= MAX_REPONSES,
        meme_ville: !!villeNorm && (d.ville || '').trim().toLowerCase() === villeNorm,
      };
    });

    // Même ville d'abord, puis les plus récentes
    results.sort((a, b) => Number(b.meme_ville) - Number(a.meme_ville) || +new Date(b.created_at as any) - +new Date(a.created_at as any));
    res.json(results);
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/demandes/:id/repondre — un prestataire répond : ouvre une conversation avec le client
router.post('/:id/repondre', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const demandeId = Number(req.params.id);
    const messageTexte = String(req.body?.message || '').trim().slice(0, 1000);

    const prestataire = await Prestataire.findOne({ user_id: userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire requis' });
    const prestataireId = prestataire._id as number;

    const demande = await Demande.findById(demandeId);
    if (!demande) return res.status(404).json({ error: 'Demande introuvable' });
    if (demande.client_id === userId) return res.status(400).json({ error: 'Vous ne pouvez pas répondre à votre propre demande' });
    if (demande.statut !== 'ouverte' || demande.expires_at <= new Date()) {
      return res.status(400).json({ error: 'Cette demande n\'est plus ouverte' });
    }
    if ((demande.reponses || []).some(r => r.prestataire_id === prestataireId)) {
      return res.status(400).json({ error: 'Vous avez déjà répondu à cette demande' });
    }
    if ((demande.reponses || []).length >= MAX_REPONSES) {
      return res.status(400).json({ error: 'Cette demande a déjà reçu le maximum de réponses' });
    }

    // Conversation existante ou nouvelle avec ce client
    let conversation = await Conversation.findOne({ client_id: demande.client_id, prestataire_id: prestataireId });
    if (!conversation) {
      conversation = await Conversation.create({ client_id: demande.client_id, prestataire_id: prestataireId });
    }

    const intro = `💼 Réponse à votre demande « ${demande.titre} »`;
    const contenu = messageTexte ? `${intro}\n\n${messageTexte}` : `${intro}\n\nBonjour, je suis disponible pour votre demande. Parlons-en !`;
    await Message.create({
      conversation_id: conversation._id as number,
      sender_user_id: userId,
      contenu,
      type: 'text',
    });
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        dernier_message: contenu.slice(0, 120),
        dernier_message_at: new Date(),
        updated_at: new Date(),
        $inc: { non_lus_client: 1 },
      }
    );

    // Enregistrement atomique de la réponse : re-vérifie unicité + capacité dans le filtre
    // (deux prestataires simultanés ne peuvent pas dépasser MAX_REPONSES ni se dupliquer)
    const updated = await Demande.findOneAndUpdate(
      {
        _id: demandeId,
        statut: 'ouverte',
        'reponses.prestataire_id': { $ne: prestataireId },
        [`reponses.${MAX_REPONSES - 1}`]: { $exists: false },
      },
      {
        $push: { reponses: { prestataire_id: prestataireId, conversation_id: conversation._id as number, message: messageTexte, created_at: new Date() } },
        $set: { updated_at: new Date() },
      },
      { new: true }
    );
    if (!updated) return res.status(400).json({ error: 'Cette demande n\'accepte plus de réponses' });

    try {
      await InAppNotificationService.createCustom(
        demande.client_id,
        '🎉 Un prestataire a répondu à votre demande',
        `${prestataire.nom_commercial || 'Un prestataire'} vous a répondu pour « ${demande.titre} ». Ouvrez la conversation !`,
        'success',
        { demande_id: demandeId, conversation_id: conversation._id, kind: 'demande_reponse' }
      );
    } catch { /* best-effort */ }

    res.status(201).json({ ok: true, conversation_id: conversation._id });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/demandes/:id/cloturer — le client clôture sa demande (pourvue ou annulée)
router.put('/:id/cloturer', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const demandeId = Number(req.params.id);
    const statut = req.body?.statut === 'pourvue' ? 'pourvue' : 'annulee';

    const demande = await Demande.findOne({ _id: demandeId, client_id: userId });
    if (!demande) return res.status(404).json({ error: 'Demande introuvable' });
    if (demande.statut !== 'ouverte') return res.status(400).json({ error: 'Cette demande est déjà clôturée' });

    await Demande.updateOne({ _id: demandeId }, { statut, updated_at: new Date() });
    res.json({ ok: true, statut });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
