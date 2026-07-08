/**
 * Backfill du champ GeoJSON `location` sur les prestataires existants
 * à partir de latitude/longitude. Additif et idempotent.
 *
 * Usage : npx tsx src/migrations/backfill-geo-location.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI manquant dans .env');
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const collection = db.collection('prestataires');

  const candidates = await collection.find({
    latitude: { $type: 'number' },
    longitude: { $type: 'number' },
    $or: [{ location: { $exists: false } }, { location: null }],
  }).toArray();

  let updated = 0;
  for (const doc of candidates) {
    if (!Number.isFinite(doc.latitude) || !Number.isFinite(doc.longitude)) continue;
    await collection.updateOne(
      { _id: doc._id },
      { $set: { location: { type: 'Point', coordinates: [doc.longitude, doc.latitude] } } }
    );
    updated++;
  }

  // Crée l'index 2dsphere s'il n'existe pas encore
  await collection.createIndex({ location: '2dsphere' });

  console.log(`${candidates.length} candidats, ${updated} prestataires géolocalisés, index 2dsphere OK`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Échec:', err);
  process.exit(1);
});
