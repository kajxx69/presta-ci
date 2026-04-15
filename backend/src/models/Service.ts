import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const serviceSchema = new mongoose.Schema({
  _id: { type: Number },
  prestataire_id: { type: Number, required: true, ref: 'Prestataire' },
  sous_categorie_id: { type: Number, required: true, ref: 'SubCategory' },
  nom: { type: String, required: true },
  description: String,
  prix: { type: Number, required: true },
  devise: { type: String, default: 'FCFA' },
  unite: { type: String, default: null },       // ex: "coiffure", "carte", "séance"
  quantite_min: { type: Number, default: 1 },   // quantité minimum par défaut
  quantite_max: { type: Number, default: null }, // null = illimitée
  duree_minutes: { type: Number, required: true },
  photos: { type: mongoose.Schema.Types.Mixed, default: null },
  is_domicile: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  note_moyenne: { type: Number, default: 0 },
  nombre_avis: { type: Number, default: 0 },
  duree: Number,
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

serviceSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('services');
  }
  this.updated_at = new Date();
});

serviceSchema.index({ prestataire_id: 1, is_active: 1 });
serviceSchema.index({ sous_categorie_id: 1 });
serviceSchema.index({ prix: 1, is_active: 1 });

export const Service = mongoose.model('Service', serviceSchema);
