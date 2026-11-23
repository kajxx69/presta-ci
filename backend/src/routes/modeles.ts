import express, { Request, Response } from 'express';
import {
  Modele, ModeleSwipe, CATEGORIES_MODELE, Prestataire, Service, SubCategory, Category, TableauPinterest,
} from '../models/index.js';
import { tableauPinterestValide, epinglePinterestValide } from '../utils/liens.js';
import { creerOffre, retirerOffre, enrichirOffres, offresDuModele, ErreurOffre, infoDistance, comparerProximite, cleOffre, modelesProches, bonusProximite, infoDomicile } from '../services/offres.js';
import { positionDepuisRequete, communeParNom } from '../services/communes.js';
import { OffreModele } from '../models/index.js';
import { synchroniserTableau, synchroniserTousLesTableaux } from '../services/pinterest-sync.js';
import { getUserIdFromSession, requireAuth, requireRole } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { logger } from '../logger.js';
import { User, PaiementEnLigne } from '../models/index.js';
import { etatGeniusPay } from '../utils/geniuspay.js';
import { placesOffreRestantes, PLACES_OFFRE_LANCEMENT } from '../services/plans.js';
import { normaliser, texteRecherche, categorieModelePour } from '../services/modeles-sync.js';

// Fil d'inspiration beauté « à swiper » + recherche + « Où le faire ? ».
const router = express.Router();

const CHAMPS_PUBLICS = 'titre categorie tags photo_url pin_url source credit_nom credit_url prestataire_id service_id prix ville nombre_likes';
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
// body: { categorie?, q?, exclude?: number[] (swipes locaux des visiteuses non connectées), lat?, lng?, commune? }
// Avec une position : les modèles réservables chez une pro proche remontent (« près de moi »)
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

    // Près de moi : bonus selon la distance de la pro la plus proche qui fait le modèle
    const pos = positionDepuisRequete(req.body || {});
    const proches = pos ? await modelesProches(pos) : new Map();
    const paliers = [1.5, 1, 0.5].map(b => [...proches.entries()].filter(([, p]) => bonusProximite(p.distance_km) === b).map(([id]) => id));
    const bonus = { $switch: { branches: paliers.map((ids, i) => ({ case: { $in: ['$_id', ids] }, then: [1.5, 1, 0.5][i] })), default: 0 } };

    // Vraies prestations en priorité, puis inspiration ; mélange aléatoire dans chaque groupe
    const modeles = await Modele.aggregate([
      { $match: match },
      // Réservables d'abord (offres de prestataires ou photo d'un vrai service), puis le reste ; hasard dans chaque groupe
      { $lookup: { from: OffreModele.collection.name, localField: '_id', foreignField: 'modele_id', as: '_offres', pipeline: [{ $limit: 1 }] } },
      { $addFields: { _score: { $add: [{ $cond: [{ $or: [{ $eq: ['$source', 'prestataire'] }, { $gt: [{ $size: '$_offres' }, 0] }] }, 1, 0] }, bonus, { $multiply: [{ $rand: {} }, 0.9] }] } } },
      { $sort: { _score: -1 } },
      { $limit: 20 },
      { $project: { _score: 0, recherche: 0, _offres: 0 } },
    ]);
    const enrichis = await enrichirOffres(modeles.map(({ _id, ...m }) => ({ id: _id, ...m })));
    res.json({ modeles: enrichis.map(m => (proches.has(m.id) ? { ...m, proche: proches.get(m.id) } : m)) });
  } catch (e) {
    serverError(res, e, 'modeles/feed');
  }
});

/**
 * Modèles réservables dans une commune : vraies photos de ses pros + modèles qu'elles proposent.
 * domicile = true : modèles qu'une pro vient réaliser À DOMICILE dans cette commune (zone de déplacement).
 */
