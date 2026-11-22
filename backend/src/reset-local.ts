// Vide entièrement la base LOCALE de test avant un nouveau seed (npm run seed:local).
// ⚠️ Refuse toute base qui n'est pas sur cette machine.
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI || '';
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/prestaci_local(\?|$)/.test(URI)) {
  console.error('❌ Refusé : reset autorisé uniquement sur mongodb://127.0.0.1:27017/prestaci_local');
  process.exit(1);
}
await mongoose.connect(URI);
await mongoose.connection.dropDatabase();
console.log('🧹 Base locale prestaci_local vidée');
await mongoose.disconnect();
