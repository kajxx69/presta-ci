import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
  _id: Number, nom: String, sous_categorie_id: Number, is_active: Boolean
}, { _id: false });
const Service = mongoose.model('Service', ServiceSchema, 'services');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation');
  const services = await Service.find().sort({ sous_categorie_id: 1 }).lean();
  console.log('=== SERVICES (id, sous_cat_id, nom) ===');
  services.forEach((s: any) => console.log(`[${s._id}] sous_cat:${s.sous_categorie_id} -> "${s.nom}"`));
  await mongoose.disconnect();
}
main().catch(console.error);