async function filtreCommune(nom: unknown, domicile = false): Promise<Record<string, any> | null> {
  const c = communeParNom(nom);
  if (!c) return null;
  const filtrePros = domicile
    ? { $or: [{ zones_deplacement: c.nom }, { commune: c.nom, zones_deplacement: { $size: 0 } }] }
    : { commune: c.nom };
  const pros = (await Prestataire.find({ ...filtrePros, is_active: { $ne: false } }).select('_id')).map(p => p._id as number);
  if (!pros.length) return { _id: { $in: [] } };
  if (!domicile) {
    const viaOffres = await OffreModele.distinct('modele_id', { prestataire_id: { $in: pros } });
    return { $or: [{ source: 'prestataire', prestataire_id: { $in: pros } }, { _id: { $in: viaOffres } }] };
  }
  const servicesDomicile = await Service.distinct('_id', { prestataire_id: { $in: pros }, is_domicile: true, is_active: true, deleted_at: null });
  const viaOffres = await OffreModele.distinct('modele_id', { service_id: { $in: servicesDomicile } });
  return { $or: [{ source: 'prestataire', service_id: { $in: servicesDomicile } }, { _id: { $in: viaOffres } }] };
}

// GET /api/modeles/recherche?q=&categorie=&commune=&domicile=1&page= — grille de résultats
router.get('/recherche', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1);
    const limit = 30;
    const match: Record<string, any> = { is_active: true };
    if (estCategorie(req.query.categorie)) match.categorie = req.query.categorie;
    if (typeof req.query.q === 'string' && req.query.q.trim()) Object.assign(match, filtreRecherche(req.query.q));
    const parCommune = await filtreCommune(req.query.commune, req.query.domicile === '1');
    if (parCommune) match.$and = [...(match.$and || []), parCommune];

    const [modeles, total] = await Promise.all([
      Modele.find(match).select(CHAMPS_PUBLICS).sort({ source: -1, nombre_likes: -1, created_at: -1 }).skip((page - 1) * limit).limit(limit),
      Modele.countDocuments(match),
    ]);
    res.json({ modeles: await enrichirOffres(modeles), page, total, hasMore: page * limit < total });
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
    res.json({ modeles: await enrichirOffres(modeles.sort((a, b) => (ordre.get(a._id as number)! - ordre.get(b._id as number)!))) });
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
    res.json({ modeles: await enrichirOffres(modeles.sort((a, b) => ordre.get(a._id as number)! - ordre.get(b._id as number)!)) });
  } catch (e) {
    serverError(res, e, 'modeles/mes-likes');
  }
});

