import express, { Request, Response } from 'express';
import { FavorisPrestataire, FavorisService, FavorisPublication, Prestataire, Service, Publication, User, Like } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';

const router = express.Router();

// --- Providers favorites ---
router.get('/providers', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const favs = await FavorisPrestataire.find({ client_id: userId }).sort({ created_at: -1 });

    const results = await Promise.all(favs.map(async (f) => {
      const p = await Prestataire.findById(f.prestataire_id);
      if (!p) return null;
      return {
        id: p._id,
        nom_commercial: p.nom_commercial,
        ville: p.ville,
        bio: p.bio,
        adresse: p.adresse,
        photos_etablissement: Array.isArray(p.photos_etablissement) ? p.photos_etablissement : [],
        is_verified: p.is_verified,
        note_moyenne: p.note_moyenne,
        nombre_avis: p.nombre_avis
      };
    }));

    res.json(results.filter(Boolean));
  } catch (e: any) {
    serverError(res, e);
  }
});

router.post('/providers/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = Number(req.params.id);
    await FavorisPrestataire.findOneAndUpdate(
      { client_id: userId, prestataire_id: id },
      { client_id: userId, prestataire_id: id },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

router.delete('/providers/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    await FavorisPrestataire.deleteOne({ client_id: userId, prestataire_id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// --- Services favorites ---
router.get('/services', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const favs = await FavorisService.find({ client_id: userId }).sort({ created_at: -1 });

    const results = await Promise.all(favs.map(async (f) => {
      const sv = await Service.findById(f.service_id);
      if (!sv) return null;
      const p = await Prestataire.findById(sv.prestataire_id);
      return {
        id: sv._id,
        nom: sv.nom,
        description: sv.description,
        photos: Array.isArray(sv.photos) ? sv.photos : [],
        prix: sv.prix,
        devise: sv.devise,
        duree_minutes: sv.duree_minutes,
        prestataire_id: sv.prestataire_id,
        prestataire_nom: p?.nom_commercial || null,
        note_moyenne: sv.note_moyenne || 0,
        nombre_avis: sv.nombre_avis || 0
      };
    }));

    res.json(results.filter(Boolean));
  } catch (e: any) {
    serverError(res, e);
  }
});

router.post('/services/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = Number(req.params.id);
    await FavorisService.findOneAndUpdate(
      { client_id: userId, service_id: id },
      { client_id: userId, service_id: id },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

router.delete('/services/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    await FavorisService.deleteOne({ client_id: userId, service_id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// --- Publications favorites ---
router.get('/publications', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const favs = await FavorisPublication.find({ client_id: userId }).sort({ created_at: -1 });

    const results = await Promise.all(favs.map(async (f) => {
      const pub = await Publication.findById(f.publication_id);
      if (!pub) return null;
      const user = await User.findById(pub.client_id).select('prenom nom photo_profil');
      const p = pub.prestataire_id ? await Prestataire.findById(pub.prestataire_id) : null;
      const sv = pub.service_id ? await Service.findById(pub.service_id) : null;
      const liked = await Like.exists({ publication_id: pub._id, user_id: userId });

      return {
        id: pub._id,
        description: pub.description,
        photos: Array.isArray(pub.photos) ? pub.photos : [],
        videos: Array.isArray(pub.videos) ? pub.videos : [],
        nombre_likes: pub.nombre_likes,
        created_at: pub.created_at,
        client_id: pub.client_id,
        client_prenom: user?.prenom || null,
        client_nom: user?.nom || null,
        photo_profil: user?.photo_profil || null,
        prestataire_id: pub.prestataire_id,
        prestataire_nom: p?.nom_commercial || null,
        service_id: pub.service_id,
        service_nom: sv?.nom || null,
        liked: !!liked,
        nombre_commentaires: 0
      };
    }));

    res.json(results.filter(Boolean));
  } catch (e: any) {
    serverError(res, e);
  }
});

router.post('/publications/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = Number(req.params.id);
    await FavorisPublication.findOneAndUpdate(
      { client_id: userId, publication_id: id },
      { client_id: userId, publication_id: id },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

router.delete('/publications/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    await FavorisPublication.deleteOne({ client_id: userId, publication_id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
