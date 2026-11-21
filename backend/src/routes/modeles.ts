import express, { Request, Response } from 'express';
import {
  Modele, ModeleSwipe, CATEGORIES_MODELE, Prestataire, Service, SubCategory, Category,
} from '../models/index.js';
import { getUserIdFromSession, requireAuth, requireRole } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { normaliser, texteRecherche, categorieModelePour } from '../services/modeles-sync.js';
import { isPexelsConfigured, rechercherPexels } from '../utils/pexels.js';

// Fil d'inspiration beauté « à swiper » + recherche + « Où le faire ? ».
const router = express.Router();

const CHAMPS_PUBLICS = 'titre categorie tags photo_url source credit_nom credit_url prestataire_id service_id prix ville nombre_likes';
const estCategorie = (c: unknown): c is typeof CATEGORIES_MODELE[number] =>
  typeof c === 'string' && (CATEGORIES_MODELE as readonly string[]).includes(c);
const idsValides = (v: unknown, max = 1000): number[] =>
  Array.isArray(v) ? v.map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, max) : [];

/** Filtre de recherche : chaque mot doit apparaître (préfixe) dans le texte normalisé. */
function filtreRecherche(q: string): Record<string, any> {
  const mots = normaliser(q).split(' ').filter(Boolean).slice(0, 6);
  if (!mots.length) return {};
  return { $and: mots.map(m => ({ recherche: { $regex: `(^| )${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` } })) };
}

// POST /api/modeles/feed — prochaine pile de cartes
// body: { categorie?, q?, exclude?: number[] (swipes locaux des visiteuses non connectées) }
router.post('/feed', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromSession(req);
    const { categorie, q } = req.body || {};
    let exclus = idsValides(req.body?.exclude);
    if (userId) {
      const vus = await ModeleSwipe.find({ user_id: userId }).sort({ created_at: -1 }).limit(5000).distinct('modele_id');
      exclus = [...new Set([...exclus, ...(vus as number[])])];
    }

    const match: Record<string, any> = { is_active: true, _id: { $nin: exclus } };
    if (estCategorie(categorie)) match.categorie = categorie;
    if (typeof q === 'string' && q.trim()) Object.assign(match, filtreRecherche(q));

    // Vraies prestations en priorité, puis inspiration ; mélange aléatoire dans chaque groupe
    const modeles = await Modele.aggregate([
      { $match: match },
      { $addFields: { _score: { $add: [{ $cond: [{ $eq: ['$source', 'prestataire'] }, 1, 0] }, { $multiply: [{ $rand: {} }, 0.9] }] } } },
      { $sort: { _score: -1 } },
      { $limit: 20 },
      { $project: { _score: 0, recherche: 0 } },
    ]);
    res.json({ modeles: modeles.map(({ _id, ...m }) => ({ id: _id, ...m })) });
  } catch (e) {
    serverError(res, e, 'modeles/feed');
  }
});

// GET /api/modeles/recherche?q=&categorie=&page= — grille de résultats
router.get('/recherche', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1);
    const limit = 30;
    const match: Record<string, any> = { is_active: true };
    if (estCategorie(req.query.categorie)) match.categorie = req.query.categorie;
    if (typeof req.query.q === 'string' && req.query.q.trim()) Object.assign(match, filtreRecherche(req.query.q));

    const [modeles, total] = await Promise.all([
      Modele.find(match).select(CHAMPS_PUBLICS).sort({ source: -1, nombre_likes: -1, created_at: -1 }).skip((page - 1) * limit).limit(limit),
      Modele.countDocuments(match),
    ]);
    res.json({ modeles, page, total, hasMore: page * limit < total });
  } catch (e) {
    serverError(res, e, 'modeles/recherche');
  }
});

