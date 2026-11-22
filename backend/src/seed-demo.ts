// Données de démonstration pour tester PrestaCI EN LOCAL (npm run seed:local).
// Crée des comptes de test et des salons beauté avec leurs services, ajoute une
// épingle Pinterest au fil « Découvrir » et y fait proposer deux salons (pour voir
// « Réserver » / « Je sais le faire »). Le reste du fil se remplit depuis l'admin
// en collant des liens Pinterest.
// ⚠️ Refuse de tourner sur une base qui n'est pas sur cette machine.
import 'dotenv/config';
import './mongoose-setup.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import { User, Prestataire, Service, SubCategory, Category, Modele } from './models/index.js';
import { bootstrapSubCategories } from './db.js';
import { categorieModelePour, texteRecherche } from './services/modeles-sync.js';
import { creerOffre } from './services/offres.js';

const URI = process.env.MONGODB_URI || '';
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(URI)) {
  console.error(`❌ Refusé : MONGODB_URI doit être une base locale (reçu : ${URI.replace(/\/\/[^@]*@/, '//***@')})`);
  process.exit(1);
}

const MOT_DE_PASSE = 'Test1234!';

const SALONS = [
  {
    nom_commercial: 'Awa Beauty Braids', ville: 'Cocody', adresse: 'Riviera 2, près du carrefour Duncan', lat: 5.3599, lng: -3.9775,
    prenom: 'Awa', nom: 'Koné', email: 'awa@demo.ci', planPayant: true,
    services: [
      { cat: 'coiffure', sous: /tresse|natte/i, nom: 'Knotless braids longues', prix: 15000, duree: 300 },
      { cat: 'coiffure', sous: /tresse|natte/i, nom: 'Nattes collées avec perles', prix: 8000, duree: 120 },
      { cat: 'coiffure', sous: /tresse|natte|lock/i, nom: 'Twists naturels', prix: 12000, duree: 240 },
    ],
  },
  {
    nom_commercial: 'Nails by Mariam', ville: 'Marcory', adresse: 'Zone 4, rue du Dr Blanchard', lat: 5.2969, lng: -3.9822,
    prenom: 'Mariam', nom: 'Traoré', email: 'mariam@demo.ci', planPayant: false,
    services: [
      { cat: 'ongles', sous: /gel|r[ée]sine|manucure|ongle/i, nom: 'Pose gel couleur', prix: 10000, duree: 90 },
      { cat: 'ongles', sous: /art|d[ée]co|ongle/i, nom: 'Nail art doré', prix: 12000, duree: 120 },
    ],
  },
  {
    nom_commercial: 'Glam Studio Plateau', ville: 'Plateau', adresse: 'Avenue Chardy', lat: 5.3236, lng: -4.0197,
    prenom: 'Fatou', nom: 'Diallo', email: 'fatou@demo.ci', planPayant: true,
    services: [
      { cat: 'maquillage', sous: /maquillage/i, nom: 'Maquillage soirée glam', prix: 15000, duree: 60 },
      { cat: 'maquillage', sous: /maquillage/i, nom: 'Maquillage mariée', prix: 40000, duree: 120 },
    ],
  },
  {
    nom_commercial: 'Lash & Brow Yop', ville: 'Yopougon', adresse: 'Selmer, face pharmacie', lat: 5.3364, lng: -4.0890,
    prenom: 'Aïcha', nom: 'Bamba', email: 'aicha@demo.ci', planPayant: false,
    services: [
      { cat: 'cils', sous: /cil|sourcil/i, nom: 'Extension de cils volume', prix: 15000, duree: 120 },
    ],
  },
];

// Épingle Pinterest de démonstration (affichée par le widget officiel) et les salons qui s'y proposent
const EPINGLE_DEMO = { id: '903112531576834018', titre: 'Tresses bohème', categorie: 'coiffure', tags: 'tresses boheme bouclees knotless' };
const OFFRES_DEMO = [
  { email: 'awa@demo.ci', prix: 18000, duree_minutes: 300 },
  { email: 'mariam@demo.ci', prix: 15000, duree_minutes: 360, is_domicile: true },
];

async function sousCategorie(cat: string, motif: RegExp): Promise<number> {
  const [cats, sous] = await Promise.all([Category.find(), SubCategory.find()]);
  const nomCat = new Map(cats.map(c => [c._id as number, c.nom]));
  const candidates = sous.filter(s => categorieModelePour(nomCat.get(s.categorie_id) || '', s.nom) === cat);
  const trouvee = candidates.find(s => motif.test(s.nom)) || candidates[0];
  if (!trouvee) throw new Error(`Aucune sous-catégorie pour ${cat}`);
  return trouvee._id as number;
}

async function compte(email: string, role_id: number, prenom: string, nom: string, extra: Record<string, any> = {}) {
  const existant = await User.findOne({ email });
  if (existant) return existant;
  return User.create({ email, password_hash: await bcrypt.hash(MOT_DE_PASSE, 10), role_id, prenom, nom, telephone: '0700000000', ...extra });
}

