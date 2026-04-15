import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// Note donnée par le prestataire au client après une prestation terminée
const avisClientSchema = new mongoose.Schema({
  _id: { type: Number },
  reservation_id: { type: Number, required: true, unique: true, ref: 'Reservation' },
  client_id: { type: Number, required: true, ref: 'User' },
  prestataire_id: { type: Number, required: true, ref: 'Prestataire' },
  note: { type: Number, required: true, min: 1, max: 5 },
  commentaire: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

avisClientSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('avis_clients');
  }
  this.updated_at = new Date();
});

avisClientSchema.index({ client_id: 1 });
avisClientSchema.index({ prestataire_id: 1 });

export const AvisClient = mongoose.model('AvisClient', avisClientSchema);