// POST /api/modeles/par-ids — modèles aimés hors connexion (stockés sur le téléphone)
router.post('/par-ids', async (req: Request, res: Response) => {
  try {
    const ids = idsValides(req.body?.ids, 300);
    const modeles = await Modele.find({ _id: { $in: ids }, is_active: true }).select(CHAMPS_PUBLICS);
    const ordre = new Map(ids.map((id, i) => [id, i]));
    res.json({ modeles: modeles.sort((a, b) => (ordre.get(a._id as number)! - ordre.get(b._id as number)!)) });
  } catch (e) {
    serverError(res, e, 'modeles/par-ids');
  }
});

async function enregistrerSwipe(userId: number, modeleId: number, action: 'like' | 'pass') {
  const avant = await ModeleSwipe.findOneAndUpdate(
    { user_id: userId, modele_id: modeleId },
    { $set: { action }, $setOnInsert: { created_at: new Date() } },
    { upsert: true, new: false }
  );
  const etaitLike = avant?.action === 'like';
  if (action === 'like' && !etaitLike) await Modele.updateOne({ _id: modeleId }, { $inc: { nombre_likes: 1 } });
  if (action === 'pass' && etaitLike) await Modele.updateOne({ _id: modeleId, nombre_likes: { $gt: 0 } }, { $inc: { nombre_likes: -1 } });
}

// POST /api/modeles/:id/swipe  { action: 'like' | 'pass' }
router.post('/:id(\\d+)/swipe', requireAuth, async (req: any, res: Response) => {
  try {
    const action = req.body?.action;
    if (action !== 'like' && action !== 'pass') return res.status(400).json({ error: 'Action invalide' });
    const id = Number(req.params.id);
    if (!(await Modele.exists({ _id: id }))) return res.status(404).json({ error: 'Modèle introuvable' });
    await enregistrerSwipe(req.userId, id, action);
    res.json({ ok: true });
  } catch (e) {
    serverError(res, e, 'modeles/swipe');
  }
});

// DELETE /api/modeles/:id/like — retirer des favoris
router.delete('/:id(\\d+)/like', requireAuth, async (req: any, res: Response) => {
  try {
    await enregistrerSwipe(req.userId, Number(req.params.id), 'pass');
    res.json({ ok: true });
  } catch (e) {
    serverError(res, e, 'modeles/unlike');
  }
});

// POST /api/modeles/sync — rattache au compte les swipes faits avant connexion
router.post('/sync', requireAuth, async (req: any, res: Response) => {
  try {
    const likes = idsValides(req.body?.likes, 500);
    const passes = idsValides(req.body?.passes, 2000).filter(id => !likes.includes(id));
    const existants = new Set((await Modele.find({ _id: { $in: [...likes, ...passes] } }).distinct('_id')) as number[]);
    for (const id of likes) if (existants.has(id)) await enregistrerSwipe(req.userId, id, 'like');
    // Les « passés » ne doivent pas écraser un like déjà enregistré sur le compte
    const dejaVus = new Set((await ModeleSwipe.find({ user_id: req.userId, modele_id: { $in: passes } }).distinct('modele_id')) as number[]);
    for (const id of passes) if (existants.has(id) && !dejaVus.has(id)) await enregistrerSwipe(req.userId, id, 'pass');
    res.json({ ok: true });
  } catch (e) {
    serverError(res, e, 'modeles/sync');
  }
});

// GET /api/modeles/mes-likes
router.get('/mes-likes', requireAuth, async (req: any, res: Response) => {
  try {
    const swipes = await ModeleSwipe.find({ user_id: req.userId, action: 'like' }).sort({ created_at: -1 }).limit(300).select('modele_id');
    const ids = swipes.map(s => s.modele_id);
    const modeles = await Modele.find({ _id: { $in: ids }, is_active: true }).select(CHAMPS_PUBLICS);
    const ordre = new Map(ids.map((id, i) => [id, i]));
    res.json({ modeles: modeles.sort((a, b) => ordre.get(a._id as number)! - ordre.get(b._id as number)!) });
  } catch (e) {
    serverError(res, e, 'modeles/mes-likes');
  }
});