async function main() {
  await mongoose.connect(URI);
  console.log(`📦 Base locale : ${URI}`);

  // Même classification que la PRODUCTION (11 catégories, sous-catégories de base de db.ts).
  // Le seed.ts historique utilise une autre numérotation (30 catégories) incompatible.
  await Promise.all([Category.deleteMany({}), SubCategory.deleteMany({})]);
  await Category.insertMany([
    'Beauté & Esthétique', 'Bien-être', 'Coiffure Femme', 'Ongles', 'Massage', 'Coiffure Homme',
    'Imprimerie & Design', 'Traiteur & Restauration', 'Fleuriste & Décoration', 'Nettoyage & Ménage', 'Fitness',
  ].map((nom, i) => ({ _id: i + 1, nom, ordre_affichage: i + 1, is_active: true })));
  await mongoose.connection.db!.collection('counters').updateOne({ _id: 'categories' as any }, { $set: { seq: 11 } }, { upsert: true });
  await mongoose.connection.db!.collection('counters').updateOne({ _id: 'sous_categories' as any }, { $set: { seq: 0 } }, { upsert: true });
  await bootstrapSubCategories();
  // Sous-catégories ajoutées en production par la migration enrich-taxonomy (Sourcils & Cils, Pose de gel…)
  execSync('npx tsx src/migrations/enrich-taxonomy.ts', { env: process.env, stdio: 'ignore' });

  await compte('admin@demo.ci', 3, 'Admin', 'PrestaCI');
  await compte('cliente@demo.ci', 1, 'Mariam', 'Yao', { ville: 'Cocody' });

  for (const s of SALONS) {
    const user = await compte(s.email, 2, s.prenom, s.nom);
    let prest = await Prestataire.findOne({ user_id: user._id });
    if (!prest) {
      prest = await Prestataire.create({
        user_id: user._id as number, nom_commercial: s.nom_commercial, ville: s.ville, adresse: s.adresse,
        latitude: s.lat, longitude: s.lng, is_verified: s.planPayant, verification_statut: s.planPayant ? 'verifie' : 'non_demandee',
        note_moyenne: s.planPayant ? 4.8 : 4.3, nombre_avis: s.planPayant ? 27 : 9,
        // Un plan payant qui expire dans 2 jours : permet de voir la relance d'abonnement
        ...(s.planPayant ? { plan_actuel_id: 2, abonnement_expires_at: new Date(Date.now() + 2 * 86400000) } : {}),
      });
    }
    for (const svc of s.services) {
      if (await Service.exists({ prestataire_id: prest._id, nom: svc.nom })) continue;
      await Service.create({
        prestataire_id: prest._id as number, sous_categorie_id: await sousCategorie(svc.cat, svc.sous),
        nom: svc.nom, description: `${svc.nom} réalisé par ${s.nom_commercial}.`, prix: svc.prix, duree_minutes: svc.duree,
        photos: null, is_active: true,
      });
    }
    console.log(`  💇🏾‍♀️ ${s.nom_commercial} (${s.ville}) — ${s.services.length} services`);
  }

  const pinUrl = `https://www.pinterest.com/pin/${EPINGLE_DEMO.id}/`;
  let epingle = await Modele.findOne({ source_externe_id: `pinterest:${EPINGLE_DEMO.id}` });
  if (!epingle) {
    epingle = await Modele.create({
      titre: EPINGLE_DEMO.titre, categorie: EPINGLE_DEMO.categorie, tags: EPINGLE_DEMO.tags.split(' '), photo_url: '', pin_url: pinUrl,
      source: 'pinterest', credit_nom: 'Pinterest', credit_url: pinUrl, source_externe_id: `pinterest:${EPINGLE_DEMO.id}`,
      recherche: texteRecherche([EPINGLE_DEMO.titre, EPINGLE_DEMO.tags, EPINGLE_DEMO.categorie]),
    });
  }
  for (const o of OFFRES_DEMO) {
    const u = await User.findOne({ email: o.email });
    if (u) await creerOffre(u._id as number, epingle._id as number, o);
  }
  console.log(`  📌 Épingle « ${EPINGLE_DEMO.titre} » + ${OFFRES_DEMO.length} salons qui la proposent`);

  console.log("✨ Ajoute d'autres photos depuis l'admin → Modèles (Découvrir) → colle un lien Pinterest");
  console.log(`\n🔑 Comptes de test (mot de passe : ${MOT_DE_PASSE})`);
  console.log('   Cliente      : cliente@demo.ci');
  console.log('   Prestataire  : awa@demo.ci  (aussi mariam@, fatou@, aicha@demo.ci)');
  console.log('   Admin        : admin@demo.ci');
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('❌', e);
  await mongoose.disconnect();
  process.exit(1);
});
