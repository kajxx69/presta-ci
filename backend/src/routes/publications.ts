import express, { Request, Response } from 'express';
import { Publication, Like, CommentairePublication, User, Prestataire, Service } from '../models/index.js';
import { getUserIdFromSession } from '../middleware/auth.js';

const router = express.Router();

function safeArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    if (data.startsWith('[')) { try { return JSON.parse(data); } catch { return []; } }
    if (data.startsWith('data:')) return [data];
  }
  return [];
}

// GET /api/publications?mine=0|1
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const mine = String(req.query.mine || '0') === '1';

    const filter: any = {};
    if (mine) filter.client_id = userId;

    const publications = await Publication.find(filter).sort({ created_at: -1 }).limit(200);

    const results = await Promise.all(publications.map(async (pub) => {
      const user = await User.findById(pub.client_id).select('prenom nom photo_profil');
      const prestataire = pub.prestataire_id ? await Prestataire.findById(pub.prestataire_id) : null;
      const service = pub.service_id ? await Service.findById(pub.service_id) : null;
      const liked = await Like.exists({ publication_id: pub._id, user_id: userId });
      const nombre_commentaires = await CommentairePublication.countDocuments({ publication_id: pub._id });

      return {
        ...pub.toJSON(),
        photos: safeArray(pub.photos),
        videos: safeArray(pub.videos),
        nombre_likes: Number(pub.nombre_likes) || 0,
        nombre_commentaires,
        client_prenom: user?.prenom || null,
        client_nom: user?.nom || null,
        photo_profil: user?.photo_profil || null,
        prestataire_nom: prestataire?.nom_commercial || null,
        service_nom: service?.nom || null,
        liked: !!liked
      };
    }));

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/publications
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const { prestataire_id, service_id, description, photos, videos } = req.body || {};
    if (!prestataire_id || !description) return res.status(400).json({ error: 'prestataire_id et description requis' });

    const pub = await Publication.create({
      client_id: userId,
      prestataire_id,
      service_id: service_id || null,
      description,
      photos: photos || [],
      videos: videos || []
    });

    res.json({ id: pub._id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/publications/:id/like
router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const pubId = Number(req.params.id);

    const existing = await Like.findOne({ publication_id: pubId, user_id: userId });
    if (!existing) {
      await Like.create({ publication_id: pubId, user_id: userId });
      const count = await Like.countDocuments({ publication_id: pubId });
      await Publication.updateOne({ _id: pubId }, { nombre_likes: count });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/publications/:id/like
router.delete('/:id/like', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const pubId = Number(req.params.id);

    const result = await Like.deleteOne({ publication_id: pubId, user_id: userId });
    if (result.deletedCount > 0) {
      const count = await Like.countDocuments({ publication_id: pubId });
      await Publication.updateOne({ _id: pubId }, { nombre_likes: count });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/publications/:id/comments
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const pubId = Number(req.params.id);
    const comments = await CommentairePublication.find({ publication_id: pubId }).sort({ created_at: 1 });

    const results = await Promise.all(comments.map(async (c) => {
      const user = await User.findById(c.user_id).select('prenom nom photo_profil');
      return {
        ...c.toJSON(),
        client_prenom: user?.prenom || null,
        client_nom: user?.nom || null,
        photo_profil: user?.photo_profil || null
      };
    }));

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/publications/:id/comments
router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const pubId = Number(req.params.id);
    const { contenu } = req.body;
    if (!contenu) return res.status(400).json({ error: 'Le contenu est requis' });

    const comment = await CommentairePublication.create({
      publication_id: pubId,
      user_id: userId,
      contenu
    });

    const user = await User.findById(userId).select('prenom nom photo_profil');
    res.status(201).json({
      ...comment.toJSON(),
      client_prenom: user?.prenom || null,
      client_nom: user?.nom || null,
      photo_profil: user?.photo_profil || null
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
