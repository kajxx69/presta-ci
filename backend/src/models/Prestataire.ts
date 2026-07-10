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
  // GeoJSON synchronisé depuis latitude/longitude — permet les requêtes $geoNear indexées
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }, // [lng, lat]
  },
  telephone_pro: String,
  horaires_ouverture: { type: mongoose.Schema.Types.Mixed, default: {} },
  photos_etablissement: { type: mongoose.Schema.Types.Mixed, default: [] },
  plan_actuel_id: { type: Number, default: 1, ref: 'Plan' },
  abonnement_expires_at: Date,
  note_moyenne: { type: Number, default: 0 },
  nombre_avis: { type: Number, default: 0 },
  is_verified: { type: Boolean, default: false },
  verification_statut: { type: String, enum: ['non_demandee', 'en_attente', 'verifie', 'rejete'], default: 'non_demandee' },
  verification_document: { type: String, default: null }, // URL /uploads du document d'identité (CNI, attestation...)
  verification_demandee_at: { type: Date, default: null },
  verification_traitee_at: { type: Date, default: null },
  verification_rejet_motif: { type: String, default: null },
  vues: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

function syncLocation(doc: any) {
  if (typeof doc.latitude === 'number' && typeof doc.longitude === 'number' &&
      Number.isFinite(doc.latitude) && Number.isFinite(doc.longitude)) {
    doc.location = { type: 'Point', coordinates: [doc.longitude, doc.latitude] };
  }
}

prestataireSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('prestataires');
  }
  syncLocation(this);
  this.updated_at = new Date();
});

// Les routes utilisent updateOne : synchroniser location là aussi
prestataireSchema.pre('updateOne', function () {
  const update: any = this.getUpdate();
  if (!update) return;
  const target = update.$set || update;
  if (typeof target.latitude === 'number' && typeof target.longitude === 'number') {
    target.location = { type: 'Point', coordinates: [target.longitude, target.latitude] };
  }
});

prestataireSchema.index({ latitude: 1, longitude: 1 });
prestataireSchema.index({ ville: 1, is_verified: 1 });
prestataireSchema.index({ location: '2dsphere' });

export const Prestataire = mongoose.model('Prestataire', prestataireSchema);
