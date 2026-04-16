/**
 * Migration: Remove duplicate comments (same user, same publication, same content)
 * Run: npx ts-node src/migrations/fix-duplicate-comments.ts
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation');
  console.log('Connected to MongoDB');

  const col = mongoose.connection.db!.collection('commentaire_publications');
  const all = await col.find({}).sort({ _id: 1 }).toArray();

  console.log(`Total commentaires: ${all.length}`);

  const seen = new Map<string, number>();
  const toDelete: number[] = [];

  for (const c of all) {
    const key = `${c.publication_id}|${c.user_id}|${c.contenu}`;
    if (seen.has(key)) {
      toDelete.push(c._id);
      console.log(`  Doublon trouvé: [${c._id}] pub:${c.publication_id} user:${c.user_id} "${c.contenu}"`);
    } else {
      seen.set(key, c._id);
    }
  }

  if (toDelete.length === 0) {
    console.log('Aucun doublon trouvé.');
  } else {
    await col.deleteMany({ _id: { $in: toDelete } });
    console.log(`✅ ${toDelete.length} doublon(s) supprimé(s)`);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
