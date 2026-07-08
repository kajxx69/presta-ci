import express, { Request, Response } from 'express';
import { Service, Prestataire, Plan, Reservation } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validateCreateService } from '../utils/validation.js';
import { serverError } from '../utils/http.js';
import { computeDaySlots } from '../utils/availability.js';
import { materializePhotos } from '../utils/uploads.js';

const router = express.Router();

// Get services for authenticated prestataire
router.get('/my-services', requireAuth, async (req: Request, res: Response) => {
  try {
    const prestataire = await Prestataire.findOne({ user_id: req.userId });
    if (!prestataire) return res.json([]);

    const services = await Service.find({ prestataire_id: prestataire._id }).sort({ created_at: -1 });
    res.json(services);
  } catch (e: any) {
    serverError(res, e);
  }
});

// Create service with plan limit enforcement
router.post('/', requireAuth, validateCreateService, async (req: Request, res: Response) => {
  try {
    const prestataire = await Prestataire.findOne({ user_id: req.userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire introuvable' });

    const prestataireId = prestataire._id as number;

    // Check plan limits and expiration
    const plan = await Plan.findById(prestataire.plan_actuel_id);
    if (!plan) return res.status(400).json({ error: 'Plan introuvable' });
    if (prestataire.abonnement_expires_at && new Date(prestataire.abonnement_expires_at) < new Date()) {
      return res.status(402).json({ error: 'Abonnement expiré' });
    }
    const count = await Service.countDocuments({ prestataire_id: prestataireId, deleted_at: null });
    if (plan.max_services >= 0 && count >= plan.max_services) {
      return res.status(403).json({ error: `Limite de services atteinte (${plan.max_services})` });
    }

    const { sous_categorie_id, nom, description, prix, devise, duree_minutes, photos, is_domicile, unite, quantite_min, quantite_max, type_service, stock } = req.body || {};
    const isProduit = type_service === 'produit';
    if (!sous_categorie_id || !nom || !prix || (!isProduit && !duree_minutes)) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    const service = await Service.create({
      prestataire_id: prestataireId,
      sous_categorie_id, nom,
      description: description || null,
      prix, devise: devise || 'FCFA',
      type_service: isProduit ? 'produit' : 'prestation',
      stock: isProduit && stock !== undefined && stock !== null ? Number(stock) : null,
      unite: unite || null,
      quantite_min: quantite_min || 1,
      quantite_max: quantite_max || null,
      duree_minutes: isProduit ? (duree_minutes || null) : duree_minutes,
      photos: photos ? await materializePhotos(photos) : null,
      is_domicile: is_domicile || false
    });

    res.json({ id: service._id });
  } catch (e: any) {
    serverError(res, e);
  }
});

// Update service
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const prestataire = await Prestataire.findOne({ user_id: req.userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire introuvable' });

    const prestataireId = prestataire._id as number;
    const id = Number(req.params.id);

    const service = await Service.findById(id);
    if (!service) return res.status(404).json({ error: 'Service introuvable' });
    if (service.prestataire_id !== prestataireId) {
      return res.status(403).json({ error: "Vous n'avez pas les droits pour modifier ce service" });
    }

    const { sous_categorie_id, nom, description, prix, devise, duree_minutes, photos, is_domicile, is_active, unite, quantite_min, quantite_max, type_service, stock } = req.body || {};

    const update: any = { updated_at: new Date() };
    if (sous_categorie_id !== undefined) update.sous_categorie_id = sous_categorie_id;
    if (nom !== undefined) update.nom = nom;
    if (description !== undefined) update.description = description;
    if (prix !== undefined) update.prix = prix;
    if (devise !== undefined) update.devise = devise;
    if (duree_minutes !== undefined) update.duree_minutes = duree_minutes;
    if (photos !== undefined) update.photos = photos ? await materializePhotos(photos) : photos;
    if (is_domicile !== undefined) update.is_domicile = is_domicile;
    if (is_active !== undefined) update.is_active = is_active;
    if (unite !== undefined) update.unite = unite;
    if (quantite_min !== undefined) update.quantite_min = quantite_min;
    if (quantite_max !== undefined) update.quantite_max = quantite_max;
    if (type_service !== undefined) update.type_service = type_service === 'produit' ? 'produit' : 'prestation';
    if (stock !== undefined) update.stock = stock === null || stock === '' ? null : Number(stock);

    await Service.updateOne({ _id: id, prestataire_id: prestataireId }, update);
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// Delete service
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const prestataire = await Prestataire.findOne({ user_id: req.userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire introuvable' });

    const prestataireId = prestataire._id as number;
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'ID de service invalide' });

    const service = await Service.findOne({ _id: id, prestataire_id: prestataireId });
    if (!service) {
      const exists = await Service.findById(id);
      if (exists) return res.status(403).json({ error: "Vous n'avez pas les droits pour supprimer ce service" });
      return res.status(404).json({ error: 'Service introuvable' });
    }

    // Check if reservations exist
    const reservationCount = await Reservation.countDocuments({ service_id: id });
    if (reservationCount > 0) {
      await Service.updateOne({ _id: id, prestataire_id: prestataireId }, { is_active: false, updated_at: new Date() });
      return res.json({
        ok: true,
        message: 'Service désactivé car des réservations existent. Le service ne peut pas être supprimé.',
        deactivated: true
      });
    }

    await Service.deleteOne({ _id: id, prestataire_id: prestataireId });
    res.json({ ok: true, message: 'Service supprimé avec succès', deleted: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// Toggle service status
router.put('/:id/toggle', requireAuth, async (req: Request, res: Response) => {
  try {
    const prestataire = await Prestataire.findOne({ user_id: req.userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire introuvable' });

    const id = Number(req.params.id);
    const service = await Service.findOne({ _id: id, prestataire_id: prestataire._id });
    if (!service) return res.status(404).json({ error: 'Service introuvable' });

    await Service.updateOne({ _id: id }, { is_active: !service.is_active, updated_at: new Date() });
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/services/:id/slots?date=YYYY-MM-DD — créneaux disponibles pour un service
router.get('/:id/slots', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const dateStr = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Paramètre date requis (format YYYY-MM-DD)' });
    }
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return res.status(400).json({ error: 'Date invalide' });

    const service = await Service.findOne({ _id: id, is_active: true });
    if (!service) return res.status(404).json({ error: 'Service introuvable ou inactif' });
    if (!service.duree_minutes) return res.status(400).json({ error: 'Ce service ne fonctionne pas par créneaux horaires' });

    const prestataire = await Prestataire.findById(service.prestataire_id);
    if (!prestataire) return res.status(404).json({ error: 'Prestataire introuvable' });

    const horaires = prestataire.horaires_ouverture as any;
    const horairesDefinis = !!(horaires && typeof horaires === 'object' && Object.keys(horaires).length > 0);

    const slots = await computeDaySlots(
      service.prestataire_id,
      horaires,
      service.duree_minutes,
      date
    );

    res.json({
      date: dateStr,
      duree_minutes: service.duree_minutes,
      horaires_definis: horairesDefinis,
      ouvert: !horairesDefinis || slots.length > 0,
      slots,
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/services/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const service = await Service.findById(Number(req.params.id));
    if (!service) return res.status(404).json({ error: 'Service non trouvé' });
    res.json(service);
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
