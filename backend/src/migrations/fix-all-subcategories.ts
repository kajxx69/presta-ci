/**
 * Migration: Rebuild all subcategories to match the definitive reference
 * - Adds missing subcategories for: Bien-être (2), Coiffure Femme (3 → adds Coupe & Brushing), Massage (5), Fitness (11)
 * - Renumbers IDs for Coiffure Femme, Ongles, Homme, Design, Traiteur, Fleuriste, Nettoyage
 * - Deletes any stray entries
 *
 * Run: npx ts-node src/migrations/fix-all-subcategories.ts
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const SubCategorySchema = new mongoose.Schema(
  { _id: Number, categorie_id: Number, nom: String, description: String, ordre_affichage: Number, is_active: { type: Boolean, default: true } },
  { _id: false }
);
const SubCategory = mongoose.model('sous_categories', SubCategorySchema);

const CounterSchema = new mongoose.Schema({ _id: String, seq: Number }, { _id: false });
const Counter = mongoose.model('counters', CounterSchema);

const SUBCATEGORIES = [
  // Beauté & Esthétique (1)
  { _id: 1, categorie_id: 1, nom: 'Maquillage', description: 'Services de maquillage professionnel', ordre_affichage: 1 },
  { _id: 2, categorie_id: 1, nom: 'Épilation', description: "Services d'épilation", ordre_affichage: 2 },
  { _id: 3, categorie_id: 1, nom: 'Soins du visage', description: 'Nettoyage et soins faciaux', ordre_affichage: 3 },
  // Bien-être (2)
  { _id: 4, categorie_id: 2, nom: 'Relaxation & Détente', description: 'Soins de relaxation et détente profonde', ordre_affichage: 1 },
  { _id: 5, categorie_id: 2, nom: 'Soins corporels', description: 'Enveloppements, gommages et soins du corps', ordre_affichage: 2 },
  { _id: 6, categorie_id: 2, nom: 'Aromathérapie', description: "Thérapies par les huiles essentielles", ordre_affichage: 3 },
  // Coiffure Femme (3)
  { _id: 7, categorie_id: 3, nom: 'Coupe & Brushing', description: 'Coupe de cheveux et mise en forme', ordre_affichage: 1 },
  { _id: 8, categorie_id: 3, nom: 'Tresses & Nattes', description: 'Tresses africaines, vanilles, box braids', ordre_affichage: 2 },
  { _id: 9, categorie_id: 3, nom: 'Défrisage & Extensions', description: 'Lissage, défrisage, pose de rajouts', ordre_affichage: 3 },
  { _id: 10, categorie_id: 3, nom: 'Coloration', description: 'Coloration et mèches', ordre_affichage: 4 },
  { _id: 11, categorie_id: 3, nom: 'Tissage & Perruques', description: 'Pose tissage, entretien perruques', ordre_affichage: 5 },
  // Ongles (4)
  { _id: 12, categorie_id: 4, nom: 'Manucure', description: 'Soins des mains et ongles', ordre_affichage: 1 },
  { _id: 13, categorie_id: 4, nom: 'Pédicure', description: 'Soins des pieds et ongles', ordre_affichage: 2 },
  { _id: 14, categorie_id: 4, nom: 'Nail art', description: "Décoration d'ongles artistique", ordre_affichage: 3 },
  // Massage (5)
  { _id: 15, categorie_id: 5, nom: 'Massage relaxant', description: 'Massage doux pour la détente et le stress', ordre_affichage: 1 },
  { _id: 16, categorie_id: 5, nom: 'Massage thérapeutique', description: 'Massage ciblé pour douleurs et tensions musculaires', ordre_affichage: 2 },
  { _id: 17, categorie_id: 5, nom: 'Réflexologie', description: 'Stimulation des points réflexes des pieds et des mains', ordre_affichage: 3 },
  // Coiffure Homme (6)
  { _id: 18, categorie_id: 6, nom: 'Coupe & Dégradé', description: 'Coupes masculines classiques et modernes', ordre_affichage: 1 },
  { _id: 19, categorie_id: 6, nom: 'Barbe & Rasage', description: 'Taille de barbe, rasage traditionnel', ordre_affichage: 2 },
  // Imprimerie & Design (7)
  { _id: 20, categorie_id: 7, nom: 'Cartes de visite', description: 'Conception et impression de cartes de visite', ordre_affichage: 1 },
  { _id: 21, categorie_id: 7, nom: 'Flyers & Affiches', description: 'Flyers, affiches publicitaires, kakémonos', ordre_affichage: 2 },
  { _id: 22, categorie_id: 7, nom: 'Logo & Identité visuelle', description: 'Création de logo, charte graphique', ordre_affichage: 3 },
  { _id: 23, categorie_id: 7, nom: 'Infographie', description: 'Retouches photo, montages, bannières réseaux sociaux', ordre_affichage: 4 },
  // Traiteur & Restauration (8)
  { _id: 24, categorie_id: 8, nom: 'Buffet & Réception', description: 'Organisation de buffets pour événements', ordre_affichage: 1 },
  { _id: 25, categorie_id: 8, nom: 'Plats cuisinés à domicile', description: 'Cuisine à domicile, repas livrés', ordre_affichage: 2 },
  { _id: 26, categorie_id: 8, nom: 'Pâtisserie & Gâteaux', description: 'Gâteaux de fête, wedding cake, viennoiseries', ordre_affichage: 3 },
  // Fleuriste & Décoration (9)
  { _id: 27, categorie_id: 9, nom: 'Bouquets & Compositions', description: 'Fleurs fraîches et artificielles', ordre_affichage: 1 },
  { _id: 28, categorie_id: 9, nom: 'Décoration événementielle', description: 'Scénographie mariage, anniversaire, inauguration', ordre_affichage: 2 },
  // Nettoyage & Ménage (10)
  { _id: 29, categorie_id: 10, nom: 'Ménage à domicile', description: 'Entretien régulier du domicile', ordre_affichage: 1 },
  { _id: 30, categorie_id: 10, nom: 'Nettoyage après travaux', description: 'Grand nettoyage post-chantier', ordre_affichage: 2 },
  { _id: 31, categorie_id: 10, nom: 'Pressing & Blanchisserie', description: 'Lavage, repassage, pressing vêtements', ordre_affichage: 3 },
  // Fitness (11)
  { _id: 32, categorie_id: 11, nom: 'Coaching personnel', description: 'Accompagnement sportif personnalisé', ordre_affichage: 1 },
  { _id: 33, categorie_id: 11, nom: 'Cours collectifs', description: 'Zumba, yoga, pilates et sports collectifs', ordre_affichage: 2 },
  { _id: 34, categorie_id: 11, nom: 'Nutrition & Diététique', description: 'Conseils nutritionnels et plans alimentaires', ordre_affichage: 3 },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation');
  console.log('Connected to MongoDB');

  const col = mongoose.connection.db!.collection('sous_categories');

  // Wipe and reinsert cleanly
  await col.deleteMany({});
  console.log('Deleted all existing sous_categories');

  await col.insertMany(SUBCATEGORIES.map(s => ({ ...s, is_active: true })));
  console.log(`Inserted ${SUBCATEGORIES.length} sous_categories`);

  await Counter.findByIdAndUpdate('sous_categories', { seq: 34 }, { upsert: true });
  console.log('Counter updated to 34');

  // Verify
  const count = await col.countDocuments();
  console.log(`\n✅ Total sous_categories in DB: ${count}`);
  const byCat = await col.aggregate([
    { $group: { _id: '$categorie_id', count: { $sum: 1 }, noms: { $push: '$nom' } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  const catNames: Record<number, string> = {
    1: 'Beauté & Esthétique', 2: 'Bien-être', 3: 'Coiffure Femme', 4: 'Ongles',
    5: 'Massage', 6: 'Coiffure Homme', 7: 'Imprimerie & Design',
    8: 'Traiteur & Restauration', 9: 'Fleuriste & Décoration',
    10: 'Nettoyage & Ménage', 11: 'Fitness'
  };
  for (const g of byCat) {
    console.log(`  [${g._id}] ${catNames[g._id as number] || '?'}: ${(g.noms as string[]).join(', ')}`);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
