import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// --- Publication ---

const publicationSchema = new mongoose.Schema({
  _id: { type: Number },
  client_id: { type: Number, required: true, ref: 'User' },
  prestataire_id: { type: Number, required: true, ref: 'Prestataire' },
  service_id: { type: Number, ref: 'Service' },
  description: String,
  photos: { type: mongoose.Schema.Types.Mixed, default: [] },
  videos: { type: mongoose.Schema.Types.Mixed, default: [] },
  nombre_likes: { type: Number, default: 0 },
  is_visible: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

publicationSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('publications');
  }
  this.updated_at = new Date();
});

publicationSchema.index({ prestataire_id: 1, is_visible: 1 });
publicationSchema.index({ created_at: -1 });

export const Publication = mongoose.model('Publication', publicationSchema);

// --- Like ---

const likeSchema = new mongoose.Schema({
  _id: { type: Number },
  publication_id: { type: Number, required: true, ref: 'Publication' },
  user_id: { type: Number, required: true, ref: 'User' },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

likeSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('likes');
  }
});

likeSchema.index({ publication_id: 1, user_id: 1 }, { unique: true });

export const Like = mongoose.model('Like', likeSchema);

// --- CommentairePublication ---

const commentaireSchema = new mongoose.Schema({
  _id: { type: Number },
  publication_id: { type: Number, required: true, ref: 'Publication' },
  user_id: { type: Number, required: true, ref: 'User' },
  contenu: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

commentaireSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('commentaires_publications');
  }
});

export const CommentairePublication = mongoose.model('CommentairePublication', commentaireSchema);