// GET /api/modeles/:id?lat=&lng=|commune=&domicile=1 — détail + « Où le faire ? » (les plus proches d'abord si position)
router.get('/:id(\\d+)', async (req: Request, res: Response) => {
  try {
    const modele = await Modele.findOne({ _id: Number(req.params.id) }).select(`${CHAMPS_PUBLICS} recherche is_active`);
    if (!modele) return res.status(404).json({ error: 'Modèle introuvable' });
    const pos = positionDepuisRequete(req.query as Record<string, unknown>);

    // Sous-catégories de la même famille (coiffure, ongles…)
    const [cats, sous] = await Promise.all([Category.find({ is_active: { $ne: false } }).select('nom'), SubCategory.find({ is_active: { $ne: false } }).select('nom categorie_id')]);
    const nomCat = new Map(cats.map(c => [c._id as number, c.nom]));
    const sousIds = sous.filter(s => categorieModelePour(nomCat.get(s.categorie_id) || '', s.nom) === modele.categorie).map(s => s._id as number);

    // Services actifs de la famille, en privilégiant ceux dont le nom ressemble au modèle
    const services = await Service.find({ sous_categorie_id: { $in: sousIds }, is_active: true, deleted_at: null })
      .select('nom prix prestataire_id photos is_domicile').limit(300);
    const motsModele = new Set([...(modele.tags || []), ...normaliser(modele.titre).split(' ')].filter(w => w.length > 2));
    const score = (nom: string) => normaliser(nom).split(' ').filter(w => motsModele.has(w)).length;

    const prestIds = [...new Set(services.map(s => s.prestataire_id))];
    const prestataires = await Prestataire.find({ _id: { $in: prestIds }, is_active: { $ne: false } })
      .select('nom_commercial ville commune adresse latitude longitude zones_deplacement frais_deplacement note_moyenne nombre_avis is_verified photos_etablissement plan_actuel_id abonnement_expires_at');
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

    // 1) Ceux qui se sont proposés pour CE modèle (+ le salon dont c'est la vraie photo)
    const offres = await offresDuModele(modele._id as number, pos);
    if (modele.source === 'prestataire' && modele.service_id && modele.prestataire_id && !offres.some(o => o.prestataire.id === modele.prestataire_id)) {
      const s: any = await Service.findOne({ _id: modele.service_id, is_active: true, deleted_at: null }).select('nom prix duree_minutes is_domicile');
      const p: any = prestById.get(modele.prestataire_id) || await Prestataire.findOne({ _id: modele.prestataire_id, is_active: { $ne: false } });
      if (s && p) offres.unshift({
        prestataire: { id: p._id, nom_commercial: p.nom_commercial, ville: p.ville, note_moyenne: p.note_moyenne, nombre_avis: p.nombre_avis, is_verified: p.is_verified, is_pro: premium(p), photo: Array.isArray(p.photos_etablissement) ? p.photos_etablissement[0] || null : null, ...infoDistance(p, pos), ...infoDomicile(p, s, pos) },
        service: { id: s._id, nom: s.nom, prix: s.prix, duree_minutes: s.duree_minutes, is_domicile: s.is_domicile },
      });
    }
    if (pos) offres.sort((a, b) => comparerProximite(cleOffre(a), cleOffre(b)));
    const dejaListes = new Set(offres.map(o => o.prestataire.id));

    // 2) Salons qui font des styles proches (même famille), en complément
    let ou = [...meilleur.entries()].filter(([pid]) => !dejaListes.has(pid)).map(([pid, { service, score: sc }]) => {
      const p: any = prestById.get(pid);
      const photo = Array.isArray(p.photos_etablissement) ? p.photos_etablissement[0] : null;
      const info = infoDistance(p, pos);
      return {
        prestataire: { id: pid, nom_commercial: p.nom_commercial, ville: p.ville, note_moyenne: p.note_moyenne, nombre_avis: p.nombre_avis, is_verified: p.is_verified, photo, ...info, ...infoDomicile(p, service, pos) },
        service: { id: service._id, nom: service.nom, prix: service.prix, is_domicile: !!service.is_domicile },
        _rang: (pid === modele.prestataire_id ? 100 : 0) + sc * 10 + (premium(p) ? 5 : 0) + (p.note_moyenne || 0),
      };
    });
    ou.sort((a, b) => b._rang - a._rang);
    if (pos) {
      // Position connue : les 5 plus proches parmi les 15 plus pertinentes
      ou = ou.slice(0, 15).sort((a, b) => comparerProximite(
        { ...cleOffre(a), pro: premium(prestById.get(a.prestataire.id)) },
        { ...cleOffre(b), pro: premium(prestById.get(b.prestataire.id)) }));
    }
    ou = ou.slice(0, 5);


    // 3) Le visiteur est-il prestataire, et s'est-il déjà proposé ?
    const userId = await getUserIdFromSession(req);
    const moi = userId ? await Prestataire.findOne({ user_id: userId }).select('_id') : null;
    const mienne = moi ? await OffreModele.findOne({ modele_id: modele._id, prestataire_id: moi._id }).select('service_id') : null;

    // « Elle vient chez moi » : seulement les pros qui se déplacent dans la commune de la cliente
    // (sans commune connue : toutes celles qui se déplacent à domicile)
    const domicile = req.query.domicile === '1';
    const vient = (o: any) => (!!o.service.is_domicile && o.prestataire.vient_chez_moi !== false) || (!!moi && o.prestataire.id === moi._id);
    const offresAffichees = domicile ? offres.filter(vient) : offres;
    const similairesAffiches = domicile ? ou.filter(vient) : ou;

    const { recherche: _r, ...publicModele } = modele.toJSON() as any;
    res.json({
      modele: publicModele,
      offres: offresAffichees,
      similaires: similairesAffiches.map(({ _rang, ...o }) => o),
      nb_offres_total: offres.length,
      est_prestataire: !!moi,
      mon_offre: mienne ? { service_id: mienne.service_id } : null,
    });
  } catch (e) {
    serverError(res, e, 'modeles/detail');
  }
});

