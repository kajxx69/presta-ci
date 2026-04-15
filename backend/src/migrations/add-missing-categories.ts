/**
 * Migration: Add missing categories and subcategories
 * Run: npx ts-node --esm src/migrations/add-missing-categories.ts
 * Safe to re-run (upserts by _id)
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Counter } from '../models/Counter.js';
import { Category, SubCategory } from '../models/Category.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // --- New categories ---
  const newCategories = [
    { _id: 7, nom: 'Imprimerie & Design', description: 'Cartes de visite, flyers, affiches, infographie', icone: 'photography.svg', couleur: '#3B82F6', ordre_affichage: 7, is_active: true },
    { _id: 8, nom: 'Traiteur & Restauration', description: 'Buffets, plats cuisinés, service traiteur', icone: 'cooking.svg', couleur: '#F59E0B', ordre_affichage: 8, is_active: true },
    { _id: 9, nom: 'Fleuriste & Décoration', description: 'Compositions florales, décoration événementielle', icone: 'wellness.svg', couleur: '#10B981', ordre_affichage: 9, is_active: true },
    { _id: 10, nom: 'Coiffure Homme', description: 'Coupe, dégradé, barbe — services masculins', icone: 'hair.svg', couleur: '#6366F1', ordre_affichage: 10, is_active: true },
    { _id: 11, nom: 'Coiffure Femme', description: 'Coupe, tresses, défrisage, extensions — services féminins', icone: 'hair.svg', couleur: '#EC4899', ordre_affichage: 11, is_active: true },
    { _id: 12, nom: 'Nettoyage & Ménage', description: 'Entretien domicile, bureaux, après travaux', icone: 'cleaning.svg', couleur: '#14B8A6', ordre_affichage: 12, is_active: true },
  ];

  for (const cat of newCategories) {
    await Category.findByIdAndUpdate(cat._id, cat, { upsert: true });
    console.log(`✅ Category ${cat.nom} upserted`);
  }
  const maxCatId = Math.max(...newCategories.map(c => c._id));
  await Counter.findByIdAndUpdate('categories', { seq: maxCatId }, { upsert: true });

  // --- New subcategories ---
  const newSubCats = [
    // Imprimerie & Design (7)
    { _id: 10, categorie_id: 7, nom: 'Cartes de visite', description: 'Conception et impression de cartes de visite', ordre_affichage: 1, is_active: true },
    { _id: 11, categorie_id: 7, nom: 'Flyers & Affiches', description: 'Flyers, affiches publicitaires, kakémonos', ordre_affichage: 2, is_active: true },
    { _id: 12, categorie_id: 7, nom: 'Logo & Identité visuelle', description: 'Création de logo, charte graphique', ordre_affichage: 3, is_active: true },
    { _id: 13, categorie_id: 7, nom: 'Infographie', description: 'Retouches photo, montages, bannières réseaux sociaux', ordre_affichage: 4, is_active: true },
    // Traiteur & Restauration (8)
    { _id: 14, categorie_id: 8, nom: 'Buffet & Réception', description: 'Organisation de buffets pour événements', ordre_affichage: 1, is_active: true },
    { _id: 15, categorie_id: 8, nom: 'Plats cuisinés à domicile', description: 'Cuisine à domicile, repas livrés', ordre_affichage: 2, is_active: true },
    { _id: 16, categorie_id: 8, nom: 'Pâtisserie & Gâteaux', description: 'Gâteaux de fête, wedding cake, viennoiseries', ordre_affichage: 3, is_active: true },
    // Fleuriste & Décoration (9)
    { _id: 17, categorie_id: 9, nom: 'Bouquets & Compositions', description: 'Fleurs fraîches et artificielles', ordre_affichage: 1, is_active: true },
    { _id: 18, categorie_id: 9, nom: 'Décoration événementielle', description: 'Scénographie mariage, anniversaire, inauguration', ordre_affichage: 2, is_active: true },
    // Coiffure Homme (10)
    { _id: 19, categorie_id: 10, nom: 'Coupe & Dégradé', description: 'Coupes masculines classiques et modernes', ordre_affichage: 1, is_active: true },
    { _id: 20, categorie_id: 10, nom: 'Barbe & Rasage', description: 'Taille de barbe, rasage traditionnel', ordre_affichage: 2, is_active: true },
    // Coiffure Femme (11)
    { _id: 21, categorie_id: 11, nom: 'Tresses & Nattes', description: 'Tresses africaines, vanilles, box braids', ordre_affichage: 1, is_active: true },
    { _id: 22, categorie_id: 11, nom: 'Défrisage & Extensions', description: 'Lissage, défrisage, pose de rajouts', ordre_affichage: 2, is_active: true },
    { _id: 23, categorie_id: 11, nom: 'Tissage & Perruques', description: 'Pose tissage, entretien perruques', ordre_affichage: 3, is_active: true },
    // Nettoyage & Ménage (12)
    { _id: 24, categorie_id: 12, nom: 'Ménage à domicile', description: 'Entretien régulier du domicile', ordre_affichage: 1, is_active: true },
    { _id: 25, categorie_id: 12, nom: 'Nettoyage après travaux', description: 'Grand nettoyage post-chantier', ordre_affichage: 2, is_active: true },
    { _id: 26, categorie_id: 12, nom: 'Pressing & Blanchisserie', description: 'Lavage, repassage, pressing vêtements', ordre_affichage: 3, is_active: true },
  ];

  for (const sub of newSubCats) {
    await SubCategory.findByIdAndUpdate(sub._id, sub, { upsert: true });
    console.log(`  ✅ SubCategory ${sub.nom} upserted`);
  }
  const maxSubId = Math.max(...newSubCats.map(s => s._id));
  await Counter.findByIdAndUpdate('sous_categories', { seq: maxSubId }, { upsert: true });

  console.log('\n🎉 Migration completed successfully!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
