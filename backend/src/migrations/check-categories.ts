import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const CatSchema = new mongoose.Schema({ _id: Number, nom: String, ordre_affichage: Number, is_active: Boolean }, { _id: false });
const SubSchema = new mongoose.Schema({ _id: Number, categorie_id: Number, nom: String, ordre_affichage: Number, is_active: Boolean }, { _id: false });
const Cat = mongoose.model('Cat', CatSchema, 'categories');
const Sub = mongoose.model('Sub', SubSchema, 'sous_categories');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation');
  const cats = await Cat.find().sort({ _id: 1 }).lean();
  console.log('=== CATEGORIES ===');
  cats.forEach((c: any) => console.log(`[${c._id}] ${c.nom} (active:${c.is_active})`));
  const subs = await Sub.find().sort({ categorie_id: 1, _id: 1 }).lean();
  console.log('\n=== SOUS-CATEGORIES (groupées par catégorie) ===');
  for (const cat of cats) {
    const children = subs.filter((s: any) => s.categorie_id === (cat as any)._id);
    if (children.length === 0) {
      console.log(`\n[cat:${(cat as any)._id}] ${(cat as any).nom} — AUCUNE sous-catégorie`);
    } else {
      console.log(`\n[cat:${(cat as any)._id}] ${(cat as any).nom}`);
      children.forEach((s: any) => console.log(`   [${s._id}] ${s.nom}`));
    }
  }
  // Orphans
  const catIds = new Set(cats.map((c: any) => c._id));
  const orphans = subs.filter((s: any) => !catIds.has(s.categorie_id));
  if (orphans.length > 0) {
    console.log('\n=== SOUS-CATEGORIES ORPHELINES (categorie_id inexistant) ===');
    orphans.forEach((s: any) => console.log(`[${s._id}] cat:${s.categorie_id} -> ${s.nom}`));
  }

  // Detect name duplicates
  console.log('\n=== DOUBLONS ===');
  const catNames: Record<string, number[]> = {};
  cats.forEach((c: any) => { catNames[c.nom] = [...(catNames[c.nom] || []), c._id]; });
  const catDups = Object.entries(catNames).filter(([, ids]) => ids.length > 1);
  catDups.forEach(([nom, ids]) => console.log(`CAT DOUBLON: "${nom}" -> ids: ${ids}`));
  const subNames: Record<string, number[]> = {};
  subs.forEach((s: any) => { subNames[s.nom] = [...(subNames[s.nom] || []), s._id]; });
  const subDups = Object.entries(subNames).filter(([, ids]) => ids.length > 1);
  subDups.forEach(([nom, ids]) => console.log(`SUBCAT DOUBLON: "${nom}" -> ids: ${ids}`));
  if (catDups.length === 0 && subDups.length === 0) console.log('Aucun doublon.');

  await mongoose.disconnect();
}
main().catch(console.error);