// GET /api/modeles/pinterest?categorie= — tableaux Pinterest d'inspiration (widget officiel)
router.get('/pinterest', async (req: Request, res: Response) => {
  try {
    const filtre: Record<string, any> = { is_active: true };
    if (estCategorie(req.query.categorie)) filtre.categorie = req.query.categorie;
    res.json({ tableaux: await TableauPinterest.find(filtre).sort({ ordre: 1, _id: 1 }) });
  } catch (e) {
    serverError(res, e, 'modeles/pinterest');
  }
});

// POST /api/modeles/:id/offre — « Je sais le faire » { prix, duree_minutes, nom?, is_domicile? } ou { service_id }
router.post('/:id(\\d+)/offre', requireAuth, async (req: any, res: Response) => {
  try {
    res.json({ ok: true, ...(await creerOffre(req.userId, Number(req.params.id), req.body)) });
  } catch (e) {
    if (e instanceof ErreurOffre) return res.status(e.status).json({ error: e.message });
    serverError(res, e, 'modeles/offre');
  }
});

// DELETE /api/modeles/:id/offre — ne plus se proposer pour ce modèle
router.delete('/:id(\\d+)/offre', requireAuth, async (req: any, res: Response) => {
  try {
    await retirerOffre(req.userId, Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof ErreurOffre) return res.status(e.status).json({ error: e.message });
    serverError(res, e, 'modeles/offre-delete');
  }
});

// GET /api/modeles/mes-offres — modèles pour lesquels je me suis proposé(e)
router.get('/mes-offres', requireAuth, async (req: any, res: Response) => {
  try {
    const moi = await Prestataire.findOne({ user_id: req.userId }).select('_id');
    if (!moi) return res.json({ modeles: [] });
    const offres = await OffreModele.find({ prestataire_id: moi._id }).sort({ created_at: -1 });
    const modeles = await Modele.find({ _id: { $in: offres.map(o => o.modele_id) }, is_active: true }).select(CHAMPS_PUBLICS);
    res.json({ modeles: await enrichirOffres(modeles) });
  } catch (e) {
    serverError(res, e, 'modeles/mes-offres');
  }
});

// ─── Admin ─────────────────────────────────────────────────────────────────

