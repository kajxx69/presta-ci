import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// Paiement d'abonnement en ligne via GeniusPay (Wave, Orange Money, MTN, Moov, carte…).
// Collection volontairement séparée de TransactionWave : le flux Wave manuel
// (saisie d'ID + validation admin) reste intact et indépendant.
const paiementEnLigneSchema = new mongoose.Schema({
  _id: { type: Number },
  prestataire_id: { type: Number, required: true, ref: 'Prestataire' },
  plan_id: { type: Number, required: true, ref: 'Plan' },
  fournisseur: { type: String, default: 'geniuspay' },
  reference: { type: String, required: true, unique: true }, // MTX-XXXXXXXXXX côté GeniusPay
  montant: { type: Number, required: true },
  devise: { type: String, default: 'XOF' },
  duree_abonnement_jours: { type: Number, required: true },
  // en_attente → paye (abonnement activé) | echoue | expire
  statut: { type: String, enum: ['en_attente', 'paye', 'echoue', 'expire'], default: 'en_attente' },
  checkout_url: String,
  moyen_paiement: String, // wave, orange_money… renseigné après paiement
  environnement: String,  // sandbox | live
  frais: Number,
  montant_net: Number,
  abonnement_expires_at: Date, // date de fin accordée par ce paiement
  paye_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

paiementEnLigneSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('paiements_en_ligne');
  }
  this.updated_at = new Date();
});

paiementEnLigneSchema.index({ prestataire_id: 1, created_at: -1 });
paiementEnLigneSchema.index({ statut: 1, created_at: -1 });

export const PaiementEnLigne = mongoose.model('PaiementEnLigne', paiementEnLigneSchema);