// GET /api/modeles/:id — détail + « Où le faire ? »
router.get('/:id(\\d+)', async (req: Request, res: Response) => {
  try {
    const modele = await Modele.findOne({ _id: Number(req.params.id) }).select(`${CHAMPS_PUBLICS} recherche is_active`);
    if (!modele) return res.status(404).json({ error: 'Modèle introuvable' });

    // Sous-catégories de la même famille (coiffure, ongles…)
    const [cats, sous] = await Promise.all([Category.find({ is_active: { $ne: false } }).select('nom'), SubCategory.find({ is_active: { $ne: false } }).select('nom categorie_id')]);
    const nomCat = new Map(cats.map(c => [c._id as number, c.nom]));
    const sousIds = sous.filter(s => categorieModelePour(nomCat.get(s.categorie_id) || '', s.nom) === modele.categorie).map(s => s._id as number);

    // Services actifs de la famille, en privilégiant ceux dont le nom ressemble au modèle
    const services = await Service.find({ sous_categorie_id: { $in: sousIds }, is_active: true, deleted_at: null })
      .select('nom prix prestataire_id photos').limit(300);
    const motsModele = new Set([...(modele.tags || []), ...normaliser(modele.titre).split(' ')].filter(w => w.length > 2));
    const score = (nom: string) => normaliser(nom).split(' ').filter(w => motsModele.has(w)).length;

    const prestIds = [...new Set(services.map(s => s.prestataire_id))];
    const prestataires = await Prestataire.find({ _id: { $in: prestIds }, is_active: { $ne: false } })
      .select('nom_commercial ville note_moyenne nombre_avis is_verified photos_etablissement plan_actuel_id abonnement_expires_at');
    const prestById = new Map(prestataires.map(p => [p._id as number, p]));
    const now = Date.now();
    const premium = (p: any) => p.plan_actuel_id && p.plan_actuel_id !== 1 && p.abonnement_expires_at && new Date(p.abonnement_expires_at).getTime() > now;

    // Meilleur service par prestataire
    const meilleur = new Map<number, { service: any; score: number }>();
    for (const s of services) {
      if (!prestById.has(s.prestataire_id)) continue;
      const sc = score(s.nom);
      const cur = meilleur.get(s.prestataire_id);
      if (!cur || sc > cur.score) meilleur.set(s.prestataire_id, { service: s, score: sc });
    }

    let ou = [...meilleur.entries()].map(([pid, { service, score: sc }]) => {
      const p: any = prestById.get(pid);
      const photo = Array.isArray(p.photos_etablissement) ? p.photos_etablissement[0] : null;
      return {
        prestataire: { id: pid, nom_commercial: p.nom_commercial, ville: p.ville, note_moyenne: p.note_moyenne, nombre_avis: p.nombre_avis, is_verified: p.is_verified, photo },
        service: { id: service._id, nom: service.nom, prix: service.prix },
        _rang: (pid === modele.prestataire_id ? 100 : 0) + sc * 10 + (premium(p) ? 5 : 0) + (p.note_moyenne || 0),
      };
    });
    ou.sort((a, b) => b._rang - a._rang);
    ou = ou.slice(0, 8);

    const { recherche: _r, ...publicModele } = modele.toJSON() as any;
    res.json({ modele: publicModele, ou_le_faire: ou.map(({ _rang, ...o }) => o) });
  } catch (e) {
    serverError(res, e, 'modeles/detail');
  }
});

// ─── Admin ─────────────────────────────────────────────────────────────────

// GET /api/modeles/admin?source=&categorie=&page=
router.get('/admin', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1);
    const limit = 40;
    const filter: Record<string, any> = {};
    if (req.query.source === 'prestataire' || req.query.source === 'curation') filter.source = req.query.source;
    if (estCategorie(req.query.categorie)) filter.categorie = req.query.categorie;
    const [modeles, total, stats] = await Promise.all([
      Modele.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit),
      Modele.countDocuments(filter),
      Modele.aggregate([{ $match: { is_active: true } }, { $group: { _id: { source: '$source', categorie: '$categorie' }, n: { $sum: 1 } } }]),
    ]);
    res.json({ modeles, total, page, totalPages: Math.ceil(total / limit), stats, pexels: isPexelsConfigured() });
  } catch (e) {
    serverError(res, e, 'modeles/admin');
  }
});

