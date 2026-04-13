import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const transactionWaveSchema = new mongoose.Schema({
  _id: { type: Number },
  prestataire_id: { type: Number, required: true, ref: 'Prestataire' },
  plan_id: { type: Number, required: true, ref: 'Plan' },
  transaction_id_wave: { type: String, required: true },
  montant: { type: Number, required: true },
  devise: { type: String, default: 'FCFA' },
  statut: { type: String, enum: ['en_attente', 'valide', 'rejete', 'rembourse'], default: 'en_attente' },
  validee_par_admin_id: { type: Number, ref: 'User' },
  motif_rejet: String,
  date_paiement: { type: Date, required: true },
  date_validation: Date,
  duree_abonnement_jours: { type: Number, default: 30 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

transactionWaveSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('transactions_wave');
  }
  this.updated_at = new Date();
});

transactionWaveSchema.index({ prestataire_id: 1, statut: 1 });
transactionWaveSchema.index({ transaction_id_wave: 1 });

export const TransactionWave = mongoose.model('TransactionWave', transactionWaveSchema);
