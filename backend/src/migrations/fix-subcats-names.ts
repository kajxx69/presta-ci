/**
 * Migration: Force-fix subcategory names that were not updated by previous migration
 * Run: npx ts-node src/migrations/fix-subcats-names.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const col = db.collection('sous_categories');

  // Print current state first
  const current = await col.find({}).sort({ _id: 1 }).toArray();
  console.log('\n=== ÉTAT ACTUEL ===');
  current.forEach(s => console.log(`[${s._id}] cat:${s.categorie_id} "${s.nom}"`));

  // Force-update every subcategory by _id using $set
  const fixes = [
    { _id: 1,  categorie_id: 1,  nom: 'Maquillage',               description: 'Services de maquillage professionnel',                 ordre_affichage: 1 },
    { _id: 2,  categorie_id: 1,  nom: 'Épilation',                 description: "Services d'épilation",                                 ordre_affichage: 2 },
    { _id: 3,  categorie_id: 1,  nom: 'Soins du visage',           description: 'Nettoyage et soins faciaux',                           ordre_affichage: 3 },
    { _id: 4,  categorie_id: 3,  nom: 'Tresses & Nattes',          description: 'Tresses africaines, vanilles, box braids',             ordre_affichage: 1 },
    { _id: 5,  categorie_id: 3,  nom: 'Défrisage & Extensions',    description: 'Lissage, défrisage, pose de rajouts',                   ordre_affichage: 2 },
    { _id: 6,  categorie_id: 3,  nom: 'Coloration',                description: 'Coloration et mèches',                                 ordre_affichage: 3 },
    { _id: 7,  categorie_id: 3,  nom: 'Tissage & Perruques',       description: 'Pose tissage, entretien perruques',                     ordre_affichage: 4 },
    { _id: 8,  categorie_id: 4,  nom: 'Manucure',                  description: 'Soins des mains et ongles',                            ordre_affichage: 1 },
    { _id: 9,  categorie_id: 4,  nom: 'Pédicure',                  description: 'Soins des pieds et ongles',                            ordre_affichage: 2 },
    { _id: 10, categorie_id: 4,  nom: 'Nail art',                  description: "Décoration d'ongles artistique",                       ordre_affichage: 3 },
    { _id: 11, categorie_id: 6,  nom: 'Coupe & Dégradé',           description: 'Coupes masculines classiques et modernes',             ordre_affichage: 1 },
    { _id: 12, categorie_id: 6,  nom: 'Barbe & Rasage',            description: 'Taille de barbe, rasage traditionnel',                 ordre_affichage: 2 },
    { _id: 13, categorie_id: 7,  nom: 'Cartes de visite',          description: 'Conception et impression de cartes de visite',         ordre_affichage: 1 },
    { _id: 14, categorie_id: 7,  nom: 'Flyers & Affiches',         description: 'Flyers, affiches publicitaires, kakémonos',             ordre_affichage: 2 },
    { _id: 15, categorie_id: 7,  nom: 'Logo & Identité visuelle',  description: 'Création de logo, charte graphique',                   ordre_affichage: 3 },
    { _id: 16, categorie_id: 7,  nom: 'Infographie',               description: 'Retouches photo, montages, bannières réseaux sociaux', ordre_affichage: 4 },
    { _id: 17, categorie_id: 8,  nom: 'Buffet & Réception',        description: 'Organisation de buffets pour événements',              ordre_affichage: 1 },
    { _id: 18, categorie_id: 8,  nom: 'Plats cuisinés à domicile', description: 'Cuisine à domicile, repas livrés',                     ordre_affichage: 2 },
    { _id: 19, categorie_id: 8,  nom: 'Pâtisserie & Gâteaux',      description: 'Gâteaux de fête, wedding cake, viennoiseries',         ordre_affichage: 3 },
    { _id: 20, categorie_id: 9,  nom: 'Bouquets & Compositions',   description: 'Fleurs fraîches et artificielles',                     ordre_affichage: 1 },
    { _id: 21, categorie_id: 9,  nom: 'Décoration événementielle', description: 'Scénographie mariage, anniversaire, inauguration',     ordre_affichage: 2 },
    { _id: 22, categorie_id: 10, nom: 'Ménage à domicile',         description: 'Entretien régulier du domicile',                       ordre_affichage: 1 },
    { _id: 23, categorie_id: 10, nom: 'Nettoyage après travaux',   description: 'Grand nettoyage post-chantier',                        ordre_affichage: 2 },
    { _id: 24, categorie_id: 10, nom: 'Pressing & Blanchisserie',  description: 'Lavage, repassage, pressing vêtements',                ordre_affichage: 3 },
  ];

  for (const s of fixes) {
    const result = await col.updateOne(
      { _id: s._id },
      { $set: { categorie_id: s.categorie_id, nom: s.nom, description: s.description, ordre_affichage: s.ordre_affichage, is_active: true } },
      { upsert: true }
    );
    const status = result.modifiedCount > 0 ? 'updated' : result.upsertedCount > 0 ? 'inserted' : 'no change';
    console.log(`  [${s._id}] cat:${s.categorie_id} "${s.nom}" → ${status}`);
  }

  // Delete any stray entries beyond id 24
  const deleted = await col.deleteMany({ _id: { $gt: 24 } });
  if (deleted.deletedCount > 0) console.log(`🗑  Deleted ${deleted.deletedCount} stray subcategory(ies)`);

  // Print final state
  const final = await col.find({}).sort({ categorie_id: 1, _id: 1 }).toArray();
  console.log('\n=== ÉTAT FINAL ===');
  final.forEach(s => console.log(`[${s._id}] cat:${s.categorie_id} "${s.nom}"`));

  console.log('\n✅ Done');
  await mongoose.disconnect();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
