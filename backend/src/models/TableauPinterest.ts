import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// Tableau Pinterest du compte PrestaCI affiché dans l'app via le widget OFFICIEL
// Pinterest (embedBoard) : les photos restent servies par Pinterest, avec ses
// crédits et liens. Aucune copie, aucun scraping.
const tableauPinterestSchema = new mongoose.Schema({
  _id: { type: Number },
  titre: { type: String, required: true, maxlength: 80 },
  categorie: { type: String, enum: ['coiffure', 'ongles', 'maquillage', 'cils', 'soins'], required: true },
  url: { type: String, required: true, unique: true },
  ordre: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
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
