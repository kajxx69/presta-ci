import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const planSchema = new mongoose.Schema({
  _id: { type: Number },
  nom: { type: String, required: true },
  prix: { type: Number, default: 0 },
  prix_promo: Number,
  devise: { type: String, default: 'FCFA' },
  max_services: { type: Number, default: 2 },
  max_reservations_mois: { type: Number, default: 10 },
  mise_en_avant: { type: Boolean, default: false },
  description: String,
  avantages: { type: mongoose.Schema.Types.Mixed, default: [] },
  max_photos_par_service: { type: Number, default: 5 },
  features: { type: mongoose.Schema.Types.Mixed, default: [] },
  is_popular: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

planSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('plans_abonnement');
  }
  this.updated_at = new Date();
});

export const Plan = mongoose.model('Plan', planSchema);