// GET /api/modeles/admin/apercu — tableau de bord « beauté » du back office
router.get('/admin/apercu', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    // Chaque chiffre est calculé à part : si un calcul échoue, les autres s'affichent
    // quand même et l'erreur est renvoyée à l'admin (au lieu de tout bloquer).
    const erreurs: string[] = [];
    const sur = async <T,>(nom: string, p: PromiseLike<T>, defaut: T): Promise<T> => {
      try { return await p; } catch (e: any) {
        erreurs.push(`${nom} : ${e?.message || e}`);
        logger.error(`[modeles/admin-apercu] ${nom} : ${e?.message || e}`);
        return defaut;
      }
    };
    const il7j = new Date(Date.now() - 7 * 86400000);
    const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
    const [
      parSource, parCategorie, tableaux, likes7j, swipes7j, likesTotal, offres, prestatairesOffrants,
      nouvellesClientes, nouveauxPros, paiementsMois, paiementsAttente, topAimes,
    ] = await Promise.all([
      sur('photos par source', Modele.aggregate([{ $match: { is_active: true } }, { $group: { _id: '$source', n: { $sum: 1 } } }]), [] as any[]),
      sur('photos par catégorie', Modele.aggregate([{ $match: { is_active: true } }, { $group: { _id: '$categorie', n: { $sum: 1 } } }]), [] as any[]),
      sur('tableaux Pinterest', TableauPinterest.find().select('titre categorie url is_active derniere_synchro nb_importees derniere_erreur').sort({ created_at: -1 }), [] as any[]),
      sur('likes 7 jours', ModeleSwipe.countDocuments({ action: 'like', created_at: { $gte: il7j } }), 0),
      sur('swipes 7 jours', ModeleSwipe.countDocuments({ created_at: { $gte: il7j } }), 0),
      sur('likes total', ModeleSwipe.countDocuments({ action: 'like' }), 0),
      sur('offres', OffreModele.countDocuments(), 0),
      sur('pros qui proposent', OffreModele.distinct('prestataire_id'), [] as any[]),
      sur('nouvelles clientes', User.countDocuments({ role_id: 1, created_at: { $gte: il7j } }), 0),
      sur('nouvelles pros', User.countDocuments({ role_id: 2, created_at: { $gte: il7j } }), 0),
      sur('paiements du mois', PaiementEnLigne.aggregate([{ $match: { statut: 'paye', paye_at: { $gte: debutMois } } }, { $group: { _id: null, n: { $sum: 1 }, montant: { $sum: '$montant' } } }]), [] as any[]),
      sur('paiements en attente', PaiementEnLigne.countDocuments({ statut: 'en_attente' }), 0),
      sur('modèles les plus aimés', Modele.find({ is_active: true, nombre_likes: { $gt: 0 } }).sort({ nombre_likes: -1 }).limit(24).select(CHAMPS_PUBLICS), [] as any[]),
    ]);
    const [enrichis, placesRestantes] = await Promise.all([
      sur('offres des modèles aimés', enrichirOffres(topAimes), [] as any[]),
      sur('offre de lancement', placesOffreRestantes(), 0),
    ]);
    res.json({
      modeles: {
        total: parSource.reduce((n: number, s: any) => n + s.n, 0),
        par_source: Object.fromEntries(parSource.map((s: any) => [s._id, s.n])),
        par_categorie: Object.fromEntries(parCategorie.map((c: any) => [c._id, c.n])),
      },
      tableaux,
      activite: { likes_7j: likes7j, swipes_7j: swipes7j, likes_total: likesTotal, nouvelles_clientes_7j: nouvellesClientes, nouveaux_pros_7j: nouveauxPros },
      offres: { total: offres, prestataires: prestatairesOffrants.length },
      offre_lancement: { places_restantes: placesRestantes, places_total: PLACES_OFFRE_LANCEMENT },
      paiements: { mois_nb: paiementsMois[0]?.n || 0, mois_montant: paiementsMois[0]?.montant || 0, en_attente: paiementsAttente },
      // Demande sans offre : les clientes aiment, personne ne le propose encore → prestataires à recruter
      sans_prestataire: enrichis.filter((m: any) => !m.nb_offres).slice(0, 8),
      plus_aimes: enrichis.slice(0, 8),
      config: { geniuspay: etatGeniusPay(), frontend_url: Boolean(process.env.FRONTEND_URL) },
      erreurs,
    });
  } catch (e) {
    // Message réel renvoyé à l'admin (route réservée aux admins) pour pouvoir diagnostiquer
    logger.error(`[modeles/admin-apercu] ${(e as any)?.message || e}`);
    res.status(500).json({ error: `Tableau de bord beauté : ${(e as any)?.message || e}` });
  }
});

