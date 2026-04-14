import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const signalementSchema = new mongoose.Schema({
  _id: { type: Number },
  // Qui signale
  signaleur_id: { type: Number, required: true, ref: 'User' },
  // Ce qui est signalé (prestataire, service, publication, ou utilisateur)
  type_cible: { type: String, required: true, enum: ['prestataire', 'service', 'publication', 'utilisateur'] },
  cible_id: { type: Number, required: true },
  // Motif
  motif: { type: String, required: true, enum: [
    'arnaque',
    'comportement_inapproprie',
    'contenu_offensant',
    'service_non_conforme',
    'harcèlement',
    'faux_profil',
    'spam',
    'autre'
  ]},
  description: { type: String, required: true },
  // Preuves (photos, captures d'écran)
  preuves: { type: mongoose.Schema.Types.Mixed, default: [] },
  // Statut du signalement
  statut: { type: String, default: 'en_attente', enum: ['en_attente', 'en_cours', 'resolu', 'rejete'] },
  // Résolution par l'admin
  admin_id: { type: Number, ref: 'User', default: null },
  resolution_note: { type: String, default: null },
  action_prise: { type: String, default: null, enum: [
    null,
    'avertissement',
    'suspension_temporaire',
    'suspension_definitive',
    'suppression_contenu',
    'aucune_action'
  ]},
  resolved_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

signalementSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('signalements');
  }
  this.updated_at = new Date();
});

signalementSchema.index({ statut: 1, created_at: -1 });
signalementSchema.index({ type_cible: 1, cible_id: 1 });
signalementSchema.index({ signaleur_id: 1 });

export const Signalement = mongoose.model('Signalement', signalementSchema);
