import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// Modèle d'inspiration beauté (coiffure, ongles, maquillage…) affiché dans le
// fil « Découvrir » à swiper. Deux sources :
//  - 'prestataire' : photo d'un service réel publié par un prestataire beauté
//    (synchronisé automatiquement, mène à la réservation) — prioritaire dans le fil
//  - 'curation'    : photo importée par l'admin (Pexels, licence libre) pour
//    remplir l'app au lancement, avec crédit du photographe
export const CATEGORIES_MODELE = ['coiffure', 'ongles', 'maquillage', 'cils', 'soins'] as const;

const modeleSchema = new mongoose.Schema({
  _id: { type: Number },
  titre: { type: String, required: true },
  categorie: { type: String, enum: CATEGORIES_MODELE, required: true },
  tags: { type: [String], default: [] },
  photo_url: { type: String, required: true },
  source: { type: String, enum: ['prestataire', 'curation'], required: true },
  // Crédit / provenance (curation)
  credit_nom: String,
  credit_url: String,
  source_externe_id: String, // ex. "pexels:123456" — évite les doublons d'import
  // Lien vers la prestation réelle (source = prestataire)
  prestataire_id: { type: Number, ref: 'Prestataire', default: null },
  service_id: { type: Number, ref: 'Service', default: null },
  prix: { type: Number, default: null },
  ville: { type: String, default: null },
  // Texte normalisé (minuscules, sans accents) pour la recherche
  recherche: { type: String, default: '' },
  nombre_likes: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

modeleSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('modeles');
  }
  this.updated_at = new Date();
});

modeleSchema.index({ is_active: 1, categorie: 1, source: 1 });
modeleSchema.index({ service_id: 1 });
modeleSchema.index({ source_externe_id: 1 }, { unique: true, sparse: true });

export const Modele = mongoose.model('Modele', modeleSchema);

// --- Swipe (j'aime / je passe) ---

const modeleSwipeSchema = new mongoose.Schema({
  _id: { type: Number },
  user_id: { type: Number, required: true, ref: 'User' },
  modele_id: { type: Number, required: true, ref: 'Modele' },
  action: { type: String, enum: ['like', 'pass'], required: true },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

modeleSwipeSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('modele_swipes');
  }
});

modeleSwipeSchema.index({ user_id: 1, modele_id: 1 }, { unique: true });
modeleSwipeSchema.index({ user_id: 1, action: 1, created_at: -1 });

export const ModeleSwipe = mongoose.model('ModeleSwipe', modeleSwipeSchema);