// GET /api/modeles/admin?source=&categorie=&page=
router.get('/admin', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1);
    const limit = 40;
    const filter: Record<string, any> = {};
    if (['prestataire', 'pinterest'].includes(String(req.query.source))) filter.source = req.query.source;
    if (estCategorie(req.query.categorie)) filter.categorie = req.query.categorie;
    const [modeles, total, stats] = await Promise.all([
      Modele.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit),
      Modele.countDocuments(filter),
      Modele.aggregate([{ $match: { is_active: true } }, { $group: { _id: { source: '$source', categorie: '$categorie' }, n: { $sum: 1 } } }]),
    ]);
    res.json({ modeles, total, page, totalPages: Math.ceil(total / limit), stats });
  } catch (e) {
    serverError(res, e, 'modeles/admin');
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

// DELETE /api/modeles/admin/:id — supprimer (épingles Pinterest uniquement)
router.delete('/admin/:id(\\d+)', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const r = await Modele.deleteOne({ _id: Number(req.params.id), source: 'pinterest' });
    if (!r.deletedCount) return res.status(400).json({ error: 'Seules les épingles Pinterest peuvent être supprimées (masquez les autres).' });
    await ModeleSwipe.deleteMany({ modele_id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (e) {
    serverError(res, e, 'modeles/admin-delete');
  }
});

// POST /api/modeles/admin/lien-pinterest { url, categorie, titre? }
// UNE seule case pour l'admin : un lien d'épingle → ajoutée au fil ;
// un lien de tableau → suivi automatique (épingles importées maintenant puis toutes les 6 h).
/** Explique quoi faire quand le lien collé n'est ni une photo ni un tableau. */
function messageLienPinterest(brut: string): string {
  let u: URL | null = null;
  try { u = new URL(brut); } catch { /* pas une URL */ }
  if (!u || !/(^|\.)pinterest\.[a-z.]{2,6}$|^pin\.it$/i.test(u.hostname)) {
    return "Ce lien n'est pas un lien Pinterest. Copie l'adresse d'une page Pinterest (elle commence par https://…pinterest.com/).";
  }
  const seg = u.pathname.split('/').filter(Boolean);
  if (seg[0] === 'search') {
    return "C'est une page de RECHERCHE Pinterest : Pinterest ne permet pas d'importer une recherche. Clique sur une photo qui te plaît, puis copie l'adresse de cette photo (…/pin/…) et colle-la ici.";
  }
  if (seg.length === 1) {
    return "C'est la page d'un PROFIL Pinterest. Ouvre un de ses tableaux (ou une photo), puis copie cette adresse-là.";
  }
  if (seg[0] === 'ideas' || seg[0] === 'today' || seg[0] === 'explore') {
    return "C'est une page d'idées Pinterest, qui ne peut pas être importée. Clique sur une photo, puis copie l'adresse de cette photo (…/pin/…).";
  }
  return "Ce lien Pinterest n'est ni une photo (…/pin/…) ni un tableau (…/compte/tableau/). Ouvre une photo ou un tableau, puis copie son adresse.";
}

const TITRES_PAR_DEFAUT: Record<string, string> = { coiffure: 'Coiffure', ongles: 'Ongles', maquillage: 'Maquillage', cils: 'Cils & sourcils', soins: 'Soins' };
router.post('/admin/lien-pinterest', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { categorie } = req.body || {};
    if (!estCategorie(categorie)) return res.status(400).json({ error: 'Choisis une catégorie' });
    const titre = String(req.body?.titre || '').trim().slice(0, 80) || TITRES_PAR_DEFAUT[categorie];
    const brut = String(req.body?.url || '').trim();

    // 1) Une épingle (une photo)
    const pin = await epinglePinterestValide(brut);
    if (pin) {
      if (await Modele.exists({ source_externe_id: `pinterest:${pin.id}` })) {
        await Modele.updateOne({ source_externe_id: `pinterest:${pin.id}` }, { is_active: true, retire_avec_tableau: false });
        return res.json({ ok: true, type: 'epingle', message: 'Cette photo est déjà dans le fil' });
      }
      await Modele.create({
        titre, categorie, tags: [...new Set(normaliser(titre).split(' ').filter(w => w.length > 2))], photo_url: '', pin_url: pin.url, source: 'pinterest',
        credit_nom: 'Pinterest', credit_url: pin.url, source_externe_id: `pinterest:${pin.id}`, recherche: texteRecherche([titre, categorie]),
      });
      return res.json({ ok: true, type: 'epingle', message: 'Photo ajoutée au fil ✅' });
    }

    // 2) Un tableau (suivi automatique)
    const url = tableauPinterestValide(brut);
    if (url) {
      let t: any = await TableauPinterest.findOne({ url });
      if (!t) t = await TableauPinterest.create({ url, titre, categorie, ordre: await TableauPinterest.countDocuments() });
      try {
        const r = await synchroniserTableau(t._id as number);
        return res.json({ ok: true, type: 'tableau', message: `Tableau suivi ✅ ${r.importees} photo(s) ajoutée(s). Les nouvelles arriveront toutes seules.` });
      } catch (e: any) {
        return res.json({ ok: false, type: 'tableau', message: `Tableau enregistré, mais Pinterest répond : ${e.message}` });
      }
    }

    return res.status(400).json({ error: messageLienPinterest(brut) });
  } catch (e) {
    serverError(res, e, 'modeles/lien-pinterest');
  }
});

