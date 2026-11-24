import { Router, Request, Response } from 'express';
import { Demande, Category, SubCategory, Service, Prestataire, User, Conversation, Message, Modele, OffreModele, Reservation, StatutReservation, HistoriqueReservation } from '../models/index.js';
import { hasSlotConflict } from '../utils/availability.js';
import { categorieModelePour } from '../services/modeles-sync.js';
import { communeParNom, positionPrestataire, distanceKm } from '../services/communes.js';
import {
  montantValide, ouverte, negoDe, prixCliente, offreProEnAttente, derniereOffrePro, derniereOffre, ongletPro, etatCliente, ajouterOffre, PRIX_MIN, PRIX_MAX,
} from '../services/negociation.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { InAppNotificationService } from '../services/in-app-notifications.js';
import { isValidDayString, isPastDay } from '../utils/validation.js';
import { saveDataUri } from '../utils/uploads.js';
import { lienInspirationValide } from '../utils/liens.js';

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
/** Avantage des plans payants : fenêtre d'accès anticipé pour répondre avant le plan gratuit */
const PRIORITE_MINUTES = 5;

/** true si le prestataire a un abonnement payant actif (pas expiré, plan_actuel_id != 1 = Gratuit) */
function hasActivePaidPlan(prestataire: { plan_actuel_id?: number; abonnement_expires_at?: Date | null }): boolean {
  if (!prestataire.plan_actuel_id || prestataire.plan_actuel_id === 1) return false;
  if (!prestataire.abonnement_expires_at) return false;
  return new Date(prestataire.abonnement_expires_at) > new Date();
}

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
    let description = String(req.body?.description || '').trim();
    // « J'ai mon modèle » : photo de référence et/ou lien Pinterest / Instagram / TikTok
    const photoBrute = req.body?.photo;
    if (photoBrute !== undefined && photoBrute !== null && photoBrute !== '' && (typeof photoBrute !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(photoBrute))) {
      return res.status(400).json({ error: 'Photo invalide (JPEG, PNG ou WebP attendu)' });
    }
    const lien_inspiration = req.body?.lien_inspiration ? lienInspirationValide(req.body.lien_inspiration) : null;
    if (req.body?.lien_inspiration && !lien_inspiration) {
      return res.status(400).json({ error: 'Lien non accepté : collez un lien Pinterest, Instagram ou TikTok' });
    }
    const avecModele = !!photoBrute || !!lien_inspiration;
    if (avecModele && description.length < 10) description = description || 'Je voudrais ce modèle (voir la photo).';
    const categorie_id = Number(req.body?.categorie_id);
    const sous_categorie_id = req.body?.sous_categorie_id ? Number(req.body.sous_categorie_id) : null;
    const ville = req.body?.ville ? String(req.body.ville).trim().slice(0, 80) : null;
    const budgetRaw = req.body?.budget_max;
    const date_souhaitee = req.body?.date_souhaitee ? String(req.body.date_souhaitee).slice(0, 10) : null;

    if (titre.length < 3 || titre.length > 120) return res.status(400).json({ error: 'Le titre doit faire entre 3 et 120 caractères' });
    if ((!avecModele && description.length < 10) || description.length > 2000) return res.status(400).json({ error: 'Décrivez votre besoin en au moins 10 caractères' });
    if (!Number.isInteger(categorie_id) || categorie_id <= 0) return res.status(400).json({ error: 'Catégorie requise' });

    let budget_max: number | null = null;
    if (budgetRaw !== undefined && budgetRaw !== null && budgetRaw !== '') {
      budget_max = Number(budgetRaw);
      if (!Number.isFinite(budget_max) || budget_max <= 0 || budget_max > 100_000_000) {
        return res.status(400).json({ error: 'Budget invalide' });
      }
      budget_max = Math.round(budget_max);
    }

    if (date_souhaitee !== null) {
      if (!isValidDayString(date_souhaitee)) {
        return res.status(400).json({ error: 'Date souhaitée invalide (format attendu : AAAA-MM-JJ)' });
      }
      if (isPastDay(date_souhaitee)) {
        return res.status(400).json({ error: 'La date souhaitée ne peut pas être dans le passé' });
      }
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

    const photo = photoBrute ? await saveDataUri(photoBrute) : null; // 2 Mo max, validé par saveDataUri
    const demande = await Demande.create({
      client_id: userId,
      titre, description, categorie_id, sous_categorie_id, ville, budget_max, date_souhaitee, photo, lien_inspiration,
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
          `${photo ? '📸 Une cliente a envoyé la photo de son modèle' : 'Un client recherche'} : « ${titre} »${ville ? ` à ${ville}` : ''}. Soyez le premier à répondre avec votre prix !`,
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
    const categorieIds = [...new Set(demandes.map(d => d.categorie_id).filter((c): c is number => typeof c === "number"))];
    const [prestataires, categories] = await Promise.all([
      Prestataire.find({ _id: { $in: prestataireIds } }).select('nom_commercial note_moyenne nombre_avis is_verified ville'),
      Category.find({ _id: { $in: categorieIds } }).select('nom icone'),
    ]);
    const prestById = new Map(prestataires.map(p => [p._id as number, p]));
    const catById = new Map(categories.map(c => [c._id as number, c]));

    const now = new Date();
    res.json(demandes.map(d => {
      const cat = d.categorie_id ? catById.get(d.categorie_id) : undefined;
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
        photo: d.photo || null,
        lien_inspiration: d.lien_inspiration || null,
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
    const isPrioritaire = hasActivePaidPlan(prestataire);

    // Catégories du prestataire, déduites de ses services actifs
    const sousCatIds: number[] = await Service.distinct('sous_categorie_id', { prestataire_id: prestataireId, is_active: true });
    if (sousCatIds.length === 0) return res.json([]);
    const catIds: number[] = await SubCategory.distinct('categorie_id', { _id: { $in: sousCatIds } });

    // Avantage plans payants : les demandes toutes fraîches (< PRIORITE_MINUTES)
    // ne sont visibles que par les abonnés actifs — le plan gratuit les voit
    // dès que la fenêtre expire, jamais avant.
    const query: any = {
      statut: 'ouverte',
      expires_at: { $gt: new Date() },
      categorie_id: { $in: catIds },
      client_id: { $ne: userId }, // pas ses propres demandes
    };
    if (!isPrioritaire) {
      query.created_at = { $lte: new Date(Date.now() - PRIORITE_MINUTES * 60000) };
    }

    const demandes = await Demande.find(query).sort({ created_at: -1 }).limit(50);

    const clientIds = [...new Set(demandes.map(d => d.client_id))];
    const categorieIds = [...new Set(demandes.map(d => d.categorie_id).filter((c): c is number => typeof c === "number"))];
    const [clients, categories] = await Promise.all([
      User.find({ _id: { $in: clientIds } }).select('prenom nom'),
      Category.find({ _id: { $in: categorieIds } }).select('nom icone'),
    ]);
    const clientById = new Map(clients.map(c => [c._id as number, c]));
    const catById = new Map(categories.map(c => [c._id as number, c]));

    const villeNorm = (prestataire.ville || '').trim().toLowerCase();
    const results = demandes.map(d => {
      const client = clientById.get(d.client_id);
      const cat = d.categorie_id ? catById.get(d.categorie_id) : undefined;
      const dejaRepondu = (d.reponses || []).some(r => r.prestataire_id === prestataireId);
      const priorityWindowEnds = new Date(d.created_at.getTime() + PRIORITE_MINUTES * 60000);
      return {
        id: d._id,
        titre: d.titre,
        description: d.description,
        categorie_nom: cat?.nom || null,
        categorie_icone: cat?.icone || null,
        ville: d.ville,
        budget_max: d.budget_max,
        date_souhaitee: d.date_souhaitee,
        photo: d.photo || null,
        lien_inspiration: d.lien_inspiration || null,
        created_at: d.created_at,
        expires_at: d.expires_at,
        // Prénom + initiale : assez pour humaniser, pas assez pour contourner la plateforme
        client_nom: client ? `${client.prenom || ''} ${(client.nom || '').charAt(0)}.`.trim() : 'Client',
        nombre_reponses: (d.reponses || []).length,
        deja_repondu: dejaRepondu,
        complete: (d.reponses || []).length >= MAX_REPONSES,
        meme_ville: !!villeNorm && (d.ville || '').trim().toLowerCase() === villeNorm,
        // true si cette demande n'est visible qu'à ce prestataire grâce à son
        // abonnement payant (le plan gratuit ne la verra qu'après la fenêtre)
        acces_anticipe: isPrioritaire && new Date() < priorityWindowEnds,
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

    // Fenêtre d'accès anticipé réservée aux plans payants : vérifiée ici aussi
    // (pas seulement à l'affichage) pour qu'un appel direct à l'API ne puisse
    // pas contourner l'avantage pendant les premières minutes.
    const priorityWindowEnds = new Date(demande.created_at.getTime() + PRIORITE_MINUTES * 60000);
    if (new Date() < priorityWindowEnds && !hasActivePaidPlan(prestataire)) {
      const secondesRestantes = Math.ceil((priorityWindowEnds.getTime() - Date.now()) / 1000);
      return res.status(403).json({
        error: `Cette demande est réservée aux prestataires abonnés pendant ${Math.ceil(secondesRestantes / 60)} minute(s). Passez à un plan payant pour répondre en priorité.`,
      });
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

// =====================================================================
// Demande sur un modèle du fil : prix proposé par la cliente, négociation
// par prestataire, accord → réservation confirmée.
// =====================================================================

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} F CFA`;
const nomCourt = (u: any) => u ? `${u.prenom || ''} ${(u.nom || '').charAt(0)}${u.nom ? '.' : ''}`.trim() || 'Cliente' : 'Cliente';

/** Catégories de modèle (coiffure, ongles…) que la pro réalise, d'après ses services actifs. */
async function categoriesModeleDe(prestataireId: number): Promise<Set<string>> {
  const sousIds: number[] = await Service.distinct('sous_categorie_id', { prestataire_id: prestataireId, is_active: true, deleted_at: null });
  if (!sousIds.length) return new Set();
  const sous = await SubCategory.find({ _id: { $in: sousIds } }).select('nom categorie_id');
  const cats = await Category.find({ _id: { $in: [...new Set(sous.map(s => s.categorie_id))] } }).select('nom');
  const nomCat = new Map(cats.map(c => [c._id as number, c.nom]));
  return new Set(sous.map(s => categorieModelePour(nomCat.get(s.categorie_id) || '', s.nom)).filter((c): c is NonNullable<typeof c> => !!c));
}

/** Prix de référence d'un modèle : saisi par l'admin, sinon prix de la prestation d'origine. */
const prixReferenceDe = (m: any): number | null => m?.prix_reference || m?.prix || null;

async function notifier(userId: number | null | undefined, titre: string, message: string, data: Record<string, unknown>, type: 'info' | 'success' | 'warning' = 'info') {
  if (!userId) return;
  try { await InAppNotificationService.createCustom(userId, titre, message, type, data); } catch { /* best-effort */ }
}

class ErreurDemande extends Error { constructor(message: string, public status = 400) { super(message); } }

/**
 * Accord entre la cliente et une pro au prix donné : la demande est réservée
 * atomiquement (une seule pro peut l'emporter), puis la réservation confirmée est créée.
 */
async function conclureAccord(demandeId: number, prestataire: any, prix: number, parUserId: number) {
  const demande: any = await Demande.findById(demandeId);
  if (!demande || !ouverte(demande)) throw new ErreurDemande('Cette demande n\'est plus ouverte', 409);

  // Service de la pro pour ce modèle : son offre « Je sais le faire », sinon un service de la même famille
  const offre = await OffreModele.findOne({ modele_id: demande.modele_id, prestataire_id: prestataire._id });
  let service: any = offre ? await Service.findOne({ _id: offre.service_id, is_active: true, deleted_at: null }) : null;
  if (!service) {
    const sousIds: number[] = await Service.distinct('sous_categorie_id', { prestataire_id: prestataire._id, is_active: true, deleted_at: null });
    const sous = await SubCategory.find({ _id: { $in: sousIds } }).select('nom categorie_id');
    const cats = await Category.find({ _id: { $in: [...new Set(sous.map(s => s.categorie_id))] } }).select('nom');
    const nomCat = new Map(cats.map(c => [c._id as number, c.nom]));
    const ok = sous.filter(s => categorieModelePour(nomCat.get(s.categorie_id) || '', s.nom) === demande.modele_categorie).map(s => s._id);
    service = await Service.findOne({ prestataire_id: prestataire._id, sous_categorie_id: { $in: ok }, is_active: true, deleted_at: null });
  }
  if (!service) throw new ErreurDemande('Ajoute d\'abord une prestation de cette catégorie à ton profil', 400);

  let heure_fin: string | undefined;
  const date = new Date(demande.date_souhaitee);
  if (demande.heure_souhaitee) {
    const debut = new Date(`${demande.date_souhaitee}T${demande.heure_souhaitee}`);
    heure_fin = new Date(debut.getTime() + (service.duree_minutes || 120) * 60000).toTimeString().slice(0, 5);
    if (await hasSlotConflict(prestataire._id, debut, demande.heure_souhaitee, heure_fin)) {
      throw new ErreurDemande('La prestataire a déjà un rendez-vous à ce créneau', 409);
    }
  }

  const reservee = await Demande.findOneAndUpdate(
    { _id: demandeId, statut: 'ouverte', accord: null },
    { $set: { statut: 'pourvue', accord: { prestataire_id: prestataire._id, prix, reservation_id: null, at: new Date() }, updated_at: new Date() } },
    { new: true },
  );
  if (!reservee) throw new ErreurDemande('Une autre prestataire vient de conclure cette demande', 409);

  try {
    const confirmee = await StatutReservation.findOne({ nom: 'confirmee' });
    if (!confirmee) throw new Error('Statut confirmee introuvable');
    const meches = demande.meches_comprises === null ? '' : demande.meches_comprises ? ' · mèches comprises' : ' · mèches non comprises';
    const reservation = await Reservation.create({
      client_id: demande.client_id,
      prestataire_id: prestataire._id,
      service_id: service._id,
      statut_id: confirmee._id as number,
      date_reservation: date,
      heure_debut: demande.heure_souhaitee || undefined,
      heure_fin,
      prix_final: prix,
      prix_total: prix,
      quantite: 1,
      notes_client: `Demande « ${demande.titre} » — prix convenu ${fcfa(prix)}${meches}${demande.commune ? ` · ${demande.commune}` : ''}${demande.description && !demande.description.startsWith('Demande pour') ? `\n${demande.description}` : ''}`,
    });
    await HistoriqueReservation.create({
      reservation_id: reservation._id as number, nouveau_statut_id: confirmee._id as number,
      commentaire: 'Réservation créée par accord sur une demande', changed_by_user_id: parUserId,
    });
    await Demande.updateOne({ _id: demandeId }, { $set: { 'accord.reservation_id': reservation._id } });

    const client = await User.findById(demande.client_id).select('prenom nom');
    await notifier(demande.client_id, '✅ C\'est réservé !', `${prestataire.nom_commercial || 'Une prestataire'} réalise « ${demande.titre} » pour ${fcfa(prix)}.`, { kind: 'demande_accord', demande_id: demandeId, reservation_id: reservation._id }, 'success');
    await notifier(prestataire.user_id, '✅ Demande conclue', `${nomCourt(client)} : « ${demande.titre} » pour ${fcfa(prix)}. Le rendez-vous est dans tes réservations.`, { kind: 'demande_accord', demande_id: demandeId, reservation_id: reservation._id }, 'success');
    return { reservation_id: reservation._id as number };
  } catch (e) {
    // La réservation a échoué : on rouvre la demande
    await Demande.updateOne({ _id: demandeId }, { $set: { statut: 'ouverte', accord: null } });
    throw e;
  }
}

const repondreErreur = (res: Response, e: any) =>
  e instanceof ErreurDemande ? res.status(e.status).json({ error: e.message }) : serverError(res, e);

// POST /api/demandes/modele — la cliente demande un modèle à son prix
router.post('/modele', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const modele: any = await Modele.findOne({ _id: Number(req.body?.modele_id), is_active: true });
    if (!modele) return res.status(404).json({ error: 'Ce modèle est introuvable' });

    const prix = montantValide(req.body?.prix_propose);
    if (prix === null) return res.status(400).json({ error: `Ton prix doit être entre ${fcfa(PRIX_MIN)} et ${fcfa(PRIX_MAX)}` });

    const date = String(req.body?.date_souhaitee || '').slice(0, 10);
    if (!isValidDayString(date) || isPastDay(date)) return res.status(400).json({ error: 'Choisis la date de la prestation' });
    if (new Date(date).getTime() > Date.now() + 366 * 86400_000) return res.status(400).json({ error: 'La date est trop lointaine' });
    const heure = String(req.body?.heure_souhaitee || '').trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) return res.status(400).json({ error: 'Choisis l\'heure de la prestation' });

    const commune = communeParNom(req.body?.commune);
    if (!commune) return res.status(400).json({ error: 'Choisis ta commune' });

    let meches: boolean | null = null;
    if (modele.categorie === 'coiffure') {
      if (typeof req.body?.meches_comprises !== 'boolean') return res.status(400).json({ error: 'Précise si les mèches sont comprises dans le prix' });
      meches = req.body.meches_comprises;
    }
    const message = String(req.body?.message || '').trim().slice(0, 500);

    if (await Demande.exists({ client_id: userId, modele_id: modele._id, statut: 'ouverte', expires_at: { $gt: new Date() } })) {
      return res.status(400).json({ error: 'Tu as déjà une demande en cours pour ce modèle' });
    }
    const ouvertes = await Demande.countDocuments({ client_id: userId, statut: 'ouverte', expires_at: { $gt: new Date() } });
    if (ouvertes >= MAX_DEMANDES_OUVERTES + 2) {
      return res.status(400).json({ error: 'Tu as déjà plusieurs demandes en cours. Annule-en une avant d\'en envoyer une autre.' });
    }

    // La demande expire le lendemain de la date voulue (ou après 7 jours si la date est loin)
    const finJour = new Date(`${date}T23:59:59`);
    const expires_at = new Date(Math.min(finJour.getTime(), Date.now() + DUREE_JOURS * 86400_000));

    const demande = await Demande.create({
      client_id: userId,
      titre: modele.titre.slice(0, 120),
      description: message || `Demande pour le modèle « ${modele.titre} »`,
      modele_id: modele._id,
      modele_categorie: modele.categorie,
      prix_propose: prix,
      prix_reference: prixReferenceDe(modele),
      meches_comprises: meches,
      date_souhaitee: date,
      heure_souhaitee: heure,
      commune: commune.nom,
      ville: commune.nom,
      photo: modele.photo_url || null,
      expires_at,
    });

    // Prévenir les pros concernées : celles qui font ce modèle, puis celles de la même famille, les plus proches d'abord
    let notifies = 0;
    try {
      const offres = await OffreModele.find({ modele_id: modele._id }).select('prestataire_id');
      const pros = await Prestataire.find({ is_active: { $ne: false }, user_id: { $ne: userId } })
        .select('user_id latitude longitude commune ville adresse');
      const candidates: { p: any; d: number; offre: boolean }[] = [];
      const avecOffre = new Set(offres.map(o => o.prestataire_id));
      for (const p of pros) {
        const offre = avecOffre.has(p._id as number);
        if (!offre && !(await categoriesModeleDe(p._id as number)).has(modele.categorie)) continue;
        const pos = positionPrestataire(p as any);
        candidates.push({ p, d: pos ? distanceKm(pos.lat, pos.lng, commune.lat, commune.lng) : 999, offre });
      }
      candidates.sort((a, b) => Number(b.offre) - Number(a.offre) || a.d - b.d);
      const cible = candidates.slice(0, MAX_NOTIFICATIONS);
      notifies = cible.length;
      await Promise.allSettled(cible.map(({ p }) => notifier(p.user_id, '✨ Nouvelle demande',
        `« ${modele.titre} » à ${commune.nom} pour ${fcfa(prix)}. Accepte, refuse ou discute le prix.`,
        { kind: 'demande_modele', demande_id: demande._id })));
    } catch { /* la demande est créée, les notifications sont un bonus */ }

    res.status(201).json({ id: demande._id, prestataires_notifies: notifies });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/demandes/:id/montant — « Augmenter mon montant »
router.put('/:id/montant', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const demande: any = await Demande.findOne({ _id: Number(req.params.id), client_id: userId, modele_id: { $ne: null } });
    if (!demande) return res.status(404).json({ error: 'Demande introuvable' });
    if (!ouverte(demande)) return res.status(400).json({ error: 'Cette demande n\'est plus ouverte' });
    const prix = montantValide(req.body?.prix);
    if (prix === null) return res.status(400).json({ error: `Montant entre ${fcfa(PRIX_MIN)} et ${fcfa(PRIX_MAX)}` });
    if (prix <= (demande.prix_propose || 0)) return res.status(400).json({ error: 'Le nouveau montant doit être plus élevé' });

    await Demande.updateOne({ _id: demande._id, statut: 'ouverte' }, { $set: { prix_propose: prix, updated_at: new Date() } });

    // Les pros qui n'ont pas refusé sont prévenues
    const exclues = new Set((demande.negociations || []).filter((n: any) => n.statut === 'refusee').map((n: any) => n.prestataire_id));
    const enDiscussion = (demande.negociations || []).filter((n: any) => !exclues.has(n.prestataire_id)).map((n: any) => n.prestataire_id);
    const pros = await Prestataire.find({ _id: { $in: enDiscussion } }).select('user_id');
    await Promise.allSettled(pros.map(p => notifier(p.user_id, '📈 La cliente a augmenté son prix', `« ${demande.titre} » : ${fcfa(prix)}.`, { kind: 'demande_modele', demande_id: demande._id })));
    res.json({ ok: true, prix_propose: prix });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/demandes/:id/pro { action: 'accepter' | 'refuser' | 'proposer', montant? } — réponse de la prestataire
router.post('/:id/pro', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const prestataire: any = await Prestataire.findOne({ user_id: userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire requis' });
    const pid = prestataire._id as number;
    const demande: any = await Demande.findOne({ _id: Number(req.params.id), modele_id: { $ne: null } });
    if (!demande) return res.status(404).json({ error: 'Demande introuvable' });
    if (demande.client_id === userId) return res.status(400).json({ error: 'C\'est ta propre demande' });
    if (!ouverte(demande)) return res.status(409).json({ error: 'Cette demande n\'est plus ouverte' });
    const nego = negoDe(demande, pid);
    if (nego?.statut === 'refusee') return res.status(400).json({ error: 'Cette discussion est terminée' });

    // Accès anticipé des abonnées (comme les demandes libres) : 5 premières minutes
    if (Date.now() < demande.created_at.getTime() + PRIORITE_MINUTES * 60000 && !hasActivePaidPlan(prestataire)) {
      return res.status(403).json({ error: `Les abonnées Pro ont la priorité pendant ${PRIORITE_MINUTES} minutes. Réessaie dans un instant ou passe Pro.` });
    }

    const action = String(req.body?.action || '');
    if (action === 'accepter') {
      const prix = prixCliente(demande, nego);
      const r = await conclureAccord(demande._id, prestataire, prix, userId);
      return res.json({ ok: true, prix, ...r });
    }
    if (action === 'refuser') {
      if (nego) {
        await Demande.updateOne({ _id: demande._id, 'negociations.prestataire_id': pid }, { $set: { 'negociations.$.statut': 'refusee', 'negociations.$.refusee_par': 'pro', 'negociations.$.updated_at': new Date() } });
      } else {
        await Demande.updateOne({ _id: demande._id }, { $push: { negociations: { prestataire_id: pid, statut: 'refusee', refusee_par: 'pro', offres: [], updated_at: new Date() } } });
      }
      return res.json({ ok: true });
    }
    if (action === 'proposer') {
      const montant = montantValide(req.body?.montant);
      if (montant === null) return res.status(400).json({ error: `Montant entre ${fcfa(PRIX_MIN)} et ${fcfa(PRIX_MAX)}` });
      if (montant <= prixCliente(demande, nego)) return res.status(400).json({ error: 'Ce prix est déjà proposé par la cliente : accepte-le directement' });
      const erreur = ajouterOffre(demande, pid, 'pro', montant);
      if (erreur) return res.status(400).json({ error: erreur });
      demande.markModified('negociations');
      await demande.save();
      await notifier(demande.client_id, '💬 Contre-proposition', `${prestataire.nom_commercial || 'Une prestataire'} te propose « ${demande.titre} » à ${fcfa(montant)}.`, { kind: 'demande_contre_offre', demande_id: demande._id });
      return res.json({ ok: true });
    }
    res.status(400).json({ error: 'Action inconnue' });
  } catch (e: any) {
    repondreErreur(res, e);
  }
});

// POST /api/demandes/:id/cliente { prestataire_id, action: 'accepter' | 'refuser' | 'proposer', montant? } — réponse de la cliente à une pro
router.post('/:id/cliente', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const demande: any = await Demande.findOne({ _id: Number(req.params.id), client_id: userId, modele_id: { $ne: null } });
    if (!demande) return res.status(404).json({ error: 'Demande introuvable' });
    if (!ouverte(demande)) return res.status(409).json({ error: 'Cette demande n\'est plus ouverte' });
    const pid = Number(req.body?.prestataire_id);
    const nego = negoDe(demande, pid);
    if (!nego || nego.statut !== 'en_discussion') return res.status(404).json({ error: 'Discussion introuvable' });
    const prestataire: any = await Prestataire.findById(pid);
    if (!prestataire) return res.status(404).json({ error: 'Prestataire introuvable' });

    const action = String(req.body?.action || '');
    if (action === 'accepter') {
      const prix = offreProEnAttente(nego);
      if (prix === null) return res.status(400).json({ error: 'Pas de proposition à accepter : attends sa réponse' });
      const r = await conclureAccord(demande._id, prestataire, prix, userId);
      return res.json({ ok: true, prix, ...r });
    }
    if (action === 'refuser') {
      await Demande.updateOne({ _id: demande._id, 'negociations.prestataire_id': pid }, { $set: { 'negociations.$.statut': 'refusee', 'negociations.$.refusee_par': 'cliente', 'negociations.$.updated_at': new Date() } });
      return res.json({ ok: true });
    }
    if (action === 'proposer') {
      const montant = montantValide(req.body?.montant);
      if (montant === null) return res.status(400).json({ error: `Montant entre ${fcfa(PRIX_MIN)} et ${fcfa(PRIX_MAX)}` });
      if (montant <= prixCliente(demande, nego)) return res.status(400).json({ error: 'Propose un montant plus élevé que ton offre actuelle' });
      const offrePro = derniereOffrePro(nego);
      if (offrePro !== null && montant >= offrePro) return res.status(400).json({ error: `Elle propose ${fcfa(offrePro)} : accepte directement sa proposition` });
      const erreur = ajouterOffre(demande, pid, 'cliente', montant);
      if (erreur) return res.status(400).json({ error: erreur });
      demande.markModified('negociations');
      await demande.save();
      const client = await User.findById(userId).select('prenom nom');
      await notifier(prestataire.user_id, '💬 Nouvelle offre', `${nomCourt(client)} peut monter à ${fcfa(montant)} pour « ${demande.titre} ».`, { kind: 'demande_modele', demande_id: demande._id });
      return res.json({ ok: true });
    }
    res.status(400).json({ error: 'Action inconnue' });
  } catch (e: any) {
    repondreErreur(res, e);
  }
});

/** Fil d'offres prêt à afficher (montants, auteur, date). */
const filPublic = (n: any) => (n?.offres || []).map((o: any) => ({ auteur: o.auteur, montant: o.montant, created_at: o.created_at }));

// GET /api/demandes/modele/mes — demandes de la cliente sur des modèles, avec les discussions
router.get('/modele/mes', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const demandes: any[] = await Demande.find({ client_id: userId, modele_id: { $ne: null } }).sort({ created_at: -1 }).limit(40);
    const proIds = [...new Set(demandes.flatMap(d => [...(d.negociations || []).map((n: any) => n.prestataire_id), d.accord?.prestataire_id].filter(Boolean)))];
    const modeleIds = [...new Set(demandes.map(d => d.modele_id))];
    const [pros, modeles] = await Promise.all([
      Prestataire.find({ _id: { $in: proIds } }).select('nom_commercial note_moyenne nombre_avis is_verified commune photos_etablissement'),
      Modele.find({ _id: { $in: modeleIds } }).select('titre photo_url pin_url categorie'),
    ]);
    const proById = new Map(pros.map(p => [p._id as number, p as any]));
    const modById = new Map(modeles.map(m => [m._id as number, m as any]));
    const vuePro = (id: number) => {
      const p = proById.get(id);
      return p ? { id, nom_commercial: p.nom_commercial, note_moyenne: p.note_moyenne ?? 0, nombre_avis: p.nombre_avis ?? 0, is_verified: !!p.is_verified, commune: p.commune || null, photo: (p.photos_etablissement || [])[0] || null } : { id, nom_commercial: 'Prestataire' };
    };
    res.json(demandes.map(d => {
      const m = modById.get(d.modele_id);
      return {
        id: d._id,
        modele: { id: d.modele_id, titre: m?.titre || d.titre, photo_url: m?.photo_url || d.photo || null, categorie: m?.categorie || d.modele_categorie },
        prix_propose: d.prix_propose,
        prix_reference: d.prix_reference,
        meches_comprises: d.meches_comprises,
        date_souhaitee: d.date_souhaitee,
        heure_souhaitee: d.heure_souhaitee,
        commune: d.commune,
        message: d.description?.startsWith('Demande pour') ? null : d.description,
        etat: etatCliente(d),
        relance_envoyee: !!d.relance_envoyee,
        created_at: d.created_at,
        expires_at: d.expires_at,
        accord: d.accord ? { prix: d.accord.prix, reservation_id: d.accord.reservation_id, prestataire: vuePro(d.accord.prestataire_id) } : null,
        discussions: (d.negociations || []).filter((n: any) => n.statut === 'en_discussion').map((n: any) => ({
          prestataire: vuePro(n.prestataire_id),
          offres: filPublic(n),
          offre_pro_en_attente: offreProEnAttente(n),
          derniere_offre: derniereOffre(d, n),
          updated_at: n.updated_at,
        })),
      };
    }));
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/demandes/modele/pro — menu « Demandes » de la prestataire : nouvelles, en discussion, acceptées
router.get('/modele/pro', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const prestataire: any = await Prestataire.findOne({ user_id: userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire requis' });
    const pid = prestataire._id as number;
    const prioritaire = hasActivePaidPlan(prestataire);

    const [cats, offres] = await Promise.all([
      categoriesModeleDe(pid),
      OffreModele.find({ prestataire_id: pid }).select('modele_id'),
    ]);
    const now = new Date();
    const ouvertesFiltre: any = {
      statut: 'ouverte', expires_at: { $gt: now }, modele_id: { $ne: null }, client_id: { $ne: userId },
      $or: [{ modele_categorie: { $in: [...cats] } }, { modele_id: { $in: offres.map(o => o.modele_id) } }],
    };
    if (!prioritaire) ouvertesFiltre.created_at = { $lte: new Date(Date.now() - PRIORITE_MINUTES * 60000) };
    const demandes: any[] = await Demande.find({ $or: [ouvertesFiltre, { 'accord.prestataire_id': pid }] })
      .sort({ created_at: -1 }).limit(100);

    const clients = await User.find({ _id: { $in: [...new Set(demandes.map(d => d.client_id))] } }).select('prenom nom');
    const clientById = new Map(clients.map(c => [c._id as number, c]));
    const modeles = await Modele.find({ _id: { $in: [...new Set(demandes.map(d => d.modele_id))] } }).select('titre photo_url categorie');
    const modById = new Map(modeles.map(m => [m._id as number, m as any]));
    const pos = positionPrestataire(prestataire);

    const lignes = demandes.map(d => {
      const onglet = ongletPro(d, pid, now);
      if (!onglet) return null;
      const n = negoDe(d, pid);
      const m = modById.get(d.modele_id);
      const c = communeParNom(d.commune);
      return {
        id: d._id,
        onglet,
        cliente: nomCourt(clientById.get(d.client_id)),
        modele: { id: d.modele_id, titre: m?.titre || d.titre, photo_url: m?.photo_url || d.photo || null, categorie: m?.categorie || d.modele_categorie },
        prix_cliente: prixCliente(d, n),
        prix_reference: d.prix_reference,
        meches_comprises: d.meches_comprises,
        date_souhaitee: d.date_souhaitee,
        heure_souhaitee: d.heure_souhaitee,
        commune: d.commune,
        distance_km: pos && c ? Math.round(distanceKm(pos.lat, pos.lng, c.lat, c.lng)) : null,
        message: d.description?.startsWith('Demande pour') ? null : d.description,
        offres: filPublic(n),
        ma_derniere_offre: offreProEnAttente(n),
        derniere_offre: derniereOffre(d, n),
        accord: d.accord?.prestataire_id === pid ? { prix: d.accord.prix, reservation_id: d.accord.reservation_id } : null,
        created_at: d.created_at,
      };
    }).filter(Boolean) as any[];

    // Nouvelles : les plus proches d'abord ; le reste : les plus récentes
    const parDistance = (a: any, b: any) => (a.distance_km ?? 999) - (b.distance_km ?? 999);
    res.json({
      nouvelles: lignes.filter(l => l.onglet === 'nouvelles').sort(parDistance),
      en_discussion: lignes.filter(l => l.onglet === 'en_discussion'),
      acceptees: lignes.filter(l => l.onglet === 'acceptees'),
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/demandes/modele/:id/annuler — la cliente annule sa demande encore ouverte
router.put('/modele/:id/annuler', async (req: Request, res: Response) => {
  try {
    const r = await Demande.updateOne({ _id: Number(req.params.id), client_id: req.userId!, statut: 'ouverte', modele_id: { $ne: null } }, { statut: 'annulee', updated_at: new Date() });
    if (!r.modifiedCount) return res.status(400).json({ error: 'Demande introuvable ou déjà traitée' });
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
