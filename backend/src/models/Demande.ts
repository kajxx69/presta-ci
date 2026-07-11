import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

/**
 * Demande express (marché inversé) : le client décrit son besoin,
 * les prestataires de la catégorie sont notifiés et viennent à lui.
 * Les réponses sont embarquées (bornées à MAX_REPONSES côté route) :
 * elles servent uniquement à l'affichage "X prestataires ont répondu"
 * et au lien vers la conversation — l'échange réel se fait dans le chat.
 */
const demandeSchema = new mongoose.Schema({
  _id: { type: Number },
  client_id: { type: Number, required: true, ref: 'User' },
  titre: { type: String, required: true, maxlength: 120 },
  description: { type: String, required: true, maxlength: 2000 },
  categorie_id: { type: Number, required: true, ref: 'Category' },
  sous_categorie_id: { type: Number, default: null, ref: 'SubCategory' },
  ville: { type: String, default: null },
  budget_max: { type: Number, default: null },
  date_souhaitee: { type: String, default: null }, // YYYY-MM-DD, indicatif
  statut: { type: String, enum: ['ouverte', 'pourvue', 'annulee'], default: 'ouverte' },
  expires_at: { type: Date, required: true },
  reponses: [{
    prestataire_id: { type: Number, required: true },
    conversation_id: { type: Number, required: true },
    message: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
  }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

demandeSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('demandes');
  }
  this.updated_at = new Date();
});

demandeSchema.index({ client_id: 1, statut: 1 });
demandeSchema.index({ statut: 1, categorie_id: 1, expires_at: 1 });

export const Demande = mongoose.model('Demande', demandeSchema);
