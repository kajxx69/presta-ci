import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// --- FavorisPrestataire ---

const favorisPrestatairesSchema = new mongoose.Schema({
  _id: { type: Number },
  client_id: { type: Number, required: true, ref: 'User' },
  prestataire_id: { type: Number, required: true, ref: 'Prestataire' },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

favorisPrestatairesSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('favoris_prestataires');
  }
});

favorisPrestatairesSchema.index({ client_id: 1, prestataire_id: 1 }, { unique: true });

export const FavorisPrestataire = mongoose.model('FavorisPrestataire', favorisPrestatairesSchema);

// --- FavorisService ---

const favorisServicesSchema = new mongoose.Schema({
  _id: { type: Number },
  client_id: { type: Number, required: true, ref: 'User' },
  service_id: { type: Number, required: true, ref: 'Service' },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

favorisServicesSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('favoris_services');
  }
});

favorisServicesSchema.index({ client_id: 1, service_id: 1 }, { unique: true });

export const FavorisService = mongoose.model('FavorisService', favorisServicesSchema);

// --- FavorisPublication ---

const favorisPublicationsSchema = new mongoose.Schema({
  _id: { type: Number },
  client_id: { type: Number, required: true, ref: 'User' },
  publication_id: { type: Number, required: true, ref: 'Publication' },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

favorisPublicationsSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('favoris_publications');
  }
});

favorisPublicationsSchema.index({ client_id: 1, publication_id: 1 }, { unique: true });

export const FavorisPublication = mongoose.model('FavorisPublication', favorisPublicationsSchema);
