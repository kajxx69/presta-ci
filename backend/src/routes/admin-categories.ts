import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Category, SubCategory, Service } from '../models/index.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/categories
router.get('/', async (req, res) => {
  try {
    const { include_inactive } = req.query;
    const filter = include_inactive ? {} : { is_active: true };
    const categories = await Category.find(filter).sort({ nom: 1 });

    const results = await Promise.all(categories.map(async (c) => {
      const subCats = await SubCategory.find({ categorie_id: c._id });
      const subIds = subCats.map(s => s._id);
      const serviceCount = await Service.countDocuments({ sous_categorie_id: { $in: subIds }, deleted_at: null });
      return {
        ...c.toJSON(),
        nombre_sous_categories: subCats.length, nombre_services: serviceCount,
        sous_categories_count: subCats.length, services_count: serviceCount
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/categories/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ error: 'Catégorie non trouvée' });

    const sousCategories = await SubCategory.find({ categorie_id: id }).sort({ ordre_affichage: 1, nom: 1 });
    const subIds = sousCategories.map(s => s._id);
    const serviceCount = await Service.countDocuments({ sous_categorie_id: { $in: subIds }, deleted_at: null });

    const scWithCounts = await Promise.all(sousCategories.map(async (sc) => {
      const count = await Service.countDocuments({ sous_categorie_id: sc._id, deleted_at: null });
      return { ...sc.toJSON(), nombre_services: count };
    }));

    res.json({ ...category.toJSON(), nombre_sous_categories: sousCategories.length, nombre_services: serviceCount, sous_categories: scWithCounts });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/categories
router.post('/', async (req, res) => {
  try {
    const { nom, description, icone, couleur } = req.body;
    if (!nom || !description) return res.status(400).json({ error: 'Nom et description requis' });

    const existing = await Category.findOne({ nom });
    if (existing) return res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà' });

    const category = await Category.create({ nom, description, icone: icone || 'folder', couleur: couleur || '#3B82F6' });
    res.status(201).json({ success: true, message: 'Catégorie créée', id: category._id });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/categories/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nom, description, icone, couleur, is_active } = req.body;

    const existing = await Category.findById(id);
    if (!existing) return res.status(404).json({ error: 'Catégorie non trouvée' });

    if (nom && nom !== existing.nom) {
      const duplicate = await Category.findOne({ nom, _id: { $ne: id } });
      if (duplicate) return res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà' });
    }

    const update: any = { updated_at: new Date() };
    if (nom) update.nom = nom;
    if (description) update.description = description;
    if (icone) update.icone = icone;
    if (couleur) update.couleur = couleur;
    if (typeof is_active === 'boolean') update.is_active = is_active;

    if (Object.keys(update).length === 1) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });

    await Category.updateOne({ _id: id }, update);
    res.json({ success: true, message: 'Catégorie mise à jour' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ error: 'Catégorie non trouvée' });

    const subCats = await SubCategory.find({ categorie_id: id });
    const subIds = subCats.map(s => s._id);
    const serviceCount = await Service.countDocuments({ sous_categorie_id: { $in: subIds }, deleted_at: null });
    if (serviceCount > 0) return res.status(400).json({ error: 'Impossible de supprimer une catégorie contenant des services' });

    await SubCategory.deleteMany({ categorie_id: id });
    await Category.deleteOne({ _id: id });
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/categories/subcategories/all
router.get('/subcategories/all', async (req, res) => {
  try {
    const { categorie_id, include_inactive } = req.query;
    const filter: any = {};
    if (categorie_id) filter.categorie_id = parseInt(categorie_id as string);
    if (!include_inactive) filter.is_active = true;

    const sousCategories = await SubCategory.find(filter).sort({ ordre_affichage: 1, nom: 1 });

    const results = await Promise.all(sousCategories.map(async (sc) => {
      const category = await Category.findById(sc.categorie_id).select('nom');
      const count = await Service.countDocuments({ sous_categorie_id: sc._id, deleted_at: null });
      return { ...sc.toJSON(), categorie_nom: category?.nom || null, nombre_services: count };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/categories/:id/subcategories
router.post('/:id/subcategories', async (req, res) => {
  try {
    const categorieId = parseInt(req.params.id);
    const { nom, description } = req.body;
    if (!nom || !description) return res.status(400).json({ error: 'Nom et description requis' });

    const category = await Category.findById(categorieId);
    if (!category) return res.status(404).json({ error: 'Catégorie non trouvée' });

    const existing = await SubCategory.findOne({ nom, categorie_id: categorieId });
    if (existing) return res.status(400).json({ error: 'Une sous-catégorie avec ce nom existe déjà dans cette catégorie' });

    const maxOrder = await SubCategory.find({ categorie_id: categorieId }).sort({ ordre_affichage: -1 }).limit(1);
    const nextOrder = maxOrder.length > 0 ? (maxOrder[0].ordre_affichage || 0) + 1 : 1;

    const sc = await SubCategory.create({ nom, description, categorie_id: categorieId, ordre_affichage: nextOrder });
    res.status(201).json({ success: true, message: 'Sous-catégorie créée', id: sc._id });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/categories/subcategories/:id
router.put('/subcategories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nom, description, is_active, icone, ordre_affichage } = req.body;

    const existing = await SubCategory.findById(id);
    if (!existing) return res.status(404).json({ error: 'Sous-catégorie non trouvée' });

    if (nom && nom !== existing.nom) {
      const duplicate = await SubCategory.findOne({ nom, categorie_id: existing.categorie_id, _id: { $ne: id } });
      if (duplicate) return res.status(400).json({ error: 'Une sous-catégorie avec ce nom existe déjà dans cette catégorie' });
    }

    const update: any = { updated_at: new Date() };
    if (nom) update.nom = nom;
    if (description) update.description = description;
    if (typeof is_active === 'boolean') update.is_active = is_active;
    if (icone !== undefined) update.icone = icone;
    if (ordre_affichage !== undefined) update.ordre_affichage = ordre_affichage;

    if (Object.keys(update).length === 1) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });

    await SubCategory.updateOne({ _id: id }, update);
    res.json({ success: true, message: 'Sous-catégorie mise à jour' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/categories/:id/subcategories/reorder
router.put('/:id/subcategories/reorder', async (req, res) => {
  try {
    const categorieId = parseInt(req.params.id);
    const { order } = req.body as { order: Array<{ id: number; ordre_affichage?: number }> };

    if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'Ordre invalide fourni' });

    const ids = order.map(item => item.id).filter(id => typeof id === 'number');
    if (ids.length !== order.length) return res.status(400).json({ error: 'Identifiants de sous-catégories manquants' });

    const existing = await SubCategory.find({ categorie_id: categorieId, _id: { $in: ids } });
    if (existing.length !== ids.length) return res.status(400).json({ error: 'Certaines sous-catégories sont invalides' });

    await Promise.all(order.map((item, index) => {
      const finalOrder = typeof item.ordre_affichage === 'number' ? item.ordre_affichage : index + 1;
      return SubCategory.updateOne({ _id: item.id, categorie_id: categorieId }, { ordre_affichage: finalOrder, updated_at: new Date() });
    }));

    res.json({ success: true, message: 'Ordre des sous-catégories mis à jour' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/categories/subcategories/:id
router.delete('/subcategories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sc = await SubCategory.findById(id);
    if (!sc) return res.status(404).json({ error: 'Sous-catégorie non trouvée' });

    const serviceCount = await Service.countDocuments({ sous_categorie_id: id, deleted_at: null });
    if (serviceCount > 0) return res.status(400).json({ error: 'Impossible de supprimer une sous-catégorie contenant des services' });

    await SubCategory.deleteOne({ _id: id });
    res.json({ success: true, message: 'Sous-catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
