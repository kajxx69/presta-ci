import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Category, SubCategory, Plan, Prestataire, Service, Configuration } from '../models/index.js';
import { serverError } from '../utils/http.js';
import { searchAll } from '../utils/search-engine.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('DB not connected');
    res.json({ status: 'ok', db: [{ ok: 1 }] });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/wave-payment-info — coordonnées Wave affichées au prestataire au
// moment de payer son abonnement. Route publique en lecture (pas de secret ici,
// juste un numéro de réception), modifiable depuis l'admin via /api/admin/settings
// (clés wave_payment_number / wave_payment_name) sans redéploiement.
router.get('/wave-payment-info', async (_req: Request, res: Response) => {
  try {
    const [numberDoc, nameDoc] = await Promise.all([
      Configuration.findOne({ cle: 'wave_payment_number' }),
      Configuration.findOne({ cle: 'wave_payment_name' }),
    ]);
    res.json({
      numero: numberDoc?.valeur || null,
      nom: nameDoc?.valeur || 'PrestaCI',
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

router.get('/categories', async (_req: Request, res: Response) => {
  const rows = await Category.find({ is_active: true }).sort({ ordre_affichage: 1, _id: 1 });
  res.json(rows);
});

router.get('/sous_categories', async (req: Request, res: Response) => {
  const { categorie_id } = req.query;
  const filter: any = { is_active: true };
  if (categorie_id) filter.categorie_id = Number(categorie_id);
  const rows = await SubCategory.find(filter).sort({ ordre_affichage: 1, _id: 1 });
  res.json(rows);
});

router.get('/plans_abonnement', async (_req: Request, res: Response) => {
  const rows = await Plan.find({ is_active: true }).sort({ _id: 1 });
  res.json(rows);
});

// Échappe les caractères spéciaux regex d'une saisie utilisateur
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePagination(req: Request, defaultLimit = 50) {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || defaultLimit));
  const page = Math.max(1, Number(req.query.page) || 1);
  return { limit, page, skip: (page - 1) * limit };
}

/** Distance Haversine en km */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/prestataires?ville=&q=&lat=&lng=&radius_km=&page=&limit=
router.get('/prestataires', async (req: Request, res: Response) => {
  try {
    const { ville, q, lat, lng, radius_km } = req.query;
    const { limit, page, skip } = parsePagination(req);

    const filter: any = { is_active: true };
    if (ville) filter.ville = ville;
    if (q && String(q).trim()) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ nom_commercial: rx }, { bio: rx }, { ville: rx }, { adresse: rx }];
    }

    // Recherche géolocalisée : $geoNear sur l'index 2dsphere — distances exactes
    // calculées par MongoDB, triées du plus proche au plus lointain
    if (lat && lng) {
      const latNum = Number(lat), lngNum = Number(lng);
      const radius = Math.min(200, Number(radius_km) || 25);
      if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        try {
          const results = await Prestataire.aggregate([
            {
              $geoNear: {
                near: { type: 'Point', coordinates: [lngNum, latNum] },
                distanceField: 'distance_m',
                maxDistance: radius * 1000,
                query: filter,
                spherical: true,
              },
            },
            { $skip: skip },
            { $limit: limit },
          ]);
          const total = await Prestataire.countDocuments({
            ...filter,
            location: {
              $geoWithin: { $centerSphere: [[lngNum, latNum], radius / 6371] },
            },
          });
          res.setHeader('X-Total-Count', String(total));
          return res.json(results.map((doc: any) => ({
            ...doc,
            id: doc._id,
            distance_km: Math.round((doc.distance_m / 1000) * 10) / 10,
            distance_m: undefined,
          })));
        } catch {
          // Repli sans index géo : distance Haversine calculée en mémoire
          const candidates = await Prestataire.find(filter);
          const withDistance = candidates
            .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number')
            .map(p => ({ doc: p, distance: distanceKm(latNum, lngNum, p.latitude!, p.longitude!) }))
            .filter(x => x.distance <= radius)
            .sort((a, b) => a.distance - b.distance);
          res.setHeader('X-Total-Count', String(withDistance.length));
          return res.json(withDistance.slice(skip, skip + limit).map(x => ({
            ...x.doc.toJSON(),
            distance_km: Math.round(x.distance * 10) / 10,
          })));
        }
      }
    }

    const [rows, total] = await Promise.all([
      Prestataire.find(filter).sort({ is_verified: -1, note_moyenne: -1, created_at: -1 }).skip(skip).limit(limit),
      Prestataire.countDocuments(filter),
    ]);
    res.setHeader('X-Total-Count', String(total));
    res.json(rows);
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/services?sous_categorie_id=&prestataire_id=&q=&prix_max=&page=&limit=
router.get('/services', async (req: Request, res: Response) => {
  try {
    const { sous_categorie_id, prestataire_id, q, prix_max } = req.query;
    const { limit, page, skip } = parsePagination(req);

    const filter: any = { is_active: true };
    if (sous_categorie_id) filter.sous_categorie_id = Number(sous_categorie_id);
    if (prestataire_id) filter.prestataire_id = Number(prestataire_id);
    if (prix_max && Number.isFinite(Number(prix_max))) filter.prix = { $lte: Number(prix_max) };
    if (q && String(q).trim()) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ nom: rx }, { description: rx }];
    }

    const [rows, total] = await Promise.all([
      Service.find(filter).sort({ note_moyenne: -1, created_at: -1 }).skip(skip).limit(limit),
      Service.countDocuments(filter),
    ]);
    res.setHeader('X-Total-Count', String(total));
    res.json(rows);
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /sitemap.xml — sitemap dynamique pour le référencement
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const siteBase = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
    const [prestataires, services] = await Promise.all([
      Prestataire.find({}).select('_id updated_at').sort({ _id: 1 }).limit(5000),
      Service.find({ is_active: true }).select('_id updated_at').sort({ _id: 1 }).limit(5000),
    ]);

    const urlEntry = (loc: string, lastmod?: Date) => `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`;

    const urls = [
      urlEntry(`${siteBase}/app/home`),
      ...prestataires.map(p => urlEntry(`${siteBase}/prestataires/${p._id}`, p.updated_at)),
      ...services.map(s => urlEntry(`${siteBase}/services/${s._id}`, s.updated_at)),
    ];

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
    );
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/search?q=&lat=&lng= — recherche globale intelligente (fautes de frappe,
// accents, multi-mots, synonymes, pertinence, proximité). Voir utils/search-engine.ts
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ services: [], prestataires: [] });

    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
    const lat = Number(req.query.lat), lng = Number(req.query.lng);
    const geo = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;

    const results = await searchAll(q, limit, geo);
    res.json(results);
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
