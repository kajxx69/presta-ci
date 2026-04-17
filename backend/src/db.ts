import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation';

const SUBCATEGORIES = [
  { _id: 1, categorie_id: 1, nom: 'Maquillage', description: 'Services de maquillage professionnel', ordre_affichage: 1, booking_type: 'appointment' },
  { _id: 2, categorie_id: 1, nom: 'Épilation', description: "Services d'épilation", ordre_affichage: 2, booking_type: 'appointment' },
  { _id: 3, categorie_id: 1, nom: 'Soins du visage', description: 'Nettoyage et soins faciaux', ordre_affichage: 3, booking_type: 'appointment' },
  { _id: 4, categorie_id: 2, nom: 'Relaxation & Détente', description: 'Soins de relaxation et détente profonde', ordre_affichage: 1, booking_type: 'appointment' },
  { _id: 5, categorie_id: 2, nom: 'Soins corporels', description: 'Enveloppements, gommages et soins du corps', ordre_affichage: 2, booking_type: 'appointment' },
  { _id: 6, categorie_id: 2, nom: 'Aromathérapie', description: "Thérapies par les huiles essentielles", ordre_affichage: 3, booking_type: 'appointment' },
  { _id: 7, categorie_id: 3, nom: 'Coupe & Brushing', description: 'Coupe de cheveux et mise en forme', ordre_affichage: 1, booking_type: 'appointment' },
  { _id: 8, categorie_id: 3, nom: 'Tresses & Nattes', description: 'Tresses africaines, vanilles, box braids', ordre_affichage: 2, booking_type: 'appointment' },
  { _id: 9, categorie_id: 3, nom: 'Défrisage & Extensions', description: 'Lissage, défrisage, pose de rajouts', ordre_affichage: 3, booking_type: 'appointment' },
  { _id: 10, categorie_id: 3, nom: 'Coloration', description: 'Coloration et mèches', ordre_affichage: 4, booking_type: 'appointment' },
  { _id: 11, categorie_id: 3, nom: 'Tissage & Perruques', description: 'Pose tissage, entretien perruques', ordre_affichage: 5, booking_type: 'appointment' },
  { _id: 12, categorie_id: 4, nom: 'Manucure', description: 'Soins des mains et ongles', ordre_affichage: 1, booking_type: 'appointment' },
  { _id: 13, categorie_id: 4, nom: 'Pédicure', description: 'Soins des pieds et ongles', ordre_affichage: 2, booking_type: 'appointment' },
  { _id: 14, categorie_id: 4, nom: 'Nail art', description: "Décoration d'ongles artistique", ordre_affichage: 3, booking_type: 'appointment' },
  { _id: 15, categorie_id: 5, nom: 'Massage relaxant', description: 'Massage doux pour la détente et le stress', ordre_affichage: 1, booking_type: 'appointment' },
  { _id: 16, categorie_id: 5, nom: 'Massage thérapeutique', description: 'Massage ciblé pour douleurs et tensions musculaires', ordre_affichage: 2, booking_type: 'appointment' },
  { _id: 17, categorie_id: 5, nom: 'Réflexologie', description: 'Stimulation des points réflexes des pieds et des mains', ordre_affichage: 3, booking_type: 'appointment' },
  { _id: 18, categorie_id: 6, nom: 'Coupe & Dégradé', description: 'Coupes masculines classiques et modernes', ordre_affichage: 1, booking_type: 'appointment' },
  { _id: 19, categorie_id: 6, nom: 'Barbe & Rasage', description: 'Taille de barbe, rasage traditionnel', ordre_affichage: 2, booking_type: 'appointment' },
  { _id: 20, categorie_id: 7, nom: 'Cartes de visite', description: 'Conception et impression de cartes de visite', ordre_affichage: 1, booking_type: 'order' },
  { _id: 21, categorie_id: 7, nom: 'Flyers & Affiches', description: 'Flyers, affiches publicitaires, kakémonos', ordre_affichage: 2, booking_type: 'order' },
  { _id: 22, categorie_id: 7, nom: 'Logo & Identité visuelle', description: 'Création de logo, charte graphique', ordre_affichage: 3, booking_type: 'order' },
  { _id: 23, categorie_id: 7, nom: 'Infographie', description: 'Retouches photo, montages, bannières réseaux sociaux', ordre_affichage: 4, booking_type: 'order' },
  { _id: 24, categorie_id: 8, nom: 'Buffet & Réception', description: 'Organisation de buffets pour événements', ordre_affichage: 1, booking_type: 'order' },
  { _id: 25, categorie_id: 8, nom: 'Plats cuisinés à domicile', description: 'Cuisine à domicile, repas livrés', ordre_affichage: 2, booking_type: 'order' },
  { _id: 26, categorie_id: 8, nom: 'Pâtisserie & Gâteaux', description: 'Gâteaux de fête, wedding cake, viennoiseries', ordre_affichage: 3, booking_type: 'order' },
  { _id: 27, categorie_id: 9, nom: 'Bouquets & Compositions', description: 'Fleurs fraîches et artificielles', ordre_affichage: 1, booking_type: 'order' },
  { _id: 28, categorie_id: 9, nom: 'Décoration événementielle', description: 'Scénographie mariage, anniversaire, inauguration', ordre_affichage: 2, booking_type: 'order' },
  { _id: 29, categorie_id: 10, nom: 'Ménage à domicile', description: 'Entretien régulier du domicile', ordre_affichage: 1, booking_type: 'order' },
  { _id: 30, categorie_id: 10, nom: 'Nettoyage après travaux', description: 'Grand nettoyage post-chantier', ordre_affichage: 2, booking_type: 'order' },
  { _id: 31, categorie_id: 10, nom: 'Pressing & Blanchisserie', description: 'Lavage, repassage, pressing vêtements', ordre_affichage: 3, booking_type: 'order' },
  { _id: 32, categorie_id: 11, nom: 'Coaching personnel', description: 'Accompagnement sportif personnalisé', ordre_affichage: 1, booking_type: 'appointment' },
  { _id: 33, categorie_id: 11, nom: 'Cours collectifs', description: 'Zumba, yoga, pilates et sports collectifs', ordre_affichage: 2, booking_type: 'appointment' },
  { _id: 34, categorie_id: 11, nom: 'Nutrition & Diététique', description: 'Conseils nutritionnels et plans alimentaires', ordre_affichage: 3, booking_type: 'appointment' },
];

