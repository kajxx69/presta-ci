/**
 * Migration : convertit les images base64 stockées dans MongoDB en fichiers /uploads.
 *
 * Usage :  npx tsx src/migrations/migrate-base64-to-files.ts [--dry-run]
 *
 * --dry-run : affiche ce qui serait converti sans rien modifier.
 *
 * ⚠️ Après migration, les URLs générées pointent vers PUBLIC_BASE_URL
 * (par défaut http://localhost:4000). Définissez PUBLIC_BASE_URL dans .env
 * avant de lancer si le backend est servi sur un autre domaine.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { materializePhotos } from '../utils/uploads.js';

const DRY_RUN = process.argv.includes('--dry-run');

function isBase64(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('data:');
}

function containsBase64(value: unknown): boolean {
  if (isBase64(value)) return true;
  if (Array.isArray(value)) return value.some(containsBase64);
  return false;
}

async function migrateCollection(
  collectionName: string,
  fields: string[]
): Promise<{ scanned: number; migrated: number }> {
  const db = mongoose.connection.db!;
  const collection = db.collection(collectionName);
  const cursor = collection.find({});
  let scanned = 0;
  let migrated = 0;

  for await (const doc of cursor) {
    scanned++;
    const update: Record<string, any> = {};
    for (const field of fields) {
      if (containsBase64(doc[field])) {
        if (DRY_RUN) {
          update[field] = '(converti)';
        } else {
          try {
            update[field] = await materializePhotos(doc[field]);
          } catch (e: any) {
            console.warn(`  ⚠️ ${collectionName}#${doc._id}.${field}: ${e.message} — ignoré`);
          }
        }
      }
    }
    if (Object.keys(update).length > 0) {
      migrated++;
      if (DRY_RUN) {
        console.log(`  [dry-run] ${collectionName}#${doc._id}: ${Object.keys(update).join(', ')}`);
      } else {
        await collection.updateOne({ _id: doc._id }, { $set: update });
        console.log(`  ✓ ${collectionName}#${doc._id}: ${Object.keys(update).join(', ')}`);
      }
    }
  }
  return { scanned, migrated };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI manquant dans .env');
  await mongoose.connect(uri);
  console.log(`Connecté. Mode: ${DRY_RUN ? 'DRY-RUN (aucune modification)' : 'MIGRATION'}\n`);

  const targets: Array<[string, string[]]> = [
    ['users', ['photo_profil']],
    ['prestataires', ['photos_etablissement']],
    ['services', ['photos']],
    ['publications', ['photos', 'videos']],
    ['avis', ['photos']],
    ['signalements', ['preuves']],
  ];

  let totalMigrated = 0;
  for (const [name, fields] of targets) {
    console.log(`— ${name} (${fields.join(', ')})`);
    const { scanned, migrated } = await migrateCollection(name, fields);
    console.log(`  ${scanned} documents scannés, ${migrated} à convertir\n`);
    totalMigrated += migrated;
  }

  console.log(`Terminé. ${totalMigrated} documents ${DRY_RUN ? 'seraient convertis' : 'convertis'}.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Échec de la migration:', err);
  process.exit(1);
});
