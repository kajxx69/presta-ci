import express from 'express';
import { Avis, Reservation, StatutReservation, Service, Prestataire, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { materializePhotos } from '../utils/uploads.js';

const router = express.Router();

async function updateAverageRatings(prestataire_id: number, service_id: number) {
  try {
    const avisPrestataire = await Avis.find({ prestataire_id, is_visible: true });
    const note_moyenne_p = avisPrestataire.length > 0
      ? avisPrestataire.reduce((s, a) => s + a.note, 0) / avisPrestataire.length : 0;
    await Prestataire.updateOne({ _id: prestataire_id }, {
      note_moyenne: parseFloat(note_moyenne_p.toFixed(1)),
      nombre_avis: avisPrestataire.length
    });

    const avisService = await Avis.find({ service_id });
    const note_moyenne_s = avisService.length > 0
      ? avisService.reduce((s, a) => s + a.note, 0) / avisService.length : 0;
    await Service.updateOne({ _id: service_id }, {
      note_moyenne: parseFloat(note_moyenne_s.toFixed(1)),
      nombre_avis: avisService.length
    });
  } catch (error) {
    console.error('Erreur mise à jour moyennes:', error);
  }
}

// POST /api/avis
router.post('/', requireAuth, async (req, res) => {
  try {
    const { reservation_id, note, commentaire, photos } = req.body;
    const client_id = req.user!.id;

    const reservation = await Reservation.findOne({ _id: reservation_id, client_id });
    if (!reservation) return res.status(404).json({ error: 'Réservation non trouvée' });

    const statut = await StatutReservation.findById(reservation.statut_id);
    if (statut?.nom !== 'terminee') return res.status(400).json({ error: 'Vous ne pouvez noter que les services terminés' });

    const existing = await Avis.findOne({ reservation_id });
    if (existing) return res.status(400).json({ error: 'Vous avez déjà noté ce service' });

    if (!note || note < 1 || note > 5) return res.status(400).json({ error: 'La note doit être entre 1 et 5' });

    const avis = await Avis.create({
      reservation_id,
      client_id,
      prestataire_id: reservation.prestataire_id,
      service_id: reservation.service_id,
      note,
      commentaire: commentaire || null,
      photos: photos ? await materializePhotos(photos) : null
    });

    await updateAverageRatings(reservation.prestataire_id, reservation.service_id);

    res.json({ ok: true, id: avis._id, message: 'Avis créé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/avis/prestataire/:id
router.get('/prestataire/:id', async (req, res) => {
  try {
    const prestataire_id = parseInt(req.params.id);
    const avisList = await Avis.find({ prestataire_id }).sort({ created_at: -1 });

    const results = await Promise.all(avisList.map(async (a) => {
      const user = await User.findById(a.client_id).select('prenom nom photo_profil');
      const reservation = await Reservation.findById(a.reservation_id);
      const service = reservation ? await Service.findById(reservation.service_id) : null;
      const dateAvis = a.created_at instanceof Date
        ? a.created_at.toLocaleDateString('fr-FR') : String(a.created_at);

      return {
        ...a.toJSON(),
        photos: Array.isArray(a.photos) ? a.photos : [],
        prenom: user?.prenom || null,
        nom: user?.nom || null,
        photo_profil: user?.photo_profil || null,
        service_nom: service?.nom || null,
        date_avis: dateAvis
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/avis/service/:id
router.get('/service/:id', async (req, res) => {
  try {
    const service_id = parseInt(req.params.id);
    const avisList = await Avis.find({ service_id }).sort({ created_at: -1 });

    const results = await Promise.all(avisList.map(async (a) => {
      const user = await User.findById(a.client_id).select('prenom nom photo_profil');
      const dateAvis = a.created_at instanceof Date
        ? a.created_at.toLocaleDateString('fr-FR') : String(a.created_at);

      return {
        ...a.toJSON(),
        photos: Array.isArray(a.photos) ? a.photos : [],
        prenom: user?.prenom || null,
        nom: user?.nom || null,
        photo_profil: user?.photo_profil || null,
        date_avis: dateAvis
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/avis/client
router.get('/client', requireAuth, async (req, res) => {
  try {
    const client_id = req.user!.id;
    const avisList = await Avis.find({ client_id }).sort({ created_at: -1 });

    const results = await Promise.all(avisList.map(async (a) => {
      const reservation = await Reservation.findById(a.reservation_id);
      const service = reservation ? await Service.findById(reservation.service_id) : null;
      const prestataire = await Prestataire.findById(a.prestataire_id);
      const dateAvis = a.created_at instanceof Date
        ? a.created_at.toLocaleDateString('fr-FR') : String(a.created_at);

      return {
        ...a.toJSON(),
        photos: Array.isArray(a.photos) ? a.photos : [],
        service_nom: service?.nom || null,
        prestataire_nom: prestataire?.nom_commercial || null,
        date_avis: dateAvis
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/avis/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const avis_id = parseInt(req.params.id);
    const client_id = req.user!.id;

    const avis = await Avis.findOne({ _id: avis_id, client_id });
    if (!avis) return res.status(404).json({ error: 'Avis non trouvé' });

    const reservation = await Reservation.findById(avis.reservation_id);
    const service_id = reservation?.service_id || null;

    await Avis.deleteOne({ _id: avis_id });

    if (service_id) await updateAverageRatings(avis.prestataire_id, service_id);

    res.json({ ok: true, message: 'Avis supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
