/**
 * Migration: Fix category/subcategory mess — align DB with seed.ts
 * Run: npx ts-node src/migrations/fix-categories.ts
 * Safe to re-run (upserts by _id, then deletes stray entries)
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Schema } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation';

const CounterSchema = new Schema({ _id: String, seq: Number });
const CategorySchema = new Schema({
  _id: Number, nom: String, description: String, icone: String,
  couleur: String, ordre_affichage: Number, is_active: Boolean,
}, { _id: false });
const SubCategorySchema = new Schema({
  _id: Number, categorie_id: Number, nom: String, description: String,
  ordre_affichage: Number, is_active: Boolean,
}, { _id: false });

const Counter = mongoose.model('Counter', CounterSchema, 'counters');
const Category = mongoose.model('Category', CategorySchema, 'categories');
const SubCategory = mongoose.model('SubCategory', SubCategorySchema, 'sous_categories');

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // === 1. Fix categories (upsert correct data for ids 1–11, delete 12) ===
  const correctCategories = [
    { _id: 1,  nom: 'Beauté & Esthétique',     description: 'Maquillage, épilation, soins du visage',               icone: 'beauty.svg',      couleur: '#FF69B4', ordre_affichage: 1,  is_active: true },
    { _id: 2,  nom: 'Bien-être',                description: 'Services de détente et bien-être',                     icone: 'wellness.svg',    couleur: '#9370DB', ordre_affichage: 2,  is_active: true },
    { _id: 3,  nom: 'Coiffure Femme',           description: 'Tresses, défrisage, extensions, coloration',           icone: 'hair.svg',        couleur: '#EC4899', ordre_affichage: 3,  is_active: true },
    { _id: 4,  nom: 'Ongles',                   description: 'Services de manucure et pédicure',                     icone: 'nails.svg',       couleur: '#FF6347', ordre_affichage: 4,  is_active: true },
    { _id: 5,  nom: 'Massage',                  description: 'Services de massage thérapeutique',                    icone: 'massage.svg',     couleur: '#32CD32', ordre_affichage: 5,  is_active: true },
    { _id: 6,  nom: 'Coiffure Homme',           description: 'Coupe, dégradé, barbe, rasage',                        icone: 'hair.svg',        couleur: '#6366F1', ordre_affichage: 6,  is_active: true },
    { _id: 7,  nom: 'Imprimerie & Design',      description: 'Cartes de visite, flyers, infographie, logo',          icone: 'photography.svg', couleur: '#3B82F6', ordre_affichage: 7,  is_active: true },
    { _id: 8,  nom: 'Traiteur & Restauration',  description: 'Buffets, plats cuisinés, pâtisserie',                  icone: 'cooking.svg',     couleur: '#F59E0B', ordre_affichage: 8,  is_active: true },
    { _id: 9,  nom: 'Fleuriste & Décoration',   description: 'Compositions florales, décoration événementielle',     icone: 'wellness.svg',    couleur: '#10B981', ordre_affichage: 9,  is_active: true },
    { _id: 10, nom: 'Nettoyage & Ménage',       description: 'Entretien domicile, bureaux, pressing',                icone: 'cleaning.svg',    couleur: '#14B8A6', ordre_affichage: 10, is_active: true },
    { _id: 11, nom: 'Fitness',                  description: 'Services de remise en forme',                          icone: 'fitness.svg',     couleur: '#FF4500', ordre_affichage: 11, is_active: true },
  ];

  for (const cat of correctCategories) {
    await Category.findByIdAndUpdate(cat._id, cat, { upsert: true });
    console.log(`✅ Category [${cat._id}] ${cat.nom}`);
  }

  // Delete stray categories (ids 12+ from previous bad migration)
  const deleted = await Category.deleteMany({ _id: { $gte: 12 } });
  if (deleted.deletedCount > 0) console.log(`🗑  Deleted ${deleted.deletedCount} stray category(ies) (id >= 12)`);

  await Counter.findByIdAndUpdate('categories', { seq: 11 }, { upsert: true });

  // === 2. Fix subcategories (upsert all correct ones, delete stray ids) ===
  const correctSubCats = [
    // Beauté & Esthétique (1)
    { _id: 1,  categorie_id: 1,  nom: 'Maquillage',               description: 'Services de maquillage professionnel',               ordre_affichage: 1, is_active: true },
    { _id: 2,  categorie_id: 1,  nom: 'Épilation',                 description: "Services d'épilation",                               ordre_affichage: 2, is_active: true },
    { _id: 3,  categorie_id: 1,  nom: 'Soins du visage',           description: 'Nettoyage et soins faciaux',                         ordre_affichage: 3, is_active: true },
    // Coiffure Femme (3)
    { _id: 4,  categorie_id: 3,  nom: 'Tresses & Nattes',          description: 'Tresses africaines, vanilles, box braids',           ordre_affichage: 1, is_active: true },
    { _id: 5,  categorie_id: 3,  nom: 'Défrisage & Extensions',    description: 'Lissage, défrisage, pose de rajouts',                 ordre_affichage: 2, is_active: true },
    { _id: 6,  categorie_id: 3,  nom: 'Coloration',                description: 'Coloration et mèches',                               ordre_affichage: 3, is_active: true },
    { _id: 7,  categorie_id: 3,  nom: 'Tissage & Perruques',       description: 'Pose tissage, entretien perruques',                   ordre_affichage: 4, is_active: true },
    // Ongles (4)
    { _id: 8,  categorie_id: 4,  nom: 'Manucure',                  description: 'Soins des mains et ongles',                          ordre_affichage: 1, is_active: true },
    { _id: 9,  categorie_id: 4,  nom: 'Pédicure',                  description: 'Soins des pieds et ongles',                          ordre_affichage: 2, is_active: true },
    { _id: 10, categorie_id: 4,  nom: 'Nail art',                  description: "Décoration d'ongles artistique",                     ordre_affichage: 3, is_active: true },
    // Coiffure Homme (6)
    { _id: 11, categorie_id: 6,  nom: 'Coupe & Dégradé',           description: 'Coupes masculines classiques et modernes',           ordre_affichage: 1, is_active: true },
    { _id: 12, categorie_id: 6,  nom: 'Barbe & Rasage',            description: 'Taille de barbe, rasage traditionnel',               ordre_affichage: 2, is_active: true },
    // Imprimerie & Design (7)
    { _id: 13, categorie_id: 7,  nom: 'Cartes de visite',          description: 'Conception et impression de cartes de visite',       ordre_affichage: 1, is_active: true },
    { _id: 14, categorie_id: 7,  nom: 'Flyers & Affiches',         description: 'Flyers, affiches publicitaires, kakémonos',           ordre_affichage: 2, is_active: true },
    { _id: 15, categorie_id: 7,  nom: 'Logo & Identité visuelle',  description: 'Création de logo, charte graphique',                 ordre_affichage: 3, is_active: true },
    { _id: 16, categorie_id: 7,  nom: 'Infographie',               description: 'Retouches photo, montages, bannières réseaux sociaux', ordre_affichage: 4, is_active: true },
    // Traiteur & Restauration (8)
    { _id: 17, categorie_id: 8,  nom: 'Buffet & Réception',        description: 'Organisation de buffets pour événements',            ordre_affichage: 1, is_active: true },
    { _id: 18, categorie_id: 8,  nom: 'Plats cuisinés à domicile', description: 'Cuisine à domicile, repas livrés',                   ordre_affichage: 2, is_active: true },
    { _id: 19, categorie_id: 8,  nom: 'Pâtisserie & Gâteaux',      description: 'Gâteaux de fête, wedding cake, viennoiseries',       ordre_affichage: 3, is_active: true },
    // Fleuriste & Décoration (9)
    { _id: 20, categorie_id: 9,  nom: 'Bouquets & Compositions',   description: 'Fleurs fraîches et artificielles',                   ordre_affichage: 1, is_active: true },
    { _id: 21, categorie_id: 9,  nom: 'Décoration événementielle', description: 'Scénographie mariage, anniversaire, inauguration',   ordre_affichage: 2, is_active: true },
    // Nettoyage & Ménage (10)
    { _id: 22, categorie_id: 10, nom: 'Ménage à domicile',         description: 'Entretien régulier du domicile',                     ordre_affichage: 1, is_active: true },
    { _id: 23, categorie_id: 10, nom: 'Nettoyage après travaux',   description: 'Grand nettoyage post-chantier',                      ordre_affichage: 2, is_active: true },
    { _id: 24, categorie_id: 10, nom: 'Pressing & Blanchisserie',  description: 'Lavage, repassage, pressing vêtements',              ordre_affichage: 3, is_active: true },
  ];

  for (const sub of correctSubCats) {
    await SubCategory.findByIdAndUpdate(sub._id, sub, { upsert: true });
    console.log(`  ✅ SubCat [${sub._id}] cat:${sub.categorie_id} ${sub.nom}`);
  }

  // Delete stray subcategories (ids 25+ from previous bad migration)
  const deletedSubs = await SubCategory.deleteMany({ _id: { $gte: 25 } });
  if (deletedSubs.deletedCount > 0) console.log(`🗑  Deleted ${deletedSubs.deletedCount} stray subcategory(ies) (id >= 25)`);

  await Counter.findByIdAndUpdate('sous_categories', { seq: 24 }, { upsert: true });

  console.log('\n🎉 Fix migration completed successfully!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
