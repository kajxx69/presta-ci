import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const categorySchema = new mongoose.Schema({
  _id: { type: Number },
  nom: { type: String, required: true },
  description: String,
  icone: String,
  couleur: String,
  ordre_affichage: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

categorySchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('categories');
  }
  this.updated_at = new Date();
});

export const Category = mongoose.model('Category', categorySchema);

// --- SubCategory ---

const subCategorySchema = new mongoose.Schema({
  _id: { type: Number },
  categorie_id: { type: Number, required: true, ref: 'Category' },
  nom: { type: String, required: true },
  description: String,
  icone: String,
  ordre_affichage: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

subCategorySchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('sous_categories');
  }
  this.updated_at = new Date();
});

export const SubCategory = mongoose.model('SubCategory', subCategorySchema);
