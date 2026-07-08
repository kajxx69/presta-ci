/**
 * Migration: Marque les sous-catégories "article/commande" (booking_type = 'order')
 * au lieu du défaut 'appointment' (rendez-vous).
 *
 * Concerne les sous-catégories où le client commande un article/livrable
 * (quantité, spécifications, date souhaitée) plutôt qu'un créneau horaire.
 *
 * Run: npx tsx src/migrations/set-order-booking-types.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation';

// Identifiées par nom (plus robuste que par _id, qui peut varier selon l'environnement)
const ORDER_SUBCATEGORY_NAMES = [
  'Cartes de visite',
  'Flyers & Affiches',
  'Logo & Identité visuelle',
  'Infographie',
  'Bouquets & Compositions',
  'Pâtisserie & Gâteaux',
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const col = mongoose.connection.db!.collection('subcategories');

  const before = await col.find({ nom: { $in: ORDER_SUBCATEGORY_NAMES } }).toArray();
  console.log('\n=== AVANT ===');
  before.forEach(s => console.log(`[${s._id}] "${s.nom}" booking_type=${s.booking_type}`));

  const result = await col.updateMany(
    { nom: { $in: ORDER_SUBCATEGORY_NAMES } },
    { $set: { booking_type: 'order' } }
  );
  console.log(`\n${result.modifiedCount} sous-catégorie(s) mise(s) à jour sur ${result.matchedCount} trouvée(s)`);

  const missing = ORDER_SUBCATEGORY_NAMES.filter(name => !before.some(s => s.nom === name));
  if (missing.length > 0) {
    console.warn('⚠️  Non trouvées (vérifier orthographe/existence):', missing);
  }

  const after = await col.find({ nom: { $in: ORDER_SUBCATEGORY_NAMES } }).toArray();
  console.log('\n=== APRÈS ===');
  after.forEach(s => console.log(`[${s._id}] "${s.nom}" booking_type=${s.booking_type}`));

  console.log('\n✅ Done');
  await mongoose.disconnect();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
