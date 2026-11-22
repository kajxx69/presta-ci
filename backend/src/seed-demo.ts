// Données de démonstration pour tester PrestaCI EN LOCAL (npm run seed:local).
// Crée des comptes de test, des salons beauté avec services et photos, puis
// génère les modèles du fil « Découvrir ».
// ⚠️ Refuse de tourner sur une base qui n'est pas sur cette machine.
import 'dotenv/config';
import './mongoose-setup.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Prestataire, Service, SubCategory, Category, Modele } from './models/index.js';
import { categorieModelePour, syncTousLesModeles, texteRecherche } from './services/modeles-sync.js';
import { isPexelsConfigured, rechercherPexels } from './utils/pexels.js';
import { importerPexels, PACK_LANCEMENT } from './services/modeles-import.js';

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
      { cat: 'coiffure', sous: /tresse|natte/i, nom: 'Knotless braids longues', prix: 15000, duree: 300, pexels: 'knotless braids' },
      { cat: 'coiffure', sous: /tresse|natte/i, nom: 'Nattes collées avec perles', prix: 8000, duree: 120, pexels: 'cornrows braids' },
      { cat: 'coiffure', sous: /tresse|natte|lock/i, nom: 'Twists naturels', prix: 12000, duree: 240, pexels: 'twists natural hair' },
    ],
  },
  {
    nom_commercial: 'Nails by Mariam', ville: 'Marcory', adresse: 'Zone 4, rue du Dr Blanchard', lat: 5.2969, lng: -3.9822,
    prenom: 'Mariam', nom: 'Traoré', email: 'mariam@demo.ci', planPayant: false,
    services: [
      { cat: 'ongles', sous: /gel|r[ée]sine|manucure|ongle/i, nom: 'Pose gel couleur', prix: 10000, duree: 90, pexels: 'gel nails manicure' },
      { cat: 'ongles', sous: /art|d[ée]co|ongle/i, nom: 'Nail art doré', prix: 12000, duree: 120, pexels: 'nail art' },
    ],
  },
  {
    nom_commercial: 'Glam Studio Plateau', ville: 'Plateau', adresse: 'Avenue Chardy', lat: 5.3236, lng: -4.0197,
    prenom: 'Fatou', nom: 'Diallo', email: 'fatou@demo.ci', planPayant: true,
    services: [
      { cat: 'maquillage', sous: /maquillage/i, nom: 'Maquillage soirée glam', prix: 15000, duree: 60, pexels: 'glam makeup black woman' },
      { cat: 'maquillage', sous: /maquillage/i, nom: 'Maquillage mariée', prix: 40000, duree: 120, pexels: 'bridal makeup african' },
    ],
  },
  {
    nom_commercial: 'Lash & Brow Yop', ville: 'Yopougon', adresse: 'Selmer, face pharmacie', lat: 5.3364, lng: -4.0890,
    prenom: 'Aïcha', nom: 'Bamba', email: 'aicha@demo.ci', planPayant: false,
    services: [
      { cat: 'cils', sous: /cil|sourcil/i, nom: 'Extension de cils volume', prix: 15000, duree: 120, pexels: 'eyelash extensions' },
    ],
  },
];

// Inspiration supplémentaire (comme un import admin Pexels)
const INSPIRATION = [
  { q: 'box braids', categorie: 'coiffure', tags: 'box braids tresses' },
  { q: 'locs hairstyle', categorie: 'coiffure', tags: 'locks dreadlocks' },
  { q: 'afro hairstyle woman', categorie: 'coiffure', tags: 'afro naturel' },
  { q: 'french manicure', categorie: 'ongles', tags: 'french manucure' },
  { q: 'skincare black woman', categorie: 'soins', tags: 'soin visage peau' },
];

let compteurPlaceholder = 1;
async function photos(requete: string, n: number): Promise<{ url: string; titre?: string; credit_nom?: string; credit_url?: string; id?: string }[]> {
  if (isPexelsConfigured()) {
    try {
      const res = await rechercherPexels(requete, n);
      if (res.length) return res.map(p => ({ url: p.photo_url, titre: p.titre, credit_nom: p.credit_nom, credit_url: p.credit_url, id: p.id_externe }));
    } catch (e: any) {
      console.warn(`  ⚠️ Pexels « ${requete} » : ${e.message} — photos de remplissage utilisées`);
    }
  }
  return Array.from({ length: n }, () => ({ url: `https://picsum.photos/seed/prestaci${compteurPlaceholder++}/800/1200` }));
}

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
  console.log(isPexelsConfigured() ? '📷 Photos réelles via Pexels' : '📷 PEXELS_API_KEY absente → photos de remplissage (ajoute la clé dans .env pour de vraies photos)');

  await compte('admin@demo.ci', 3, 'Admin', 'PrestaCI');
  await compte('cliente@demo.ci', 1, 'Mariam', 'Yao', { ville: 'Cocody' });

  for (const s of SALONS) {
    const user = await compte(s.email, 2, s.prenom, s.nom, { photo_profil: (await photos(s.services[0].pexels, 1))[0].url });
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
      const imgs = await photos(svc.pexels, 3);
      if (!prest.photos_etablissement || !(prest.photos_etablissement as any[]).length) {
        await Prestataire.updateOne({ _id: prest._id }, { photos_etablissement: [imgs[0].url] });
        prest.photos_etablissement = [imgs[0].url];
      }
      await Service.create({
        prestataire_id: prest._id as number, sous_categorie_id: await sousCategorie(svc.cat, svc.sous),
        nom: svc.nom, description: `${svc.nom} réalisé par ${s.nom_commercial}.`, prix: svc.prix, duree_minutes: svc.duree,
        photos: imgs.map(i => i.url), is_active: true,
      });
    }
    console.log(`  💇🏾‍♀️ ${s.nom_commercial} (${s.ville}) — ${s.services.length} services`);
  }

  if (isPexelsConfigured()) {
    // Même contenu que le bouton « Pack de lancement » de l'admin
    for (const d of PACK_LANCEMENT) {
      try { await importerPexels({ ...d, nombre: 12 }); } catch (e: any) { console.warn(`  ⚠️ ${d.titre} : ${e.message}`); }
    }
  } else {
    for (const insp of INSPIRATION) {
      for (const p of await photos(insp.q, 8)) {
        const idExterne = `demo:${p.url}`;
        if (await Modele.exists({ source_externe_id: idExterne })) continue;
        await Modele.create({
          titre: insp.q, categorie: insp.categorie, tags: insp.tags.split(' '), photo_url: p.url, source: 'curation',
          credit_nom: 'Photo de démonstration', source_externe_id: idExterne,
          recherche: texteRecherche([insp.q, insp.tags, insp.categorie]),
        });
      }
    }
  }

  await syncTousLesModeles();
  const parSource = await Modele.aggregate([{ $match: { is_active: true } }, { $group: { _id: '$source', n: { $sum: 1 } } }]);
  console.log(`✨ Modèles dans le fil : ${parSource.map(p => `${p.n} ${p._id === 'prestataire' ? 'réservables' : "d'inspiration"}`).join(' + ')}`);
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
