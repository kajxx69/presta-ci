import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const avisSchema = new mongoose.Schema({
  _id: { type: Number },
  reservation_id: { type: Number, required: true, unique: true, ref: 'Reservation' },
  client_id: { type: Number, required: true, ref: 'User' },
  prestataire_id: { type: Number, required: true, ref: 'Prestataire' },
  service_id: { type: Number, ref: 'Service' },
  note: { type: Number, required: true, min: 1, max: 5 },
  commentaire: String,
  photos: { type: mongoose.Schema.Types.Mixed, default: null },
  reponse_prestataire: String,
  reponse_at: Date,
  is_visible: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

avisSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('avis');
  }
  this.updated_at = new Date();
});

avisSchema.index({ prestataire_id: 1, is_visible: 1 });
avisSchema.index({ note: 1 });

export const Avis = mongoose.model('Avis', avisSchema);
