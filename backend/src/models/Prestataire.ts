import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const prestataireSchema = new mongoose.Schema({
  _id: { type: Number },
  user_id: { type: Number, required: true, unique: true, ref: 'User' },
  nom_commercial: String,
  bio: String,
  adresse: String,
  ville: String,
  pays: { type: String, default: "Côte d'Ivoire" },
  latitude: Number,
  longitude: Number,
  telephone_pro: String,
  horaires_ouverture: { type: mongoose.Schema.Types.Mixed, default: {} },
  photos_etablissement: { type: mongoose.Schema.Types.Mixed, default: [] },
  plan_actuel_id: { type: Number, default: 1, ref: 'Plan' },
  abonnement_expires_at: Date,
  note_moyenne: { type: Number, default: 0 },
  nombre_avis: { type: Number, default: 0 },
  is_verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

prestataireSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('prestataires');
  }
  this.updated_at = new Date();
});

prestataireSchema.index({ latitude: 1, longitude: 1 });
prestataireSchema.index({ ville: 1, is_verified: 1 });

export const Prestataire = mongoose.model('Prestataire', prestataireSchema);