// POST /api/modeles/admin/import-pexels { query, categorie, nombre, tags? }
router.post('/admin/import-pexels', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!isPexelsConfigured()) return res.status(503).json({ error: 'PEXELS_API_KEY manquante côté serveur' });
    const { query, categorie } = req.body || {};
    const nombre = Math.min(80, Math.max(1, Number(req.body?.nombre) || 30));
    if (typeof query !== 'string' || !query.trim()) return res.status(400).json({ error: 'Mot-clé requis' });
    if (!estCategorie(categorie)) return res.status(400).json({ error: 'Catégorie invalide' });
    const tags = [...new Set(normaliser(`${query} ${String(req.body?.tags || '')}`).split(' ').filter(w => w.length > 2))];

    const photos = await rechercherPexels(query.trim(), nombre, Math.max(1, Number(req.body?.page) || 1));
    const deja = new Set((await Modele.find({ source_externe_id: { $in: photos.map(p => p.id_externe) } }).distinct('source_externe_id')) as string[]);
    let importes = 0;
    for (const p of photos) {
      if (deja.has(p.id_externe)) continue;
      try {
        await Modele.create({
          titre: p.titre, categorie, tags, photo_url: p.photo_url, source: 'curation',
          credit_nom: p.credit_nom, credit_url: p.credit_url, source_externe_id: p.id_externe,
          recherche: texteRecherche([p.titre, query, req.body?.tags, categorie]),
        });
        importes++;
      } catch (e: any) {
        if (e?.code !== 11000) throw e; // doublon importé en parallèle : ignoré
      }
    }
    res.json({ ok: true, trouves: photos.length, importes, doublons: photos.length - importes });
  } catch (e) {
    serverError(res, e, 'modeles/import-pexels');
  }
});

// POST /api/modeles/admin  { photo_url, titre, categorie, tags?, credit_nom?, credit_url? }
router.post('/admin', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { photo_url, titre, categorie, tags, credit_nom, credit_url } = req.body || {};
    if (typeof photo_url !== 'string' || !/^https?:\/\//.test(photo_url)) return res.status(400).json({ error: 'URL de photo invalide' });
    if (typeof titre !== 'string' || !titre.trim()) return res.status(400).json({ error: 'Titre requis' });
    if (!estCategorie(categorie)) return res.status(400).json({ error: 'Catégorie invalide' });
    const listeTags = [...new Set(normaliser(String(tags || '')).split(' ').filter(w => w.length > 2))];
    const m = await Modele.create({
      titre: titre.trim(), categorie, tags: listeTags, photo_url, source: 'curation',
      credit_nom: credit_nom || null, credit_url: credit_url || null,
      recherche: texteRecherche([titre, String(tags || ''), categorie]),
    });
    res.json({ ok: true, id: m._id });
  } catch (e) {
    serverError(res, e, 'modeles/admin-create');
  }
});

// PUT /api/modeles/admin/:id/toggle — masquer / réafficher
router.put('/admin/:id(\\d+)/toggle', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const m = await Modele.findById(Number(req.params.id));
    if (!m) return res.status(404).json({ error: 'Modèle introuvable' });
    await Modele.updateOne({ _id: m._id }, { is_active: !m.is_active, updated_at: new Date() });
    res.json({ ok: true, is_active: !m.is_active });
  } catch (e) {
    serverError(res, e, 'modeles/admin-toggle');
  }
});

// DELETE /api/modeles/admin/:id — supprimer (curation uniquement)
router.delete('/admin/:id(\\d+)', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const r = await Modele.deleteOne({ _id: Number(req.params.id), source: 'curation' });
    if (!r.deletedCount) return res.status(400).json({ error: 'Seuls les modèles importés peuvent être supprimés (masquez les autres).' });
    await ModeleSwipe.deleteMany({ modele_id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (e) {
    serverError(res, e, 'modeles/admin-delete');
  }
});

export default router;
