import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// Tableau Pinterest public suivi par PrestaCI : ses épingles sont ajoutées
// automatiquement au fil (services/pinterest-sync.ts) et affichées via le widget
// OFFICIEL Pinterest (embedPin). Aucune image copiée.
const tableauPinterestSchema = new mongoose.Schema({
  _id: { type: Number },
  titre: { type: String, required: true, maxlength: 80 },
  categorie: { type: String, enum: ['coiffure', 'ongles', 'maquillage', 'cils', 'soins'], required: true },
  url: { type: String, required: true, unique: true },
  ordre: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  // Synchronisation automatique des épingles du tableau vers le fil « Découvrir »
  derniere_synchro: { type: Date, default: null },
  nb_importees: { type: Number, default: 0 },
  derniere_erreur: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

tableauPinterestSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('tableaux_pinterest');
  }
});

export const TableauPinterest = mongoose.model('TableauPinterest', tableauPinterestSchema);
