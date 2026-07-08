/**
 * Migration: enrichit et fiabilise la taxonomie catégories/sous-catégories.
 *
 * - Migre les icônes de catégorie vers de vrais emojis (au lieu de clés "xxx.svg"
 *   mappées uniquement côté HomeTab — incohérent avec AdminCategories qui affichait
 *   la clé brute). Chaque catégorie reçoit un emoji unique (plus de doublons).
 * - Ajoute des sous-catégories manquantes et pertinentes pour chaque catégorie,
 *   avec booking_type explicite ('appointment' par défaut, 'order' pour les articles).
 * - Nettoie les champs legacy (__v) et garantit created_at/updated_at partout.
 *
 * Idempotent : peut être relancée sans dupliquer (upsert par nom+categorie_id).
 *
 * Run: npx tsx src/migrations/enrich-taxonomy.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation';

// Emoji unique par catégorie (remplace les anciennes clés "xxx.svg")
const CATEGORY_ICONS: Record<string, string> = {
  'Beauté & Esthétique': '💄',
  'Bien-être': '🌿',
  'Coiffure Femme': '💇‍♀️',
  'Ongles': '💅',
  'Massage': '💆',
  'Coiffure Homme': '💇‍♂️',
  'Imprimerie & Design': '🖨️',
  'Traiteur & Restauration': '🍽️',
  'Fleuriste & Décoration': '💐',
  'Nettoyage & Ménage': '🧹',
  'Fitness': '💪',
};

// Sous-catégories additionnelles à créer si absentes (identifiées par nom+categorie)
interface SubDef {
  categorie_nom: string;
  nom: string;
  description: string;
  ordre_affichage: number;
  booking_type?: 'appointment' | 'order';
}

const NEW_SUBCATEGORIES: SubDef[] = [
  // Beauté & Esthétique
  { categorie_nom: 'Beauté & Esthétique', nom: 'Sourcils & Cils', description: 'Rehaussement de cils, restructuration et teinture de sourcils', ordre_affichage: 4 },
  { categorie_nom: 'Beauté & Esthétique', nom: 'Maquillage permanent', description: 'Microblading, lèvres et eyeliner semi-permanents', ordre_affichage: 5 },

  // Bien-être
  { categorie_nom: 'Bien-être', nom: 'Spa & Hammam', description: "Rituels bien-être, hammam traditionnel, bains relaxants", ordre_affichage: 4 },

  // Coiffure Femme
  { categorie_nom: 'Coiffure Femme', nom: 'Soins capillaires', description: 'Soins profonds, protéinés, hydratation intensive', ordre_affichage: 6 },

  // Ongles
  { categorie_nom: 'Ongles', nom: 'Pose de gel & résine', description: 'Extensions et renforcement en gel ou résine', ordre_affichage: 4 },

  // Massage — inchangé

  // Coiffure Homme
  { categorie_nom: 'Coiffure Homme', nom: 'Soins du visage homme', description: 'Nettoyage de peau, gommage, hydratation pour hommes', ordre_affichage: 3 },
  { categorie_nom: 'Coiffure Homme', nom: 'Tresses & Locks homme', description: 'Tresses, vanilles et dreadlocks pour hommes', ordre_affichage: 4 },

  // Imprimerie & Design — articles
  { categorie_nom: 'Imprimerie & Design', nom: 'Textile & Objets personnalisés', description: 'T-shirts, casquettes, mugs et goodies personnalisés', ordre_affichage: 5, booking_type: 'order' },
  { categorie_nom: 'Imprimerie & Design', nom: 'Bâches & Enseignes', description: 'Bâches publicitaires, enseignes et supports rigides', ordre_affichage: 6, booking_type: 'order' },

  // Traiteur & Restauration
  { categorie_nom: 'Traiteur & Restauration', nom: 'Jus & Cocktails sans alcool', description: 'Jus naturels, cocktails et bar à boissons pour événements', ordre_affichage: 4, booking_type: 'order' },

  // Fleuriste & Décoration
  { categorie_nom: 'Fleuriste & Décoration', nom: 'Ballons & Arches', description: 'Arches de ballons, décoration de salle par ballons', ordre_affichage: 3, booking_type: 'order' },

  // Nettoyage & Ménage
  { categorie_nom: 'Nettoyage & Ménage', nom: 'Nettoyage de canapés & tapis', description: 'Shampouinage et détachage de canapés, tapis, moquettes', ordre_affichage: 4 },
  { categorie_nom: 'Nettoyage & Ménage', nom: 'Désinsectisation & Désinfection', description: 'Traitement anti-nuisibles et désinfection des locaux', ordre_affichage: 5 },

  // Fitness
  { categorie_nom: 'Fitness', nom: 'Préparation physique sportive', description: 'Entraînement spécifique pour compétitions et performance', ordre_affichage: 4 },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const catsCol = db.collection('categories');
  const subsCol = db.collection('subcategories');
  const countersCol = db.collection('counters');

  // 1. Migrer les icônes vers des emojis uniques + nettoyer les champs legacy
  console.log('\n=== 1. Icônes de catégories ===');
  const categories = await catsCol.find({}).toArray();
  for (const cat of categories) {
    const emoji = CATEGORY_ICONS[cat.nom];
    if (!emoji) {
      console.warn(`⚠️  Pas d'emoji défini pour "${cat.nom}", ignoré`);
      continue;
    }
    const update: any = { icone: emoji, updated_at: new Date() };
    if (!cat.created_at) update.created_at = new Date();
    const unset: any = {};
    if ('__v' in cat) unset.__v = '';

    const op: any = { $set: update };
    if (Object.keys(unset).length > 0) op.$unset = unset;

    await catsCol.updateOne({ _id: cat._id }, op);
    console.log(`  [${cat._id}] "${cat.nom}" icone: "${cat.icone}" → "${emoji}"`);
  }

  // Vérifier l'unicité finale des emojis
  const afterCats = await catsCol.find({}).toArray();
  const emojiCount = new Map<string, number>();
  afterCats.forEach(c => emojiCount.set(c.icone, (emojiCount.get(c.icone) || 0) + 1));
  const dups = [...emojiCount.entries()].filter(([, n]) => n > 1);
  if (dups.length > 0) {
    console.error('❌ Doublons d\'icône restants:', dups);
  } else {
    console.log('✅ Toutes les icônes de catégorie sont uniques');
  }

  // 2. Ajouter les sous-catégories manquantes
  console.log('\n=== 2. Nouvelles sous-catégories ===');
  const catByName = new Map(afterCats.map(c => [c.nom, c._id as number]));
  let created = 0, skipped = 0;

  for (const def of NEW_SUBCATEGORIES) {
    const categorie_id = catByName.get(def.categorie_nom);
    if (!categorie_id) {
      console.warn(`⚠️  Catégorie "${def.categorie_nom}" introuvable, sous-catégorie "${def.nom}" ignorée`);
      continue;
    }
    const existing = await subsCol.findOne({ categorie_id, nom: def.nom });
    if (existing) {
      console.log(`  ↷ "${def.nom}" existe déjà (cat ${categorie_id}), ignoré`);
      skipped++;
      continue;
    }

    // Incrémenter le compteur partagé avec le reste de l'app (getNextId('sous_categories'))
    const counter = await countersCol.findOneAndUpdate(
      { _id: 'sous_categories' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const newId = counter?.seq ?? counter?.value?.seq;
    if (!newId) {
      console.error(`❌ Impossible d'obtenir un nouvel ID pour "${def.nom}"`);
      continue;
    }

    await subsCol.insertOne({
      _id: newId,
      categorie_id,
      nom: def.nom,
      description: def.description,
      ordre_affichage: def.ordre_affichage,
      is_active: true,
      booking_type: def.booking_type || 'appointment',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`  ✚ [${newId}] "${def.nom}" (cat ${categorie_id}, booking_type=${def.booking_type || 'appointment'})`);
    created++;
  }

  console.log(`\n${created} créée(s), ${skipped} déjà existante(s)`);

  // 3. Vérification finale de cohérence
  console.log('\n=== 3. Vérification finale ===');
  const allSubs = await subsCol.find({}).toArray();
  const missingBookingType = allSubs.filter(s => !s.booking_type);
  console.log(`Sous-catégories sans booking_type explicite (défaut 'appointment' implicite): ${missingBookingType.length}`);
  const catIds = new Set(afterCats.map(c => c._id));
  const orphanSubs = allSubs.filter(s => !catIds.has(s.categorie_id));
  if (orphanSubs.length > 0) {
    console.error('❌ Sous-catégories orphelines (categorie_id inexistant):', orphanSubs.map(s => `${s._id}:${s.nom}`));
  } else {
    console.log('✅ Toutes les sous-catégories référencent une catégorie existante');
  }

  console.log('\n✅ Done');
  await mongoose.disconnect();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