// POST /api/modeles/admin/epingles { urls: string[] | string, categorie, titre, tags? }
// Ajoute des épingles Pinterest au fil (affichées par le widget officiel, rien n'est copié)
router.post('/admin/epingles', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { categorie, titre, tags } = req.body || {};
    if (!estCategorie(categorie)) return res.status(400).json({ error: 'Catégorie invalide' });
    if (typeof titre !== 'string' || !titre.trim()) return res.status(400).json({ error: 'Titre requis (ex. Knotless braids)' });
    const brutes: string[] = (Array.isArray(req.body?.urls) ? req.body.urls : String(req.body?.urls || '').split(/[\s,]+/))
      .map((u: string) => String(u).trim()).filter(Boolean).slice(0, 100);
    if (!brutes.length) return res.status(400).json({ error: 'Collez au moins un lien d\'épingle' });

    let ajoutees = 0, doublons = 0;
    const refusees: string[] = [];
    const listeTags = [...new Set(normaliser(`${titre} ${tags || ''}`).split(' ').filter(w => w.length > 2))];
    for (const brute of brutes) {
      const pin = await epinglePinterestValide(brute);
      if (!pin) { refusees.push(brute); continue; }
      if (await Modele.exists({ source_externe_id: `pinterest:${pin.id}` })) { doublons++; continue; }
      try {
        await Modele.create({
          titre: titre.trim(), categorie, tags: listeTags, photo_url: '', pin_url: pin.url, source: 'pinterest',
          credit_nom: 'Pinterest', credit_url: pin.url, source_externe_id: `pinterest:${pin.id}`,
          recherche: texteRecherche([titre, tags, categorie]),
        });
        ajoutees++;
      } catch (e: any) {
        if (e?.code === 11000) doublons++; else throw e;
      }
    }
    res.json({ ok: true, ajoutees, doublons, refusees });
  } catch (e) {
    serverError(res, e, 'modeles/admin-epingles');
  }
});

// POST /api/modeles/admin/pinterest { url, titre, categorie }
router.post('/admin/pinterest', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const url = tableauPinterestValide(req.body?.url);
    if (!url) return res.status(400).json({ error: 'Collez le lien d\'un TABLEAU Pinterest (ex. https://www.pinterest.com/prestaci/tresses/), pas d\'une épingle' });
    const titre = String(req.body?.titre || '').trim().slice(0, 80);
    if (!titre) return res.status(400).json({ error: 'Titre requis' });
    if (!estCategorie(req.body?.categorie)) return res.status(400).json({ error: 'Catégorie invalide' });
    if (await TableauPinterest.exists({ url })) return res.status(409).json({ error: 'Ce tableau est déjà ajouté' });
    const t = await TableauPinterest.create({ url, titre, categorie: req.body.categorie, ordre: await TableauPinterest.countDocuments() });
    // Première synchronisation immédiate : les épingles arrivent tout de suite dans le fil
    let synchro: { importees: number; ignorees: number } | null = null;
    let erreur: string | null = null;
    try { synchro = await synchroniserTableau(t._id as number); } catch (e: any) { erreur = e.message; }
    res.json({ ok: true, tableau: await TableauPinterest.findById(t._id), synchro, erreur });
  } catch (e) {
    serverError(res, e, 'modeles/admin-pinterest');
  }
});

// POST /api/modeles/admin/pinterest/synchroniser — tout resynchroniser maintenant
router.post('/admin/pinterest/synchroniser', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    await synchroniserTousLesTableaux();
    res.json({ ok: true, tableaux: await TableauPinterest.find().sort({ ordre: 1, _id: 1 }) });
  } catch (e) {
    serverError(res, e, 'modeles/admin-pinterest-sync');
  }
});

// DELETE /api/modeles/admin/pinterest/:id
router.delete('/admin/pinterest/:id(\\d+)', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await TableauPinterest.deleteOne({ _id: id });
    // Retirer ses épingles du fil, sauf celles où des prestataires se sont proposés
    const avecOffres = await OffreModele.distinct('modele_id');
    await Modele.updateMany({ tableau_id: id, source: 'pinterest', is_active: true, _id: { $nin: avecOffres } }, { is_active: false, retire_avec_tableau: true, updated_at: new Date() });
    res.json({ ok: true });
  } catch (e) {
    serverError(res, e, 'modeles/admin-pinterest-delete');
  }
});

export default router;