async function bootstrapSubCategories() {
  try {
    // Mongoose pluralises 'SubCategory' → 'subcategories'
    const col = mongoose.connection.db!.collection('subcategories');
    const count = await col.countDocuments();
    // Check if DB already has the correct data
    const sample = await col.findOne({ _id: 18 as any });
    const isCorrect = count === 34 && sample?.nom === 'Coupe & Dégradé' && sample?.categorie_id === 6;
    if (isCorrect) return;

    console.log(`[bootstrap] Rebuilding sous_categories (found ${count}, expected 34 with correct data)...`);
    const ops = SUBCATEGORIES.map(s => ({
      replaceOne: { filter: { _id: s._id as any }, replacement: { ...s, is_active: true }, upsert: true }
    }));
    await col.bulkWrite(ops as any, { ordered: false });
    const validIds = SUBCATEGORIES.map(s => s._id);
    await col.deleteMany({ _id: { $nin: validIds as any } });
    await mongoose.connection.db!.collection('counters').findOneAndUpdate(
      { _id: 'sous_categories' as any },
      { $set: { seq: 34 } },
      { upsert: true }
    );
    console.log('[bootstrap] sous_categories rebuilt: 34 entries');
  } catch (err) {
    console.error('[bootstrap] Failed to rebuild sous_categories:', err);
  }
}

export async function connectDB() {
  await mongoose.connect(MONGODB_URI);
  await bootstrapSubCategories();
}

export async function ping() {
  await connectDB();
  // Verify connection is alive
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection not ready');
  }
}
