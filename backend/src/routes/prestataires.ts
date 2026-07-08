import { Router, Request, Response } from 'express';
import { Prestataire, UserSession, Reservation, StatutReservation } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { materializePhotos } from '../utils/uploads.js';
import { computeBadges } from '../utils/badges.js';

const router = Router();

/** Normalise l'entrée en tableau puis convertit les base64 en fichiers /uploads */
async function parsePhotoArray(input: any): Promise<any[] | null> {
  if (!input) return null;
  let photos = input;
  if (typeof input === 'string') {
    try { photos = JSON.parse(input); } catch { photos = [input]; }
  }
  if (!Array.isArray(photos)) return null;
  return materializePhotos(photos);
}

// Récupérer le profil du prestataire connecté
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const prestataire = await Prestataire.findOne({ user_id: (req as any).user.id });
    if (!prestataire) return res.status(404).json({ error: 'Profil prestataire non trouvé.' });
    res.json(prestataire);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour le profil du prestataire connecté
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { nom_commercial, bio, adresse, ville, pays, latitude, longitude, telephone_pro, horaires_ouverture, photos_etablissement } = req.body;

    if (!nom_commercial) return res.status(400).json({ error: 'Le nom commercial est requis.' });

    const existing = await Prestataire.findOne({ user_id: userId });
    if (!existing) return res.status(404).json({ error: 'Profil prestataire non trouvé. Impossible de mettre à jour.' });

    let parsedPhotos: any = existing.photos_etablissement;
    if (photos_etablissement) {
      try {
        parsedPhotos = await parsePhotoArray(photos_etablissement);
      } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Photos invalides' });
      }
    }

    await Prestataire.updateOne({ user_id: userId }, {
      nom_commercial, bio, adresse, ville, pays,
      latitude, longitude, telephone_pro,
      horaires_ouverture: horaires_ouverture || existing.horaires_ouverture,
      photos_etablissement: parsedPhotos,
      updated_at: new Date()
    });

    const updated = await Prestataire.findOne({ user_id: userId });
    res.json({ message: 'Profil mis à jour avec succès.', prestataire: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// Route setup (compatibilité)
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const token = (req as any).cookies?.session_token;
    if (!token) return res.status(401).json({ error: 'Non authentifié' });

    const session = await UserSession.findOne({ token, expires_at: { $gt: new Date() } });
    if (!session) return res.status(401).json({ error: 'Session invalide ou expirée' });

    const userId = session.user_id;
    const { nom_commercial, ville, bio, telephone_pro, adresse, pays, latitude, longitude, horaires_ouverture, photos_etablissement } = req.body || {};
    if (!nom_commercial) return res.status(400).json({ error: 'nom_commercial requis' });

    let horairesData: any = null;
    if (horaires_ouverture) {
      try {
        horairesData = typeof horaires_ouverture === 'string' ? JSON.parse(horaires_ouverture) : horaires_ouverture;
      } catch {
        return res.status(400).json({ error: 'horaires_ouverture invalide (JSON attendu)' });
      }
    }

    let photosData: any = null;
    if (photos_etablissement) {
      try {
        photosData = await parsePhotoArray(photos_etablissement);
      } catch (err: any) {
        return res.status(400).json({ error: err.message || 'photos_etablissement invalide (JSON array attendu)' });
      }
    }

    const existing = await Prestataire.findOne({ user_id: userId });
    if (existing) {
      const update: any = {
        nom_commercial,
        ville: ville || null,
        bio: bio || null,
        telephone_pro: telephone_pro || null,
        adresse: adresse || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        updated_at: new Date()
      };
      if (pays) update.pays = pays;
      if (horairesData) update.horaires_ouverture = horairesData;
      if (photosData) update.photos_etablissement = photosData;

      await Prestataire.updateOne({ user_id: userId }, update);
      return res.json({ ok: true, updated: true });
    }

    await Prestataire.create({
      user_id: userId,
      nom_commercial,
      ville: ville || null,
      bio: bio || null,
      telephone_pro: telephone_pro || null,
      adresse: adresse || null,
      pays: pays || "Côte d'Ivoire",
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      horaires_ouverture: horairesData,
      photos_etablissement: photosData
    });

    res.json({ ok: true, created: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/prestataires/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const prestataire = await Prestataire.findById(id);
    if (!prestataire) return res.status(404).json({ error: 'Prestataire non trouvé' });

    // Compteur de vues (fire-and-forget) + badges calculés
    Prestataire.updateOne({ _id: id }, { $inc: { vues: 1 } }).catch(() => {});
    const statutTerminee = await StatutReservation.findOne({ nom: 'terminee' });
    const prestationsTerminees = statutTerminee
      ? await Reservation.countDocuments({ prestataire_id: id, statut_id: statutTerminee._id })
      : 0;

    res.json({
      ...prestataire.toJSON(),
      badges: computeBadges({
        is_verified: prestataire.is_verified,
        note_moyenne: prestataire.note_moyenne,
        nombre_avis: prestataire.nombre_avis,
        created_at: prestataire.created_at,
        prestations_terminees: prestationsTerminees,
      }),
      prestations_terminees: prestationsTerminees,
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
